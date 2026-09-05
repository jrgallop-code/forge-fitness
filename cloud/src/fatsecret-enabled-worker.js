import baseWorker from "./safe-backup-worker-v2.js";
import {
    fatSecretCanBarcode,
    fatSecretConfigured,
    findFatSecretFoodByBarcode,
    getFatSecretCapabilities,
    getFatSecretFood,
    searchFatSecretFoods
} from "./fatsecret-food-provider.js";

const SEARCH_LIMIT = 16;
const FATSECRET_SEARCH_LIMIT = 8;
const FATSECRET_DETAIL_LIMIT = 5;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        const detailMatch = url.pathname.match(/^\/v1\/foods\/fatsecret\/(\d+)$/);
        if (detailMatch && request.method === "GET") {
            return getFatSecretDetailResponse(detailMatch[1], url, request, env, ctx);
        }

        if (url.pathname === "/v1/foods/search" && request.method === "GET") {
            return searchFoodsWithFatSecret(url, request, env, ctx);
        }

        const barcodeMatch = url.pathname.match(/^\/v1\/foods\/barcode\/(\d+)$/);
        if (barcodeMatch && request.method === "GET") {
            return barcodeWithFatSecretFallback(barcodeMatch[1], url, request, env, ctx);
        }

        return baseWorker.fetch(request, env, ctx);
    }
};

async function searchFoodsWithFatSecret(url, request, env, ctx) {
    const baseResponse = await baseWorker.fetch(request, env, ctx);
    if (!baseResponse.ok || !fatSecretConfigured(env)) return baseResponse;

    const query = String(url.searchParams.get("q") || "").trim().replace(/\s+/g, " ");
    if (query.length < 2) return baseResponse;

    const country = normalizeCountry(url.searchParams.get("country"));
    let capabilities = null;
    try {
        capabilities = await getFatSecretCapabilities(env);
        const summaries = await searchFatSecretFoods(query, country, env, { limit: FATSECRET_SEARCH_LIMIT });

        // Premier v5 search already returns detailed servings. Keep those results
        // directly instead of re-fetching and accidentally dropping valid foods.
        const usableFromSearch = summaries.filter(hasStorableServingId);
        const needsDetail = summaries
            .filter(food => !hasStorableServingId(food))
            .map(food => String(food?.fatSecretFoodId || ""))
            .filter(id => /^\d+$/.test(id))
            .slice(0, FATSECRET_DETAIL_LIMIT);

        const enriched = (await Promise.all(needsDetail.map(id => getFatSecretFood(id, country, env).catch(() => null))))
            .filter(hasStorableServingId);
        const fatSecretFoods = mergeFatSecretCandidates(summaries, usableFromSearch, enriched);

        const payload = await baseResponse.clone().json().catch(() => ({}));
        const status = fatSecretStatus(capabilities, country, fatSecretFoods.length > 0, {
            candidates: summaries.length,
            usableResults: fatSecretFoods.length,
            directResults: usableFromSearch.length,
            enrichedResults: enriched.length
        });
        if (!fatSecretFoods.length) return jsonFrom(baseResponse, { ...payload, fatSecret: status });

        const baseFoods = Array.isArray(payload?.foods) ? payload.foods : [];
        const foods = mergeSearchResults(baseFoods, fatSecretFoods, SEARCH_LIMIT);
        const source = appendSource(payload?.source, "FatSecret");
        return jsonFrom(baseResponse, { ...payload, foods, source, fatSecret: status });
    }
    catch (error) {
        const reason = error?.name === "AbortError" ? "timeout" : String(error?.message || error);
        console.warn(JSON.stringify({ event: "fatsecret_food_search_failed", reason }));
        const payload = await baseResponse.clone().json().catch(() => ({}));
        return jsonFrom(baseResponse, {
            ...payload,
            fatSecret: {
                ...fatSecretStatus(capabilities, country, false),
                available: false,
                error: safeFatSecretError(reason)
            }
        });
    }
}

async function getFatSecretDetailResponse(foodId, url, request, env, ctx) {
    const auth = await authenticatedUser(request, env, ctx);
    if (!auth.ok) return auth.response;
    if (!fatSecretConfigured(env)) return jsonResponse({ error: "FatSecret food search is not configured." }, 503, request, env);

    try {
        const country = normalizeCountry(url.searchParams.get("country"));
        const food = await getFatSecretFood(foodId, country, env);
        if (!food) return jsonResponse({ error: "FatSecret food was not found." }, 404, request, env);
        return jsonResponse({ food, source: "FatSecret" }, 200, request, env);
    }
    catch (error) {
        console.warn(JSON.stringify({ event: "fatsecret_food_detail_failed", foodId, reason: String(error?.message || error) }));
        return jsonResponse({ error: "FatSecret food details are temporarily unavailable." }, 502, request, env);
    }
}

