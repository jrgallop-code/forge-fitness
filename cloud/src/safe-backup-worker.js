import baseWorker from "./index.js";

const BACKUP_HISTORY_LIMIT = 20;
const SAFETY_CODE = "backup_safety_block";
const EXCLUDED_STORAGE_KEYS = new Set([
    "level_up_cloud_session",
    "level_up_cloud_auto_backup_state"
]);

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return baseWorker.fetch(request, env, ctx);
        }

        if (url.pathname === "/v1/backup/history" && request.method === "GET") {
            const user = await authenticatedUser(request, env, ctx);
            if (!user) return baseWorker.fetch(request, env, ctx);
            const rows = await env.DB.prepare(`
                SELECT version, byte_size, client_exported_at, created_at
                FROM backup_history
                WHERE user_id = ?
                ORDER BY version DESC
                LIMIT ?
            `).bind(user.id, BACKUP_HISTORY_LIMIT).all();
            return jsonResponse({ backups: rows.results || [] }, 200, request, env);
        }

        const historyMatch = url.pathname.match(/^\/v1\/backup\/history\/(\d+)$/);
        if (historyMatch && request.method === "GET") {
            const user = await authenticatedUser(request, env, ctx);
            if (!user) return baseWorker.fetch(request, env, ctx);
            const row = await env.DB.prepare(`
                SELECT version, payload, byte_size, client_exported_at, created_at
                FROM backup_history
                WHERE user_id = ? AND version = ?
            `).bind(user.id, Number(historyMatch[1])).first();
            if (!row) return jsonResponse({ error: "Backup version not found." }, 404, request, env);
            let backup = null;
            try { backup = JSON.parse(row.payload); }
            catch { return jsonResponse({ error: "Stored backup could not be read." }, 500, request, env); }
            return jsonResponse({
                backup,
                version: Number(row.version),
                byteSize: Number(row.byte_size),
                clientExportedAt: row.client_exported_at || null,
                createdAt: row.created_at
            }, 200, request, env);
        }

        if (url.pathname !== "/v1/backup" || request.method !== "PUT") {
            return baseWorker.fetch(request, env, ctx);
        }

        let body;
        try { body = await request.clone().json(); }
        catch { return baseWorker.fetch(request, env, ctx); }

        const backup = body?.backup;
        if (!isBackupShape(backup)) return baseWorker.fetch(request, env, ctx);

        const user = await authenticatedUser(request, env, ctx);
        if (!user) return baseWorker.fetch(request, env, ctx);

        const current = await env.DB.prepare(`
            SELECT version, payload, byte_size, client_exported_at, created_at, updated_at
            FROM backups
            WHERE user_id = ?
        `).bind(user.id).first();

        if (current?.payload) {
            await archiveBackupRow(user.id, current, env);

            let currentBackup = null;
            try { currentBackup = JSON.parse(current.payload); }
            catch {}

            if (currentBackup && isBackupShape(currentBackup)) {
                const incomingPayload = JSON.stringify(backup);
                const incomingByteSize = new TextEncoder().encode(incomingPayload).byteLength;
                const safety = assessDataReduction(
                    currentBackup,
                    backup,
                    Number(current.byte_size) || 0,
                    incomingByteSize
                );
                const explicitManualOverride = body?.uploadMode === "manual" && body?.allowDataReduction === true;

                if (safety.blocked && !explicitManualOverride) {
                    console.warn(JSON.stringify({
                        event: "backup_safety_block",
                        userId: user.id,
                        currentVersion: Number(current.version),
                        reasons: safety.reasons,
                        current: safety.current,
                        incoming: safety.incoming
                    }));
                    return jsonResponse({
                        error: "Automatic backup paused because this device contains substantially less Level Up history than the current cloud backup.",
                        code: SAFETY_CODE,
                        currentVersion: Number(current.version),
                        safety
                    }, 409, request, env);
                }
            }
        }

        const response = await baseWorker.fetch(request, env, ctx);
        if (!response.ok) return response;

        const latest = await env.DB.prepare(`
            SELECT version, payload, byte_size, client_exported_at, created_at, updated_at
            FROM backups
            WHERE user_id = ?
        `).bind(user.id).first();

        if (latest?.payload) {
            await archiveBackupRow(user.id, latest, env);
            await trimBackupHistory(user.id, env);
        }

        return response;
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
    const response = await baseWorker.fetch(authRequest, env, ctx);
    if (!response.ok) return null;
    try { return (await response.json())?.user || null; }
    catch { return null; }
}

