import safeWorker from "./safe-backup-worker.js";

const BACKUP_HISTORY_LIMIT = 20;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname === "/v1/backup/history" && request.method === "GET") {
            const user = await authenticatedUser(request, env, ctx);
            if (!user) return safeWorker.fetch(request, env, ctx);

            const rows = await env.DB.prepare(`
                SELECT version, payload, byte_size, client_exported_at, created_at
                FROM backup_history
                WHERE user_id = ?
                ORDER BY version DESC
                LIMIT ?
            `).bind(user.id, BACKUP_HISTORY_LIMIT).all();

            const backups = (rows.results || []).map(row => historyEntry(row));
            const recommendedVersion = recommendVersion(backups);
            const enriched = backups.map(entry => ({
                ...entry,
                recommended: Number(entry.version) === Number(recommendedVersion)
            }));

            return jsonResponse({
                backups: enriched,
                recommendedVersion,
                recommendationBasis: recommendedVersion
                    ? "Newest saved version that retains the user's established Level Up history."
                    : "No saved version could be recommended automatically."
            }, 200, request, env);
        }

        if (url.pathname === "/v1/admin/analytics" && request.method === "GET") {
            const response = await safeWorker.fetch(request, env, ctx);
            if (!response.ok) return response;
            try {
                const payload = await response.clone().json();
                const weights = await env.DB.prepare(`
                    SELECT COUNT(*) AS weight_log_users
                    FROM backups
                    WHERE json_valid(payload)
                      AND COALESCE(json_array_length(json_extract(payload, '$.data.forge_weight_entries')), 0) > 0
                `).first();
                payload.totals = {
                    ...(payload.totals || {}),
                    weight_log_users: Number(weights?.weight_log_users || 0)
                };
                return jsonResponse(payload, response.status, request, env);
            }
            catch (error) {
                console.error(JSON.stringify({ event: "admin_weight_logger_count_failed", reason: String(error?.message || error) }));
                return response;
            }
        }

        return safeWorker.fetch(request, env, ctx);
    }
};

async function authenticatedUser(request, env, ctx) {
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.delete("content-type");
    const authRequest = new Request(new URL("/v1/me", request.url), {
        method: "GET",
        headers
    });
    const response = await safeWorker.fetch(authRequest, env, ctx);
    if (!response.ok) return null;
    try { return (await response.json())?.user || null; }
    catch { return null; }
}

function historyEntry(row) {
    let backup = null;
    try { backup = JSON.parse(row.payload); } catch {}
    const summary = backupSummary(backup);
    return {
        version: Number(row.version),
        byte_size: Number(row.byte_size) || 0,
        client_exported_at: row.client_exported_at || null,
        created_at: row.created_at,
        summary,
        health: "unknown",
        healthReasons: []
    };
}

function recommendVersion(entries) {
    if (!entries.length) return null;

    const maxima = entries.reduce((result, entry) => {
        const summary = entry.summary || {};
        Object.keys(result).forEach(key => {
            result[key] = Math.max(result[key], Number(summary[key]) || 0);
        });
        return result;
    }, {
        savedSections: 0,
        completedWorkouts: 0,
        weighIns: 0,
        workoutPlans: 0,
        foodLogDays: 0,
        measurements: 0,
        sleepEntries: 0,
        nutritionPhases: 0,
        majorHistory: 0
    });

    for (const entry of entries) {
        const assessment = assessHealth(entry.summary, maxima);
        entry.health = assessment.healthy ? "healthy" : "reduced";
        entry.healthReasons = assessment.reasons;
    }

    const healthy = entries.find(entry => entry.health === "healthy");
    return healthy?.version ?? entries[0]?.version ?? null;
}

function assessHealth(summary, maxima) {
    const reasons = [];
    const categoryDrops = [];

    compare(categoryDrops, "completed workouts", maxima.completedWorkouts, summary.completedWorkouts, 3, 0.70);
    compare(categoryDrops, "weigh-ins", maxima.weighIns, summary.weighIns, 5, 0.70);
    compare(categoryDrops, "food-log days", maxima.foodLogDays, summary.foodLogDays, 5, 0.70);
    compare(categoryDrops, "measurements", maxima.measurements, summary.measurements, 3, 0.70);
    compare(categoryDrops, "sleep entries", maxima.sleepEntries, summary.sleepEntries, 5, 0.70);

    if (maxima.workoutPlans >= 1 && summary.workoutPlans === 0) {
        categoryDrops.push("workout plans dropped to zero");
    }

    const severeHistoryCollapse = maxima.majorHistory >= 10 &&
        summary.majorHistory <= Math.max(2, Math.floor(maxima.majorHistory * 0.25));
    if (severeHistoryCollapse) reasons.push("major history is 25% or less of the strongest saved version");

    const sectionCollapse = maxima.savedSections >= 20 &&
        summary.savedSections < Math.ceil(maxima.savedSections * 0.65);
    if (sectionCollapse) reasons.push("saved app sections are more than 35% below the strongest saved version");

    reasons.push(...categoryDrops);

    const healthy = !severeHistoryCollapse &&
        categoryDrops.length < 2 &&
        !(categoryDrops.length >= 1 && sectionCollapse);

    return { healthy, reasons };
}

function compare(reasons, label, maximum, current, minimumMaximum, retainedFraction) {
    if (Number(maximum) < minimumMaximum) return;
    if (Number(current) < Math.ceil(Number(maximum) * retainedFraction)) {
        reasons.push(`${label} are substantially below another saved version`);
    }
}

function backupSummary(backup) {
    const data = backup?.data && typeof backup.data === "object" ? backup.data : {};
    const summary = {
        savedSections: Object.keys(data).filter(key => ![
            "level_up_cloud_session",
            "level_up_cloud_auto_backup_state"
        ].includes(key)).length,
        completedWorkouts: arrayLength(data.forge_workout_sessions),
        weighIns: arrayLength(data.forge_weight_entries),
        workoutPlans: arrayLength(data.forge_workout_plans),
        foodLogDays: countFoodLogDays(data.level_up_food_log_v1),
        measurements: arrayLength(data.level_up_body_measurements),
        sleepEntries: arrayLength(data.level_up_sleep_entries),
        nutritionPhases: arrayLength(data.level_up_nutrition_phases)
    };
    summary.majorHistory = summary.completedWorkouts +
        summary.weighIns +
        summary.foodLogDays +
        summary.measurements +
        summary.sleepEntries;
    return summary;
}

function arrayLength(value) {
    return Array.isArray(value) ? value.length : 0;
}

function countFoodLogDays(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
    return Object.values(value).filter(day => hasLoggedFood(day)).length;
}

function hasLoggedFood(day) {
    if (Array.isArray(day)) return day.length > 0;
    if (!day || typeof day !== "object") return false;
    return Object.values(day).some(value => {
        if (Array.isArray(value)) return value.length > 0;
        if (value && typeof value === "object") return Object.keys(value).length > 0;
        return Boolean(value);
    });
}

function jsonResponse(payload, status, request, env) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "Origin"
    });
    const origin = request.headers.get("Origin");
    const allowed = new Set(String(env.ALLOWED_ORIGINS || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean));
    if (origin && allowed.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
    return new Response(JSON.stringify(payload), { status, headers });
}
