import baseApi from "./index.js";

const FUNNEL_EVENT_NAMES = new Set([
    "workout_viewed",
    "plan_selected",
    "workout_started",
    "first_set_logged"
]);

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (request.method !== "POST" || url.pathname !== "/v1/events") {
            return baseApi.fetch(request, env);
        }

        let body;
        try {
            body = await readJson(request.clone(), 8 * 1024);
        }
        catch {
            return baseApi.fetch(request, env);
        }

        if (!FUNNEL_EVENT_NAMES.has(body?.eventName)) {
            return baseApi.fetch(request, env);
        }

        const origin = request.headers.get("Origin");
        if (origin && !allowedOrigins(env).has(origin)) {
            return json({ error: "Origin not allowed." }, 403, request, env);
        }

        const userId = await requireUserId(request, env);
        if (!userId) return json({ error: "Sign in required." }, 401, request, env);

        const eventKey = limitedText(body?.eventKey, 128);
        if (!eventKey) return json({ error: "Event key is required." }, 400, request, env);

        const metadata = body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
            ? body.metadata
            : {};
        const metadataJson = JSON.stringify(metadata);
        if (metadataJson.length > 2048) {
            return json({ error: "Event metadata is too large." }, 400, request, env);
        }

        const occurredAt = validIso(body?.occurredAt) || new Date().toISOString();
        const now = new Date().toISOString();
        await env.DB.prepare(`
            INSERT INTO product_events (id, user_id, event_name, event_key, occurred_at, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, event_name, event_key) DO NOTHING
        `).bind(
            crypto.randomUUID(),
            userId,
            body.eventName,
            eventKey,
            occurredAt,
            metadataJson,
            now
        ).run();

        return json({ ok: true }, 200, request, env);
    }
};

async function requireUserId(request, env) {
    const token = bearerToken(request);
    if (!token) return null;
    const tokenHash = await sha256(token);
    const row = await env.DB.prepare(`
        SELECT users.id
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ?
          AND sessions.expires_at > ?
          AND users.beta_status = 'active'
    `).bind(tokenHash, new Date().toISOString()).first();
    return row?.id || null;
}

function bearerToken(request) {
    const value = request.headers.get("Authorization") || "";
    return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function readJson(request, maxBytes) {
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > maxBytes) throw new Error("Request too large");
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new Error("Request too large");
    return JSON.parse(new TextDecoder().decode(buffer));
}

function limitedText(value, maxLength) {
    if (typeof value !== "string") return null;
    const result = value.trim().slice(0, maxLength);
    return result || null;
}

function validIso(value) {
    if (typeof value !== "string" || value.length > 40 || !Number.isFinite(Date.parse(value))) return null;
    return new Date(value).toISOString();
}

function allowedOrigins(env) {
    return new Set(String(env.ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean));
}

function corsHeaders(request, env) {
    const origin = request.headers.get("Origin");
    if (!origin || !allowedOrigins(env).has(origin)) return {};
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
    };
}

function json(value, status, request, env) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });
    Object.entries(corsHeaders(request, env)).forEach(([key, val]) => headers.set(key, val));
    return new Response(JSON.stringify(value), { status, headers });
}