async function archiveBackupRow(userId, row, env) {
    if (!row?.payload || !Number.isInteger(Number(row.version))) return;
    const createdAt = row.updated_at || row.created_at || new Date().toISOString();
    await env.DB.prepare(`
        INSERT OR IGNORE INTO backup_history
            (user_id, version, payload, byte_size, client_exported_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        userId,
        Number(row.version),
        row.payload,
        Number(row.byte_size) || 0,
        row.client_exported_at || null,
        createdAt
    ).run();
}

async function trimBackupHistory(userId, env) {
    await env.DB.prepare(`
        DELETE FROM backup_history
        WHERE user_id = ?
          AND version NOT IN (
              SELECT version
              FROM backup_history
              WHERE user_id = ?
              ORDER BY version DESC
              LIMIT ?
          )
    `).bind(userId, userId, BACKUP_HISTORY_LIMIT).run();
}

function isBackupShape(backup) {
    return Boolean(
        backup?.app === "level-up" &&
        backup?.data &&
        typeof backup.data === "object" &&
        !Array.isArray(backup.data)
    );
}

function assessDataReduction(currentBackup, incomingBackup, currentByteSize, incomingByteSize) {
    const current = backupSafetySummary(currentBackup);
    const incoming = backupSafetySummary(incomingBackup);
    const reasons = [];

    compareCount(reasons, "completed workouts", current.completedWorkouts, incoming.completedWorkouts, 3, 0.70);
    compareCount(reasons, "weigh-ins", current.weighIns, incoming.weighIns, 5, 0.70);
    compareCount(reasons, "food-log days", current.foodLogDays, incoming.foodLogDays, 5, 0.70);
    compareCount(reasons, "measurements", current.measurements, incoming.measurements, 3, 0.70);
    compareCount(reasons, "sleep entries", current.sleepEntries, incoming.sleepEntries, 5, 0.70);

    if (current.workoutPlans >= 1 && incoming.workoutPlans === 0) {
        reasons.push("workout plans dropped to zero");
    }

    const currentHistory = majorHistoryCount(current);
    const incomingHistory = majorHistoryCount(incoming);
    const severeHistoryCollapse = currentHistory >= 10 && incomingHistory <= Math.max(2, Math.floor(currentHistory * 0.25));
    if (severeHistoryCollapse) reasons.push("major history collapsed to 25% or less");

    const sectionCollapse = current.savedSections >= 20 && incoming.savedSections < Math.ceil(current.savedSections * 0.65);
    if (sectionCollapse) reasons.push("saved app sections dropped by more than 35%");

    const byteCollapse = currentByteSize >= 50_000 && incomingByteSize > 0 && incomingByteSize < currentByteSize * 0.55;
    if (byteCollapse) reasons.push("backup size dropped by more than 45%");

    const countCollapseReasons = reasons.filter(reason => (
        reason.includes("completed workouts") ||
        reason.includes("weigh-ins") ||
        reason.includes("food-log days") ||
        reason.includes("measurements") ||
        reason.includes("sleep entries") ||
        reason.includes("workout plans")
    )).length;

    const blocked = severeHistoryCollapse ||
        countCollapseReasons >= 2 ||
        (countCollapseReasons >= 1 && sectionCollapse) ||
        (countCollapseReasons >= 1 && byteCollapse) ||
        (sectionCollapse && byteCollapse && currentHistory >= 5);

    return {
        blocked,
        reasons,
        current,
        incoming,
        currentByteSize,
        incomingByteSize
    };
}

function compareCount(reasons, label, current, incoming, minimumCurrent, retainedFraction) {
    if (current < minimumCurrent) return;
    if (incoming < Math.ceil(current * retainedFraction)) {
        reasons.push(`${label} dropped from ${current} to ${incoming}`);
    }
}

function backupSafetySummary(backup) {
    const data = backup?.data || {};
    const savedSections = Object.keys(data).filter(key => !EXCLUDED_STORAGE_KEYS.has(key)).length;
    return {
        savedSections,
        completedWorkouts: arrayLength(data.forge_workout_sessions),
        weighIns: arrayLength(data.forge_weight_entries),
        workoutPlans: arrayLength(data.forge_workout_plans),
        foodLogDays: countFoodLogDays(data.level_up_food_log_v1),
        measurements: arrayLength(data.level_up_body_measurements),
        sleepEntries: arrayLength(data.level_up_sleep_entries),
        nutritionPhases: arrayLength(data.level_up_nutrition_phases)
    };
}

function majorHistoryCount(summary) {
    return summary.completedWorkouts +
        summary.weighIns +
        summary.foodLogDays +
        summary.measurements +
        summary.sleepEntries;
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
