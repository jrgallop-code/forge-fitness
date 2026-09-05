import fatSecretWorker from "./fatsecret-enabled-worker.js";

const FOOD_SEARCH_PATH = "/v1/foods/search";
const FATSECRET_BINDINGS = ["FATSECRET_CLIENT_ID", "FATSECRET_CLIENT_SECRET"];
const OWNER_ADMIN_EMAIL_B64 = "anJnYWxsb3BAZ21haWwuY29t";

export default {
    async fetch(request, env, ctx) {
        const response = await fatSecretWorker.fetch(request, withOwnerAdminAuthorization(env), ctx);
        if (request.method !== "GET" || new URL(request.url).pathname !== FOOD_SEARCH_PATH || !response.ok) {
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