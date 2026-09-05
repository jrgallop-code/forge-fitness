import fatSecretWorker from "./fatsecret-enabled-worker.js";

const FOOD_SEARCH_PATH = "/v1/foods/search";
const ADMIN_ANALYTICS_PATH = "/v1/admin/analytics";
const ACTIVITY_PATH = "/v1/activity";
const EVENTS_PATH = "/v1/events";
const FATSECRET_BINDINGS = ["FATSECRET_CLIENT_ID", "FATSECRET_CLIENT_SECRET"];
const OWNER_ADMIN_EMAIL_B64 = "anJnYWxsb3BAZ21haWwuY29t";
const APPEARANCE_THEMES = new Set(["system", "level-up", "arctic", "pure", "ocean", "midnight", "slate", "pulse"]);

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const authorizedEnv = withOwnerAdminAuthorization(env);
        const body = shouldInspectBody(request, url)
            ? await request.clone().json().catch(() => null)
            : null;

        const response = await fatSecretWorker.fetch(request, authorizedEnv, ctx);

        if (response.ok && request.method === "POST" && url.pathname === ACTIVITY_PATH && body?.productState) {
            const write = recordProductState(request, body.productState, authorizedEnv);
            if (ctx?.waitUntil) ctx.waitUntil(write);
            else await write;
        }

        if (response.ok && request.method === "POST" && url.pathname === EVENTS_PATH && body?.eventName === "workout_completed" && body?.metadata?.planName) {
            const write = mergeProgramMetadata(request, body, authorizedEnv);
            if (ctx?.waitUntil) ctx.waitUntil(write);
            else await write;
        }

        if (response.ok && request.method === "GET" && url.pathname === ADMIN_ANALYTICS_PATH) {
            const payload = await response.clone().json().catch(() => null);
            if (!payload || typeof payload !== "object") return response;
            const productInsights = await getProductInsights(url, authorizedEnv);
            return jsonFrom(response, { ...payload, productInsights });
        }

        if (request.method !== "GET" || url.pathname !== FOOD_SEARCH_PATH || !response.ok) {
            return response;
        }

        const payload = await response.clone().json().catch(() => null);
        if (!payload || typeof payload !== "object" || payload.fatSecret) return response;

        const missingBindings = FATSECRET_BINDINGS.filter(name => !String(env?.[name] || "").trim());
        const fatSecret = missingBindings.length === 0
            ? {
                configured: true,
                available: false,
                error: "diagnostic_missing",
                contributed: false,
                candidates: 0,
                usableResults: 0,
                missingBindings: []
            }
            : {
                configured: false,
                available: false,
                error: "credentials_missing",
                contributed: false,
                candidates: 0,
                usableResults: 0,
                missingBindings
            };

        return jsonFrom(response, { ...payload, fatSecret });
    }
};

function shouldInspectBody(request, url) {
    return request.method === "POST" && [ACTIVITY_PATH, EVENTS_PATH].includes(url.pathname);
}

async function recordProductState(request, productState, env) {
    if (!env?.DB || !productState || typeof productState !== "object") return;
    const userId = await sessionUserId(request, env);
    if (!userId) return;

    const appearanceTheme = APPEARANCE_THEMES.has(productState.appearanceTheme) ? productState.appearanceTheme : null;
    const effectiveTheme = APPEARANCE_THEMES.has(productState.effectiveTheme) ? productState.effectiveTheme : null;
    const programId = limitedText(productState.programId, 128);
    const programName = limitedText(productState.programName, 160);
    const programSource = limitedText(productState.programSource, 64);
    const now = new Date().toISOString();

    try {
        await env.DB.prepare(`
            INSERT INTO user_product_state
                (user_id, appearance_theme, effective_theme, program_id, program_name, program_source, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                appearance_theme = excluded.appearance_theme,
                effective_theme = excluded.effective_theme,
                program_id = excluded.program_id,
                program_name = excluded.program_name,
                program_source = excluded.program_source,
                updated_at = excluded.updated_at
        `).bind(userId, appearanceTheme, effectiveTheme, programId, programName, programSource, now).run();
    }
    catch (error) {
        console.info(JSON.stringify({ event: "product_state_write_unavailable", reason: String(error?.message || error) }));
    }
}

