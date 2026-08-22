const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
const SESSION_DAYS = 30;

export default {
    async fetch(request, env) {
        try {
            return await handleRequest(request, env);
        }
        catch (error) {
            console.error(JSON.stringify({ event: "unhandled_request_error", message: String(error?.message || error) }));
            const status = error instanceof HttpError ? error.status : 500;
            const message = error instanceof HttpError ? error.message : "The cloud service could not complete this request.";
            return json({ error: message }, status, request, env);
        }
    }
};

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return preflight(request, env);
    if (origin && !allowedOrigins(env).has(origin)) return json({ error: "Origin not allowed." }, 403, request, env);
    if (url.pathname === "/health" && request.method === "GET") return json({ ok: true }, 200, request, env);

    if (url.pathname === "/v1/session/google" && request.method === "POST") {
        const body = await readJson(request, 64 * 1024);
        return createGoogleSession(body, request, env);
    }

    const user = await requireUser(request, env);
    if (!user) return json({ error: "Sign in required." }, 401, request, env);

    if (url.pathname === "/v1/me" && request.method === "GET") {
        return json({ user: publicUser(user) }, 200, request, env);
    }
    if (url.pathname === "/v1/session" && request.method === "DELETE") {
        await deleteSession(request, env);
        return json({ ok: true }, 200, request, env);
    }
    if (url.pathname === "/v1/backup/meta" && request.method === "GET") {
        return getBackupMeta(user.id, request, env);
    }
    if (url.pathname === "/v1/backup" && request.method === "GET") {
        return getBackup(user.id, request, env);
    }
    if (url.pathname === "/v1/backup" && request.method === "PUT") {
        const body = await readJson(request, MAX_BACKUP_BYTES + 64 * 1024);
        return putBackup(user.id, body, request, env);
    }
    if (url.pathname === "/v1/account" && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
        return json({ ok: true }, 200, request, env);
    }
    return json({ error: "Not found." }, 404, request, env);
}

async function createGoogleSession(body, request, env) {
    const credential = typeof body?.credential === "string" ? body.credential : "";
    if (!credential || credential.length > 10000) return json({ error: "Google sign-in credential is required." }, 400, request, env);

    const verification = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!verification.ok) return json({ error: "Google sign-in could not be verified." }, 401, request, env);
    const profile = await verification.json();
    if (profile.aud !== env.GOOGLE_CLIENT_ID || String(profile.email_verified) !== "true" || !profile.sub || !profile.email) {
        return json({ error: "Google sign-in is not valid for Level Up." }, 401, request, env);
    }

    const now = new Date().toISOString();
    await env.DB.prepare(`
        INSERT INTO users (id, email, display_name, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            updated_at = excluded.updated_at
    `).bind(profile.sub, String(profile.email).toLowerCase(), profile.name || null, profile.picture || null, now, now).run();

    const token = createToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    await env.DB.batch([
        env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
        env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
            .bind(tokenHash, profile.sub, expiresAt, now)
    ]);

    return json({
        token,
        expiresAt,
        user: publicUser({ id: profile.sub, email: profile.email, display_name: profile.name, avatar_url: profile.picture, beta_status: "active" })
    }, 201, request, env);
}

async function requireUser(request, env) {
    const token = bearerToken(request);
    if (!token) return null;
    const tokenHash = await sha256(token);
    const row = await env.DB.prepare(`
        SELECT users.id, users.email, users.display_name, users.avatar_url, users.beta_status
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.beta_status = 'active'
    `).bind(tokenHash, new Date().toISOString()).first();
    return row || null;
}

async function deleteSession(request, env) {
    const token = bearerToken(request);
    if (!token) return;
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

async function getBackupMeta(userId, request, env) {
    const row = await env.DB.prepare("SELECT version, byte_size, client_exported_at, updated_at FROM backups WHERE user_id = ?")
        .bind(userId).first();
    return json({ backup: row || null }, 200, request, env);
}

async function getBackup(userId, request, env) {
    const row = await env.DB.prepare("SELECT version, payload, byte_size, client_exported_at, updated_at FROM backups WHERE user_id = ?")
        .bind(userId).first();
    if (!row) return json({ error: "No cloud backup exists yet." }, 404, request, env);
    return json({
        backup: JSON.parse(row.payload),
        version: row.version,
        byteSize: row.byte_size,
        clientExportedAt: row.client_exported_at,
        updatedAt: row.updated_at
    }, 200, request, env);
}

async function putBackup(userId, body, request, env) {
    const backup = body?.backup;
    const expectedVersion = body?.expectedVersion === null ? null : Number(body?.expectedVersion);
    if (backup?.app !== "level-up" || !backup?.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
        return json({ error: "This is not a valid Level Up backup." }, 400, request, env);
    }
    const payload = JSON.stringify(backup);
    const byteSize = new TextEncoder().encode(payload).byteLength;
    if (byteSize > MAX_BACKUP_BYTES) return json({ error: "This backup is too large for beta cloud storage." }, 413, request, env);

    const current = await env.DB.prepare("SELECT version FROM backups WHERE user_id = ?").bind(userId).first();
    const now = new Date().toISOString();
    if (!current) {
        if (expectedVersion !== null) return conflict(request, env);
        await env.DB.prepare(`
            INSERT INTO backups (user_id, version, payload, byte_size, client_exported_at, created_at, updated_at)
            VALUES (?, 1, ?, ?, ?, ?, ?)
        `).bind(userId, payload, byteSize, backup.exportedAt || null, now, now).run();
        return json({ version: 1, byteSize, updatedAt: now }, 201, request, env);
    }

    if (!Number.isInteger(expectedVersion) || expectedVersion !== Number(current.version)) return conflict(request, env);
    const nextVersion = Number(current.version) + 1;
    const result = await env.DB.prepare(`
        UPDATE backups
        SET version = ?, payload = ?, byte_size = ?, client_exported_at = ?, updated_at = ?
        WHERE user_id = ? AND version = ?
    `).bind(nextVersion, payload, byteSize, backup.exportedAt || null, now, userId, expectedVersion).run();
    if (Number(result.meta?.changes || 0) !== 1) return conflict(request, env);
    return json({ version: nextVersion, byteSize, updatedAt: now }, 200, request, env);
}

function conflict(request, env) {
    return json({ error: "The cloud backup changed on another device. Download it before uploading again." }, 409, request, env);
}

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.display_name || null,
        avatarUrl: user.avatar_url || null,
        betaStatus: user.beta_status || "active"
    };
}

function bearerToken(request) {
    const value = request.headers.get("Authorization") || "";
    return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function createToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function readJson(request, maxBytes) {
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > maxBytes) throw new HttpError(413, "Request is too large.");
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new HttpError(413, "Request is too large.");
    try { return JSON.parse(new TextDecoder().decode(buffer)); }
    catch { throw new HttpError(400, "Request body must be valid JSON."); }
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

function preflight(request, env) {
    const origin = request.headers.get("Origin");
    if (!origin || !allowedOrigins(env).has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
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

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