async function barcodeWithFatSecretFallback(barcode, url, request, env, ctx) {
    const baseResponse = await baseWorker.fetch(request, env, ctx);
    if (baseResponse.ok || !fatSecretConfigured(env) || !fatSecretCanBarcode(env)) return baseResponse;

    try {
        const country = normalizeCountry(url.searchParams.get("country"));
        const food = await findFatSecretFoodByBarcode(barcode, country, env);
        if (!food) return baseResponse;
        return jsonFrom(baseResponse, { food, source: "FatSecret", barcode });
    }
    catch (error) {
        console.warn(JSON.stringify({ event: "fatsecret_barcode_lookup_failed", barcode, reason: String(error?.message || error) }));
        return baseResponse;
    }
}

async function authenticatedUser(request, env, ctx) {
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.delete("content-type");
    const authRequest = new Request(new URL("/v1/me", request.url), { method: "GET", headers });
    const response = await baseWorker.fetch(authRequest, env, ctx);
    return { ok: response.ok, response };
}

function fatSecretStatus(capabilities, requestedCountry, contributed, counts = {}) {
    const canLocalize = Boolean(capabilities?.canLocalize);
    const effectiveCountry = canLocalize && requestedCountry ? requestedCountry : "US";
    return {
        configured: true,
        available: Boolean(capabilities),
        scopeMode: capabilities?.scopeMode || null,
        requestedScope: capabilities?.requestedScope || null,
        grantedScopes: Array.isArray(capabilities?.grantedScopes) ? capabilities.grantedScopes : [],
        premier: Boolean(capabilities?.premier),
        localization: Boolean(capabilities?.localization),
        canLocalize,
        canBarcode: Boolean(capabilities?.canBarcode),
        requestedCountry: requestedCountry || "US",
        effectiveCountry,
        contributed: Boolean(contributed),
        candidates: Math.max(0, Number(counts.candidates) || 0),
        usableResults: Math.max(0, Number(counts.usableResults) || 0),
        directResults: Math.max(0, Number(counts.directResults) || 0),
        enrichedResults: Math.max(0, Number(counts.enrichedResults) || 0)
    };
}

function hasStorableServingId(food) {
    return Boolean(food && Array.isArray(food.portions) && food.portions.some(portion => /^\d+$/.test(String(portion?.servingId || ""))));
}

function mergeFatSecretCandidates(summaries, direct, enriched) {
    const usable = new Map();
    [...direct, ...enriched].forEach(food => {
        const id = String(food?.fatSecretFoodId || "");
        if (id && !usable.has(id)) usable.set(id, food);
    });
    const ordered = [];
    (Array.isArray(summaries) ? summaries : []).forEach(summary => {
        const id = String(summary?.fatSecretFoodId || "");
        const food = usable.get(id);
        if (food) ordered.push(food);
    });
    usable.forEach((food, id) => {
        if (!ordered.some(item => String(item?.fatSecretFoodId || "") === id)) ordered.push(food);
    });
    return ordered;
}

function safeFatSecretError(reason) {
    const text = String(reason || "").toLowerCase();
    if (text.includes("invalid ip") || text.includes("ip address")) return "invalid_ip";
    if (text.includes("missing scope")) return "missing_scope";
    if (text.includes("invalid token")) return "invalid_token";
    if (text.includes("token request failed")) return "token_request_failed";
    if (text.includes("timeout")) return "timeout";
    return "request_failed";
}

function mergeSearchResults(baseFoods, fatSecretFoods, limit) {
    const verified = baseFoods.filter(food => food?.source === "levelup");
    const other = baseFoods.filter(food => food?.source !== "levelup");
    const ordered = [...verified, ...other.slice(0, 8), ...fatSecretFoods, ...other.slice(8)];
    const seen = new Set();
    const result = [];
    for (const food of ordered) {
        const key = foodIdentity(food);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        result.push(food);
        if (result.length >= limit) break;
    }
    return result;
}

function foodIdentity(food) {
    const name = normalizeText(food?.name);
    const brand = normalizeText(food?.brand);
    return name ? `${name}|${brand}` : "";
}

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function normalizeCountry(value) {
    const country = String(value || "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(country) ? country : "";
}

function appendSource(value, source) {
    const parts = String(value || "").split(" + ").map(item => item.trim()).filter(Boolean);
    if (!parts.includes(source)) parts.push(source);
    return parts.join(" + ");
}

function jsonFrom(response, payload) {
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    return new Response(JSON.stringify(payload), { status: 200, headers });
}

function jsonResponse(payload, status, request, env) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "Origin"
    });
    const origin = request.headers.get("Origin");
    const allowed = new Set(String(env.ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean));
    if (origin && allowed.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
    return new Response(JSON.stringify(payload), { status, headers });
}