async function mergeProgramMetadata(request, body, env) {
    if (!env?.DB) return;
    const userId = await sessionUserId(request, env);
    const eventKey = limitedText(body?.eventKey, 128);
    if (!userId || !eventKey) return;

    try {
        const row = await env.DB.prepare(`
            SELECT metadata_json
            FROM product_events
            WHERE user_id = ? AND event_name = 'workout_completed' AND event_key = ?
            LIMIT 1
        `).bind(userId, eventKey).first();
        if (!row) return;

        let current = {};
        try { current = JSON.parse(row.metadata_json || "{}"); }
        catch { current = {}; }
        const incoming = body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};
        const merged = {
            ...current,
            ...(limitedText(incoming.planId, 128) ? { planId: limitedText(incoming.planId, 128) } : {}),
            ...(limitedText(incoming.planName, 160) ? { planName: limitedText(incoming.planName, 160) } : {}),
            ...(limitedText(incoming.workoutSource, 64) ? { workoutSource: limitedText(incoming.workoutSource, 64) } : {}),
            ...(Number.isFinite(Number(incoming.workingSets)) ? { workingSets: Number(incoming.workingSets) } : {}),
            ...(Number.isFinite(Number(incoming.durationMinutes)) ? { durationMinutes: Number(incoming.durationMinutes) } : {})
        };
        const metadataJson = JSON.stringify(merged);
        if (metadataJson.length > 2048) return;
        await env.DB.prepare(`
            UPDATE product_events SET metadata_json = ?
            WHERE user_id = ? AND event_name = 'workout_completed' AND event_key = ?
        `).bind(metadataJson, userId, eventKey).run();
    }
    catch (error) {
        console.info(JSON.stringify({ event: "program_metadata_enrichment_unavailable", reason: String(error?.message || error) }));
    }
}

async function getProductInsights(url, env) {
    if (!env?.DB) return emptyProductInsights(true);
    const requestedDays = Number(url.searchParams.get("days") || 30);
    const days = Number.isFinite(requestedDays) ? Math.min(365, Math.max(7, Math.round(requestedDays))) : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    try {
        const [programUsage, appearance, recentPrograms, coverage] = await Promise.all([
            env.DB.prepare(`
                SELECT program_name, program_id, COUNT(*) AS workouts, COUNT(DISTINCT user_id) AS users
                FROM (
                    SELECT
                        user_id,
                        COALESCE(
                            NULLIF(json_extract(metadata_json, '$.planName'), ''),
                            NULLIF(json_extract(metadata_json, '$.planId'), ''),
                            'Unknown program'
                        ) AS program_name,
                        json_extract(metadata_json, '$.planId') AS program_id,
                        json_extract(metadata_json, '$.workoutSource') AS workout_source
                    FROM product_events
                    WHERE event_name = 'workout_completed' AND occurred_at >= ?
                )
                WHERE COALESCE(workout_source, '') <> 'one_off'
                GROUP BY program_name, program_id
                ORDER BY workouts DESC, users DESC, program_name
                LIMIT 12
            `).bind(since).all(),
            env.DB.prepare(`
                SELECT appearance_theme AS theme, COUNT(*) AS users
                FROM user_product_state
                WHERE appearance_theme IS NOT NULL AND appearance_theme <> ''
                GROUP BY appearance_theme
                ORDER BY users DESC, theme
            `).all(),
            env.DB.prepare(`
                SELECT
                    COALESCE(NULLIF(program_name, ''), NULLIF(program_id, ''), 'Unknown program') AS program_name,
                    program_id,
                    program_source,
                    COUNT(*) AS users
                FROM user_product_state
                WHERE program_name IS NOT NULL OR program_id IS NOT NULL
                GROUP BY program_name, program_id, program_source
                ORDER BY users DESC, program_name
                LIMIT 12
            `).all(),
            env.DB.prepare(`
                SELECT
                    (SELECT COUNT(*) FROM user_product_state) AS tracked_users,
                    (SELECT COUNT(*) FROM users) AS total_users
            `).first()
        ]);

        return {
            programUsage: programUsage?.results || [],
            appearance: appearance?.results || [],
            recentPrograms: recentPrograms?.results || [],
            coverage: coverage || { tracked_users: 0, total_users: 0 },
            migrationPending: false
        };
    }
    catch (error) {
        console.info(JSON.stringify({ event: "product_insights_unavailable", reason: String(error?.message || error) }));
        return emptyProductInsights(true);
    }
}

function emptyProductInsights(migrationPending = false) {
    return {
        programUsage: [],
        appearance: [],
        recentPrograms: [],
        coverage: { tracked_users: 0, total_users: 0 },
        migrationPending
    };
}

async function sessionUserId(request, env) {
    const token = bearerToken(request);
    if (!token) return "";
    try {
        const tokenHash = await sha256(token);
        const row = await env.DB.prepare(`
            SELECT user_id FROM sessions
            WHERE token_hash = ? AND expires_at > ?
            LIMIT 1
        `).bind(tokenHash, new Date().toISOString()).first();
        return row?.user_id || "";
    }
    catch {
        return "";
    }
}

function bearerToken(request) {
    const value = request.headers.get("Authorization") || "";
    return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function limitedText(value, maxLength) {
    if (typeof value !== "string") return null;
    const result = value.trim().slice(0, maxLength);
    return result || null;
}

function withOwnerAdminAuthorization(env = {}) {
    const configured = String(env.ADMIN_EMAILS || "").trim();
    const ownerEmail = decodeBase64(OWNER_ADMIN_EMAIL_B64).trim().toLowerCase();
    const adminEmails = [configured, ownerEmail].filter(Boolean).join(",");
    return { ...env, ADMIN_EMAILS: adminEmails };
}

function decodeBase64(value) {
    if (typeof atob === "function") return atob(value);
    return Buffer.from(value, "base64").toString("utf8");
}

function jsonFrom(response, payload) {
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    return new Response(JSON.stringify(payload), {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}
