import { SWISS_CHALET_FOODS } from "./data/swiss-chalet-foods.js";
import { PUR_SIMPLE_FOODS } from "./data/pur-simple-foods.js";
import { NORTH_AMERICAN_CHAIN_FOODS } from "./data/north-american-chain-foods.js";
import { CANADIAN_CHAIN_EXPANSION } from "./data/canadian-chain-expansion.js";

const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 100000;
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_MAX_FAILURES = 10;
const ACQUISITION_SOURCES = new Set(["instagram", "tiktok", "reddit", "youtube", "google_search", "friend_family", "app_recommendation", "other", "prefer_not_to_say"]);
const CLIENT_EVENT_NAMES = new Set(["onboarding_completed", "workout_completed"]);
const USAGE_EVENT_NAMES = new Set(["food_logged"]);

export default {
    async fetch(request, env, ctx) {
        try {
            return await handleRequest(request, env, ctx);
        }
        catch (error) {
            console.error(JSON.stringify({ event: "unhandled_request_error", message: String(error?.message || error) }));
            const status = error instanceof HttpError ? error.status : 500;
            const message = error instanceof HttpError ? error.message : "The cloud service could not complete this request.";
            return json({ error: message }, status, request, env);
        }
    }
};

async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return preflight(request, env);
    if (origin && !allowedOrigins(env).has(origin)) return json({ error: "Origin not allowed." }, 403, request, env);
    if (url.pathname === "/health" && request.method === "GET") return json({ ok: true }, 200, request, env);

    if (url.pathname === "/v1/session/google" && request.method === "POST") {
        const body = await readJson(request, 64 * 1024);
        return createGoogleSession(body, request, env);
    }
    if (url.pathname === "/v1/account/email" && request.method === "POST") {
        const body = await readJson(request, 16 * 1024);
        return createEmailAccount(body, request, env);
    }
    if (url.pathname === "/v1/session/email" && request.method === "POST") {
        const body = await readJson(request, 16 * 1024);
        return createEmailSession(body, request, env);
    }

    const user = await requireUser(request, env);
    if (!user) return json({ error: "Sign in required." }, 401, request, env);

    if (url.pathname === "/v1/me" && request.method === "GET") {
        return json({ user: { ...publicUser(user), isAdmin: isAdminUser(user, env) } }, 200, request, env);
    }
    if (url.pathname === "/v1/admin/analytics" && request.method === "GET") {
        return getAdminAnalytics(user, url, request, env);
    }
    if (url.pathname === "/v1/admin/restaurants/staging" && request.method === "POST") {
        const body = await readJson(request, 32 * 1024);
        return stageRestaurantFood(user, body, request, env);
    }
    const restaurantReviewMatch = url.pathname.match(/^\/v1\/admin\/restaurants\/staging\/([^/]+)\/review$/);
    if (restaurantReviewMatch && request.method === "POST") {
        const body = await readJson(request, 8 * 1024);
        return reviewRestaurantFood(user, restaurantReviewMatch[1], body, request, env);
    }
    if (url.pathname === "/v1/feedback/status" && request.method === "GET") {
        return getSatisfactionFeedbackStatus(user.id, request, env);
    }
    if (url.pathname === "/v1/feedback" && request.method === "POST") {
        const body = await readJson(request, 8 * 1024);
        return recordSatisfactionFeedback(user.id, body, request, env);
    }
    if (url.pathname === "/v1/foods/search" && request.method === "GET") {
        return searchUsdaFoods(user.id, url, request, env, ctx);
    }
    const foodBarcodeMatch = url.pathname.match(/^\/v1\/foods\/barcode\/(\d+)$/);
    if (foodBarcodeMatch && request.method === "GET") {
        return getFoodByBarcode(foodBarcodeMatch[1], request, env, ctx);
    }
    const foodDetailMatch = url.pathname.match(/^\/v1\/foods\/(\d+)$/);
    if (foodDetailMatch && request.method === "GET") {
        return getUsdaFoodDetails(Number(foodDetailMatch[1]), request, env);
    }
    if (url.pathname === "/v1/import/reddit" && request.method === "POST") {
        const body = await readJson(request, 8 * 1024);
        return importRedditSource(body, request, env);
    }
    if (url.pathname === "/v1/activity" && request.method === "POST") {
        return recordActivity(user.id, request, env);
    }
    if (url.pathname === "/v1/acquisition" && request.method === "PUT") {
        const body = await readJson(request, 8 * 1024);
        return putAcquisition(user.id, body, request, env);
    }
    if (url.pathname === "/v1/events" && request.method === "POST") {
        const body = await readJson(request, 8 * 1024);
        return recordProductEvent(user.id, body, request, env);
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

    const email = normalizeEmail(profile.email);
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    const userId = existing?.id || profile.sub;
    const now = new Date().toISOString();
    await env.DB.prepare(`
        INSERT INTO users (id, email, display_name, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            updated_at = excluded.updated_at
    `).bind(userId, email, profile.name || null, profile.picture || null, now, now).run();
    if (!existing) await insertProductEvent(env, userId, "account_created", "account", now, { method: "google" });

    return issueSession(
        userId,
        { id: userId, email, display_name: profile.name, avatar_url: profile.picture, beta_status: "active" },
        request,
        env
    );
}

async function createEmailAccount(body, request, env) {
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email) return json({ error: "Enter a valid email address." }, 400, request, env);
    const passwordError = validatePassword(password);
    if (passwordError) return json({ error: passwordError }, 400, request, env);

    const rateKey = await authRateKey("signup", email, request);
    if (await isRateLimited(rateKey, request, env)) {
        return json({ error: "Too many attempts. Wait 15 minutes and try again." }, 429, request, env);
    }

    const existing = await env.DB.prepare(`
        SELECT users.id, password_credentials.user_id AS password_user_id
        FROM users
        LEFT JOIN password_credentials ON password_credentials.user_id = users.id
        WHERE users.email = ?
    `).bind(email).first();
    if (existing) {
        await recordRateFailure(rateKey, env);
        const message = existing.password_user_id
            ? "An account already exists for this email. Sign in instead."
            : "This email already uses Google sign-in. Continue with Google.";
        return json({ error: message }, 409, request, env);
    }

    const userId = `email:${crypto.randomUUID()}`;
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const passwordHash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
    const now = new Date().toISOString();

    try {
        await env.DB.batch([
            env.DB.prepare(`
                INSERT INTO users (id, email, display_name, avatar_url, created_at, updated_at)
                VALUES (?, ?, NULL, NULL, ?, ?)
            `).bind(userId, email, now, now),
            env.DB.prepare(`
                INSERT INTO password_credentials
                    (user_id, password_hash, password_salt, iterations, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(userId, bytesToBase64(passwordHash), bytesToBase64(salt), PASSWORD_ITERATIONS, now, now)
        ]);
        await insertProductEvent(env, userId, "account_created", "account", now, { method: "email" });
    }
    catch (error) {
        console.error(JSON.stringify({ event: "email_signup_failed", message: String(error?.message || error) }));
        await recordRateFailure(rateKey, env);
        return json({ error: "This email could not be registered. Try signing in instead." }, 409, request, env);
    }

    await clearRateLimit(rateKey, env);
    return issueSession(
        userId,
        { id: userId, email, display_name: null, avatar_url: null, beta_status: "active" },
        request,
        env
    );
}

async function createEmailSession(body, request, env) {
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password || password.length > PASSWORD_MAX_LENGTH) {
        return json({ error: "Email or password is incorrect." }, 401, request, env);
    }

    const rateKey = await authRateKey("login", email, request);
    if (await isRateLimited(rateKey, request, env)) {
        return json({ error: "Too many attempts. Wait 15 minutes and try again." }, 429, request, env);
    }

    const account = await env.DB.prepare(`
        SELECT users.id, users.email, users.display_name, users.avatar_url, users.beta_status,
               password_credentials.password_hash, password_credentials.password_salt,
               password_credentials.iterations
        FROM users
        JOIN password_credentials ON password_credentials.user_id = users.id
        WHERE users.email = ? AND users.beta_status = 'active'
    `).bind(email).first();

    let valid = false;
    if (account?.password_hash && account?.password_salt) {
        const salt = base64ToBytes(account.password_salt);
        const candidate = await derivePasswordHash(password, salt, Number(account.iterations));
        valid = constantTimeEqual(candidate, base64ToBytes(account.password_hash));
    }

    if (!valid) {
        await recordRateFailure(rateKey, env);
        return json({ error: "Email or password is incorrect." }, 401, request, env);
    }

    await clearRateLimit(rateKey, env);
    return issueSession(account.id, account, request, env);
}

async function issueSession(userId, user, request, env) {
    const now = new Date().toISOString();
    const token = createToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    await env.DB.batch([
        env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
        env.DB.prepare("UPDATE users SET last_active_at = ? WHERE id = ?").bind(now, userId),
        env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
            .bind(tokenHash, userId, expiresAt, now)
    ]);
    return json({ token, expiresAt, user: publicUser(user) }, 201, request, env);
}

function normalizeEmail(value) {
    if (typeof value !== "string") return "";
    const email = value.trim().toLowerCase();
    if (email.length < 3 || email.length > 254) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function validatePassword(password) {
    if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    if (password.length > PASSWORD_MAX_LENGTH) return `Password must be no more than ${PASSWORD_MAX_LENGTH} characters.`;
    return "";
}

async function derivePasswordHash(password, salt, iterations) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations },
        key,
        256
    );
    return new Uint8Array(bits);
}

function constantTimeEqual(left, right) {
    const length = Math.max(left.length, right.length);
    let difference = left.length ^ right.length;
    for (let index = 0; index < length; index += 1) {
        difference |= (left[index] || 0) ^ (right[index] || 0);
    }
    return difference === 0;
}

function bytesToBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function authRateKey(purpose, email, request) {
    const address = request.headers.get("CF-Connecting-IP") || "unknown";
    return sha256(`${purpose}|${email}|${address}`);
}

async function isRateLimited(rateKey, request, env) {
    const row = await env.DB.prepare(
        "SELECT attempts, window_started_at FROM auth_rate_limits WHERE rate_key = ?"
    ).bind(rateKey).first();
    if (!row) return false;
    const windowAge = Date.now() - Date.parse(row.window_started_at);
    if (!Number.isFinite(windowAge) || windowAge >= AUTH_RATE_WINDOW_MS) {
        await clearRateLimit(rateKey, env);
        return false;
    }
    return Number(row.attempts) >= AUTH_RATE_MAX_FAILURES;
}

async function recordRateFailure(rateKey, env) {
    const now = new Date().toISOString();
    const row = await env.DB.prepare(
        "SELECT attempts, window_started_at FROM auth_rate_limits WHERE rate_key = ?"
    ).bind(rateKey).first();
    const expired = !row || Date.now() - Date.parse(row.window_started_at) >= AUTH_RATE_WINDOW_MS;
    if (expired) {
        await env.DB.prepare(`
            INSERT INTO auth_rate_limits (rate_key, attempts, window_started_at, updated_at)
            VALUES (?, 1, ?, ?)
            ON CONFLICT(rate_key) DO UPDATE SET
                attempts = 1,
                window_started_at = excluded.window_started_at,
                updated_at = excluded.updated_at
        `).bind(rateKey, now, now).run();
        return;
    }
    await env.DB.prepare(
        "UPDATE auth_rate_limits SET attempts = attempts + 1, updated_at = ? WHERE rate_key = ?"
    ).bind(now, rateKey).run();
}

async function clearRateLimit(rateKey, env) {
    await env.DB.prepare("DELETE FROM auth_rate_limits WHERE rate_key = ?").bind(rateKey).run();
}

async function requireUser(request, env) {
    const token = bearerToken(request);
    if (!token) return null;
    const tokenHash = await sha256(token);
    const row = await env.DB.prepare(`
        SELECT users.id, users.email, users.display_name, users.avatar_url, users.beta_status,
               users.last_active_at
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.beta_status = 'active'
    `).bind(tokenHash, new Date().toISOString()).first();
    return row || null;
}

async function searchUsdaFoods(userId, url, request, env, ctx) {
    const query = String(url.searchParams.get("q") || "").trim().replace(/\s+/g, " ");
    const countryCode = normalizeRestaurantCountry(url.searchParams.get("country"));
    if (query.length < 2) return json({ error: "Enter at least 2 characters." }, 400, request, env);
    if (query.length > 80) return json({ error: "Food search is too long." }, 400, request, env);
    const brandSearch = detectUsdaBrandSearch(query);
    const [verifiedFoods, cachedExternalFoods, liveExternalResult] = await Promise.all([
        searchVerifiedFoods(query, env, countryCode),
        searchExternalFoodCache(query, env),
        fetchOpenFoodFactsSearch(query)
    ]);
    const externalFoods = rankFoodNameMatches(
        mergeFoodResults(cachedExternalFoods, liveExternalResult.foods),
        query,
        brandSearch
    ).slice(0, 8);
    if (liveExternalResult.foods.length) {
        const cacheWrites = Promise.all(liveExternalResult.foods.map(food => writeExternalFoodCache(food.barcode, food, env)));
        if (ctx?.waitUntil) ctx.waitUntil(cacheWrites);
        else await cacheWrites;
    }
    const availableFoods = rankRestaurantFoods(mergeFoodResults(verifiedFoods, externalFoods), query, countryCode).slice(0, 16);
    if (!env.USDA_FDC_API_KEY) {
        if (availableFoods.length) {
            return json({
                foods: availableFoods,
                source: foodSearchSource(verifiedFoods, [], externalFoods),
                warning: "USDA search is not configured; showing available catalogue foods."
            }, 200, request, env);
        }
        return json({ error: "USDA food search is not configured yet." }, 503, request, env);
    }

    const upstreamUrl = usdaFoodSearchUrl(env.USDA_FDC_API_KEY, query, 15);
    const brandUrl = brandSearch
        ? usdaFoodSearchUrl(env.USDA_FDC_API_KEY, brandSearch.usdaQuery, 50, "Branded")
        : null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const brandController = brandUrl ? new AbortController() : null;
    const brandTimeout = brandController ? setTimeout(() => brandController.abort(), 4000) : null;
    let response;
    let brandResponse = null;
    try {
        const generalRequest = fetch(upstreamUrl, {
            headers: { "Accept": "application/json" },
            signal: controller.signal
        });
        const brandRequest = brandUrl
            ? fetch(brandUrl, { headers: { "Accept": "application/json" }, signal: brandController.signal })
                .catch(error => {
                    console.error(JSON.stringify({ event: "usda_brand_search_failed", brand: brandSearch.name, reason: error?.name === "AbortError" ? "timeout" : "network" }));
                    return null;
                })
            : Promise.resolve(null);
        [response, brandResponse] = await Promise.all([generalRequest, brandRequest]);
    }
    catch (error) {
        console.error(JSON.stringify({ event: "usda_food_search_failed", reason: error?.name === "AbortError" ? "timeout" : "network" }));
        if (availableFoods.length) {
            return json({
                foods: availableFoods,
                source: foodSearchSource(verifiedFoods, [], externalFoods),
                warning: "USDA is temporarily unavailable; showing available catalogue foods."
            }, 200, request, env);
        }
        return json({ error: "USDA food search is temporarily unavailable." }, 502, request, env);
    }
    finally {
        clearTimeout(timeout);
        if (brandTimeout) clearTimeout(brandTimeout);
    }

    if (!response.ok) {
        console.error(JSON.stringify({ event: "usda_food_search_failed", status: response.status }));
        if (availableFoods.length) {
            return json({
                foods: availableFoods,
                source: foodSearchSource(verifiedFoods, [], externalFoods),
                warning: "USDA is temporarily unavailable; showing available catalogue foods."
            }, 200, request, env);
        }
        const status = response.status === 429 ? 429 : 502;
        const message = response.status === 429
            ? "USDA search is busy. Wait a moment and try again."
            : "USDA food search is temporarily unavailable.";
        return json({ error: message }, status, request, env);
    }

    const payload = await response.json();
    const searchFoods = Array.isArray(payload?.foods) ? payload.foods : [];
    let brandFoods = [];
    if (brandResponse?.ok && brandSearch) {
        const brandPayload = await brandResponse.json().catch(() => ({}));
        brandFoods = rankUsdaBrandFoods(brandPayload?.foods, query, brandSearch);
    }
    else if (brandResponse && !brandResponse.ok) {
        console.error(JSON.stringify({ event: "usda_brand_search_failed", brand: brandSearch?.name, status: brandResponse.status }));
    }
    const usdaFoods = rankFoodNameMatches(
        dedupeUsdaFoods([...brandFoods, ...searchFoods].map(normalizeUsdaFood).filter(Boolean)),
        query,
        brandSearch
    );
    const foods = rankRestaurantFoods(mergeFoodResults(verifiedFoods, usdaFoods, externalFoods), query, countryCode).slice(0, 16);
    const missWrite = recordFoodSearchCoverage(userId, query, countryCode, foods.length, verifiedFoods.length, env);
    if (ctx?.waitUntil) ctx.waitUntil(missWrite);
    else await missWrite;
    return json({
        foods,
        source: foodSearchSource(verifiedFoods, usdaFoods, externalFoods)
    }, 200, request, env);
}

function foodSearchSource(verifiedFoods, usdaFoods, externalFoods) {
    const sources = [];
    if (verifiedFoods.length) sources.push("Level Up Verified");
    if (usdaFoods.length) sources.push("USDA FoodData Central");
    if (externalFoods.length) sources.push("Open Food Facts");
    return sources.join(" + ");
}

async function getFoodByBarcode(value, request, env, ctx) {
    const barcode = normalizeBarcode(value);
    if (!isValidBarcode(barcode)) {
        return json({ error: "Enter a valid 8, 12, 13, or 14 digit barcode." }, 400, request, env);
    }

    const verifiedFood = await findVerifiedFoodByBarcode(barcode, env);
    if (verifiedFood) {
        return json({ food: verifiedFood, source: "Level Up Verified", barcode }, 200, request, env);
    }

    const cachedFood = await readExternalFoodCache(barcode, env);
    if (cachedFood) {
        return json({ food: cachedFood, source: cachedFood.provenance?.sourceName || "External food catalogue", barcode, cached: true }, 200, request, env);
    }

    const openFoodFactsResult = await fetchOpenFoodFactsBarcode(barcode);
    if (openFoodFactsResult.food) {
        const cacheWrite = writeExternalFoodCache(barcode, openFoodFactsResult.food, env);
        if (ctx?.waitUntil) ctx.waitUntil(cacheWrite);
        else await cacheWrite;
        return json({ food: openFoodFactsResult.food, source: "Open Food Facts", barcode }, 200, request, env);
    }
    if (!env.USDA_FDC_API_KEY) {
        if (!openFoodFactsResult.ok) return json({ error: "Barcode lookup is temporarily unavailable.", barcode }, 502, request, env);
        return json({ error: "Product not found.", barcode }, 404, request, env);
    }

    const queries = barcodeVariants(barcode);
    try {
        const firstResult = await fetchUsdaBarcodeVariant(env.USDA_FDC_API_KEY, queries[0]);
        const firstFood = firstResult.ok ? selectExactUsdaBarcodeFood(firstResult.foods, barcode) : null;
        const remainingResults = firstFood || queries.length === 1
            ? []
            : await Promise.all(queries.slice(1).map(query => fetchUsdaBarcodeVariant(env.USDA_FDC_API_KEY, query)));
        const results = [firstResult, ...remainingResults];
        const rawFood = firstFood || selectExactUsdaBarcodeFood(results.flatMap(result => result.ok ? result.foods : []), barcode);
        const normalizedFood = rawFood ? normalizeUsdaFood(rawFood) : null;
        const food = normalizedFood ? { ...normalizedFood, detailsLoaded: true } : null;
        if (!food) {
            const failures = results.filter(result => !result.ok);
            if (failures.length) {
                const busy = failures.some(result => result.status === 429);
                console.error(JSON.stringify({ event: "usda_barcode_lookup_incomplete", barcodeLength: barcode.length, queries: queries.length, failures: failures.map(result => result.status || result.reason) }));
                return json({ error: busy ? "USDA lookup is busy. Wait a moment and try again." : "Barcode lookup is temporarily unavailable." }, busy ? 429 : 502, request, env);
            }
            return json({ error: "Product not found.", barcode }, 404, request, env);
        }
        return json({ food, source: "USDA FoodData Central", barcode }, 200, request, env);
    }
    catch (error) {
        console.error(JSON.stringify({ event: "usda_barcode_lookup_failed", reason: error?.name === "AbortError" ? "timeout" : "network", barcodeLength: barcode.length }));
        return json({ error: "Barcode lookup is temporarily unavailable." }, 502, request, env);
    }
}

const OPEN_FOOD_FACTS_CACHE_DAYS = 30;
const OPEN_FOOD_FACTS_CACHE_SCHEMA = 2;
const OPEN_FOOD_FACTS_USER_AGENT = "LevelUpHypertrophy/1.0 (support@leveluphypertrophy.com)";

async function fetchOpenFoodFactsBarcode(barcode) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const url = new URL(`https://world.openfoodfacts.org/api/v3.6/product/${encodeURIComponent(barcode)}.json`);
    url.searchParams.set("fields", [
        "code", "product_name", "product_name_en", "generic_name", "generic_name_en",
        "brands", "categories", "countries_tags", "quantity", "serving_size",
        "serving_quantity", "nutrition_data_per", "nutrition", "nutriments"
    ].join(","));
    try {
        const response = await fetch(url, {
            headers: { "Accept": "application/json", "User-Agent": OPEN_FOOD_FACTS_USER_AGENT },
            signal: controller.signal
        });
        if (response.status === 404) return { ok: true, food: null, status: response.status };
        if (!response.ok) {
            console.info(JSON.stringify({ event: "open_food_facts_barcode_unavailable", status: response.status, barcodeLength: barcode.length }));
            return { ok: false, food: null, status: response.status };
        }
        const payload = await response.json();
        return { ok: true, food: normalizeOpenFoodFactsProduct(payload?.product, barcode), status: response.status };
    }
    catch (error) {
        console.info(JSON.stringify({ event: "open_food_facts_barcode_unavailable", reason: error?.name === "AbortError" ? "timeout" : "network", barcodeLength: barcode.length }));
        return { ok: false, food: null, status: 0 };
    }
    finally {
        clearTimeout(timeout);
    }
}

async function fetchOpenFoodFactsSearch(query) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", "10");
    url.searchParams.set("fields", [
        "code", "product_name", "product_name_en", "generic_name", "generic_name_en",
        "brands", "categories", "countries_tags", "quantity", "serving_size",
        "serving_quantity", "nutrition_data_per", "nutriments"
    ].join(","));
    try {
        const response = await fetch(url, {
            headers: { "Accept": "application/json", "User-Agent": OPEN_FOOD_FACTS_USER_AGENT },
            signal: controller.signal
        });
        if (!response.ok) {
            console.info(JSON.stringify({ event: "open_food_facts_search_unavailable", status: response.status }));
            return { ok: false, foods: [], status: response.status };
        }
        const payload = await response.json();
        return { ok: true, foods: normalizeOpenFoodFactsSearchProducts(payload), status: response.status };
    }
    catch (error) {
        console.info(JSON.stringify({ event: "open_food_facts_search_unavailable", reason: error?.name === "AbortError" ? "timeout" : "network" }));
        return { ok: false, foods: [], status: 0 };
    }
    finally {
        clearTimeout(timeout);
    }
}

export function normalizeOpenFoodFactsSearchProducts(payload) {
    return mergeFoodResults((Array.isArray(payload?.products) ? payload.products : [])
        .map(product => normalizeOpenFoodFactsProduct(product, product?.code))
        .filter(Boolean));
}

export function normalizeOpenFoodFactsProduct(product, barcode) {
    const normalizedBarcode = normalizeBarcode(product?.code || barcode);
    const name = limitedText(product?.product_name_en || product?.product_name || product?.generic_name_en || product?.generic_name, 180);
    if (!isValidBarcode(normalizedBarcode) || !name) return null;

    const inputSets = Array.isArray(product?.nutrition?.input_sets) ? product.nutrition.input_sets : [];
    const packagingSets = inputSets.filter(set => set?.source === "packaging" && (!set?.preparation || set.preparation === "as_sold"));
    const servingSet = packagingSets.find(set => set?.per === "serving" && openFoodFactsSetNutrition(set).calories > 0);
    const hundredGramSet = packagingSets.find(set => set?.per === "100g" && openFoodFactsSetNutrition(set).calories > 0);
    const legacyNutriments = product?.nutriments && typeof product.nutriments === "object" ? product.nutriments : {};
    const legacyPer100 = {
        calories: openFoodFactsNutrient(legacyNutriments, "energy-kcal_100g"),
        protein: openFoodFactsNutrient(legacyNutriments, "proteins_100g"),
        carbs: openFoodFactsNutrient(legacyNutriments, "carbohydrates_100g"),
        fat: openFoodFactsNutrient(legacyNutriments, "fat_100g"),
        fiber: openFoodFactsNutrient(legacyNutriments, "fiber_100g")
    };
    const legacyPerServing = {
        calories: openFoodFactsNutrient(legacyNutriments, "energy-kcal_serving"),
        protein: openFoodFactsNutrient(legacyNutriments, "proteins_serving"),
        carbs: openFoodFactsNutrient(legacyNutriments, "carbohydrates_serving"),
        fat: openFoodFactsNutrient(legacyNutriments, "fat_serving"),
        fiber: openFoodFactsNutrient(legacyNutriments, "fiber_serving")
    };
    const explicitPer100 = hundredGramSet ? openFoodFactsSetNutrition(hundredGramSet) : legacyPer100;
    const perServing = servingSet ? openFoodFactsSetNutrition(servingSet) : legacyPerServing;
    const servingSize = limitedText(product?.serving_size, 80);
    const servingGrams = openFoodFactsServingGrams(product?.serving_quantity || servingSet?.per_quantity, servingSize);
    const per100 = explicitPer100.calories > 0
        ? explicitPer100
        : servingGrams > 0 && perServing.calories > 0
            ? scaleUsdaNutrition(perServing, 100 / servingGrams)
            : legacyPer100;
    if (!(per100.calories > 0) && !(perServing.calories > 0)) return null;
    const portions = [];
    if (servingGrams > 0 && per100.calories > 0) {
        portions.push({
            label: foodServingLabel(servingSize || "1 serving", servingGrams),
            grams: servingGrams,
            nutrition: perServing.calories > 0 ? perServing : scaleUsdaNutrition(per100, servingGrams / 100)
        });
    }
    else if (perServing.calories > 0) {
        portions.push({ label: servingSize || "1 serving", nutrition: perServing });
    }
    if (per100.calories > 0 && Math.abs(servingGrams - 100) > .01) {
        portions.push({ label: "100 g", grams: 100, nutrition: per100 });
    }
    if (!portions.length) return null;

    const countries = Array.isArray(product?.countries_tags) ? product.countries_tags : [];
    const countryCode = countries.includes("en:canada") ? "CA" : countries.includes("en:united-states") ? "US" : "";
    return {
        source: "openfoodfacts",
        barcode: normalizedBarcode,
        name,
        brand: limitedText(String(product?.brands || "").split(",")[0], 120),
        dataType: "Open Food Facts (community)",
        category: limitedText(String(product?.categories || "").split(",")[0], 100),
        countryCode,
        provenance: {
            sourceName: "Open Food Facts",
            sourceUrl: `https://world.openfoodfacts.org/product/${normalizedBarcode}`,
            verifiedAt: ""
        },
        detailsLoaded: true,
        portions: addUsefulGramPortions(portions)
    };
}

function openFoodFactsNutrient(nutriments, key) {
    const value = Number(nutriments?.[key]);
    return Number.isFinite(value) && value >= 0 ? Number(value.toFixed(3)) : 0;
}

function openFoodFactsSetNutrition(set) {
    const nutrients = set?.nutrients && typeof set.nutrients === "object" ? set.nutrients : {};
    const read = key => {
        const nutrient = nutrients?.[key];
        const value = Number(nutrient?.value);
        const unit = String(nutrient?.unit || "").toLowerCase();
        if (!Number.isFinite(value) || value < 0) return 0;
        if (key === "energy-kcal") return unit === "kj" ? Number((value / 4.184).toFixed(3)) : Number(value.toFixed(3));
        if (unit === "mg") return Number((value / 1000).toFixed(3));
        return Number(value.toFixed(3));
    };
    return {
        calories: read("energy-kcal"),
        protein: read("proteins"),
        carbs: read("carbohydrates"),
        fat: read("fat"),
        fiber: read("fiber")
    };
}

function openFoodFactsServingGrams(value, label) {
    const labelMatch = String(label || "").match(/(?:^|\s|\()([\d.]+)\s*g(?:\s|\)|$)/i);
    const labelGrams = Number(labelMatch?.[1]);
    if (Number.isFinite(labelGrams) && labelGrams > 0) return labelGrams;
    const quantity = Number(value);
    if (Number.isFinite(quantity) && quantity > 0) return quantity;
    return 0;
}

async function readExternalFoodCache(barcode, env) {
    if (!env?.DB) return null;
    try {
        const row = await env.DB.prepare(`
            SELECT food_json
            FROM external_food_barcode_cache
            WHERE barcode = ? AND expires_at > ?
            LIMIT 1
        `).bind(barcode, new Date().toISOString()).first();
        if (!row?.food_json) return null;
        const food = JSON.parse(row.food_json);
        if (food?.cacheSchema !== OPEN_FOOD_FACTS_CACHE_SCHEMA || !food?.barcode || !Array.isArray(food?.portions)) return null;
        const portions = food.portions.map(portion => ({
            ...portion,
            label: foodServingLabel(portion?.label, portion?.grams)
        }));
        const { cacheSchema, ...publicFood } = food;
        return { ...publicFood, portions: addUsefulGramPortions(portions) };
    }
    catch (error) {
        console.info(JSON.stringify({ event: "external_food_cache_read_unavailable", reason: String(error?.message || error) }));
        return null;
    }
}

async function searchExternalFoodCache(query, env) {
    if (!env?.DB) return [];
    try {
        const result = await env.DB.prepare(`
            SELECT food_json
            FROM external_food_barcode_cache
            WHERE expires_at > ?
            ORDER BY updated_at DESC
            LIMIT 200
        `).bind(new Date().toISOString()).all();
        return searchCachedExternalFoods(result?.results, query).slice(0, 8);
    }
    catch (error) {
        console.info(JSON.stringify({ event: "external_food_cache_search_unavailable", reason: String(error?.message || error) }));
        return [];
    }
}

export function searchCachedExternalFoods(rows, query) {
    const tokens = foodIdentity(query).split(" ").filter(token => token.length > 1);
    if (!tokens.length) return [];
    const foods = (Array.isArray(rows) ? rows : []).map(row => {
        try {
            return typeof row?.food_json === "string" ? JSON.parse(row.food_json) : row?.food_json;
        }
        catch {
            return null;
        }
    }).filter(food => {
        if (food?.cacheSchema !== OPEN_FOOD_FACTS_CACHE_SCHEMA || !food?.name || !food?.barcode || !Array.isArray(food?.portions)) return false;
        const searchable = foodIdentity(`${food.name} ${food.brand || ""}`);
        return tokens.every(token => searchable.includes(token));
    }).map(food => {
        const portions = food.portions.map(portion => ({
            ...portion,
            label: foodServingLabel(portion?.label, portion?.grams)
        }));
        const { cacheSchema, ...publicFood } = food;
        return { ...publicFood, portions: addUsefulGramPortions(portions) };
    });
    return mergeFoodResults(foods);
}

async function writeExternalFoodCache(barcode, food, env) {
    if (!env?.DB || !food) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OPEN_FOOD_FACTS_CACHE_DAYS * 86400000).toISOString();
    try {
        await env.DB.prepare(`
            INSERT INTO external_food_barcode_cache (barcode, source, food_json, expires_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(barcode) DO UPDATE SET
                source = excluded.source,
                food_json = excluded.food_json,
                expires_at = excluded.expires_at,
                updated_at = excluded.updated_at
        `).bind(barcode, "openfoodfacts", JSON.stringify({ ...food, cacheSchema: OPEN_FOOD_FACTS_CACHE_SCHEMA }), expiresAt, now.toISOString(), now.toISOString()).run();
    }
    catch (error) {
        console.info(JSON.stringify({ event: "external_food_cache_write_unavailable", reason: String(error?.message || error) }));
    }
}

async function fetchUsdaBarcodeVariant(apiKey, query) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
        const response = await fetch(usdaFoodSearchUrl(apiKey, query, 50, "Branded"), {
            headers: { "Accept": "application/json" },
            signal: controller.signal
        });
        if (!response.ok) return { ok: false, status: response.status, foods: [] };
        const payload = await response.json();
        return { ok: true, status: response.status, foods: Array.isArray(payload?.foods) ? payload.foods : [] };
    }
    catch (error) {
        return { ok: false, status: 0, reason: error?.name === "AbortError" ? "timeout" : "network", foods: [] };
    }
    finally {
        clearTimeout(timeout);
    }
}

async function findVerifiedFoodByBarcode(barcode, env) {
    const candidates = barcodeVariants(barcode);
    if (!candidates.length) return null;
    if (env?.DB) {
        const placeholders = candidates.map(() => "?").join(",");
        try {
            const row = await env.DB.prepare(`
                SELECT id, name, brand, category, country_code, barcode, product_family_id, serving_label,
                       serving_grams, calories, protein_g, carbs_g, fat_g, fiber_g,
                       source_name, source_url, verified_at
                FROM verified_foods
                WHERE status = 'active' AND barcode IN (${placeholders})
                LIMIT 1
            `).bind(...candidates).first();
            if (row) return normalizeVerifiedFood(row);
        }
        catch (error) {
            console.error(JSON.stringify({ event: "verified_food_barcode_failed", reason: String(error?.message || error) }));
        }
        try {
            const row = await env.DB.prepare(`
                SELECT vf.id, vf.name, vf.brand, vf.category, vf.country_code,
                       COALESCE(vf.barcode, vfb.barcode) AS barcode, vf.product_family_id, vf.serving_label,
                       vf.serving_grams, vf.calories, vf.protein_g, vf.carbs_g,
                       vf.fat_g, vf.fiber_g, vf.source_name, vf.source_url, vf.verified_at
                FROM verified_food_barcodes vfb
                JOIN verified_foods vf ON vf.id = vfb.food_id
                WHERE vf.status = 'active' AND vfb.barcode IN (${placeholders})
                ORDER BY vfb.is_primary DESC
                LIMIT 1
            `).bind(...candidates).first();
            if (row) return normalizeVerifiedFood(row);
        }
        catch (error) {
            console.info(JSON.stringify({ event: "verified_food_barcode_alias_unavailable", reason: String(error?.message || error) }));
        }
    }
    return findBundledVerifiedFoodByBarcode(barcode);
}

export function normalizeBarcode(value) {
    return String(value || "").replace(/\D/g, "");
}

export function isValidBarcode(value) {
    const barcode = normalizeBarcode(value);
    if (![8, 12, 13, 14].includes(barcode.length) || /^0+$/.test(barcode)) return false;
    const digits = [...barcode].map(Number);
    const checkDigit = digits.pop();
    const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === checkDigit;
}

export function barcodeVariants(value) {
    const barcode = normalizeBarcode(value);
    if (![8, 12, 13, 14].includes(barcode.length)) return [];
    const variants = new Set([barcode]);
    if (barcode.length === 12) {
        variants.add(`0${barcode}`);
        variants.add(`00${barcode}`);
    }
    if (barcode.length === 13) {
        variants.add(`0${barcode}`);
        if (barcode.startsWith("0")) variants.add(barcode.slice(1));
    }
    if (barcode.length === 14 && barcode.startsWith("0")) {
        variants.add(barcode.slice(1));
        if (barcode.startsWith("00")) variants.add(barcode.slice(2));
    }
    return [...variants];
}

export function selectExactUsdaBarcodeFood(foods, barcode) {
    const variants = new Set(barcodeVariants(barcode));
    return (Array.isArray(foods) ? foods : [])
        .filter(food => barcodeVariants(food?.gtinUpc).some(candidate => variants.has(candidate)))
        .sort((a, b) => usdaBarcodeFoodQuality(b) - usdaBarcodeFoodQuality(a))[0] || null;
}

function usdaBarcodeFoodQuality(food) {
    const serving = Number(food?.servingSize) > 0 ? 20 : 0;
    const labelled = food?.labelNutrients ? 15 : 0;
    const branded = food?.brandName ? 5 : 0;
    const published = Date.parse(food?.publicationDate || food?.availableDate || "") || 0;
    return serving + labelled + branded + published / 1e13;
}

function usdaFoodSearchUrl(apiKey, query, pageSize, dataType = "") {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("pageNumber", "1");
    if (dataType) url.searchParams.set("dataType", dataType);
    return url;
}

const USDA_BRAND_SEARCHES = [
    { name: "Grenade", usdaQuery: "Grenade", aliases: ["grenade", "carb killa"] },
    { name: "Kirkland Signature", usdaQuery: "Kirkland Signature", aliases: ["kirkland", "kirkland signature"] },
    { name: "McDonald's", usdaQuery: "McDonald's", aliases: ["mcdonald", "mcdonalds", "mcdonald's"] },
    { name: "Swiss Chalet", usdaQuery: "Swiss Chalet", aliases: ["swiss chalet", "swisschalet"] },
    { name: "Pür & Simple", usdaQuery: "Pür & Simple", aliases: ["pür & simple", "pur & simple", "pür simple", "pur simple", "pursimple"] },
    ...NORTH_AMERICAN_CHAIN_FOODS.reduce((brands, food) => {
        if (brands.some(brand => brand.name === food.brand)) return brands;
        const normalized = food.brand.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        brands.push({ name: food.brand, usdaQuery: food.brand, aliases: [normalized, normalized.replace(/ /g, "")] });
        return brands;
    }, []),
    { name: "Built", usdaQuery: "Built Bar", aliases: ["built bar", "built puff"] }
];

export function detectUsdaBrandSearch(query) {
    const identity = foodIdentity(query);
    return USDA_BRAND_SEARCHES.find(brand => brand.aliases.some(alias => identity.includes(foodIdentity(alias)))) || null;
}

export function rankUsdaBrandFoods(foods, query, brandSearch) {
    if (!brandSearch) return [];
    const brandIdentity = foodIdentity(brandSearch.name);
    const brandTokens = new Set(brandSearch.aliases.flatMap(alias => foodIdentity(alias).split(" ")));
    const queryTokens = foodIdentity(query).split(" ").filter(token => token.length > 1 && !brandTokens.has(token));
    return (Array.isArray(foods) ? foods : [])
        .map((food, index) => ({ food, index, score: usdaBrandFoodScore(food, brandIdentity, queryTokens) }))
        .filter(item => Number.isFinite(item.score))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(item => item.food);
}

export function rankFoodNameMatches(foods, query, brandSearch = detectUsdaBrandSearch(query)) {
    const queryIdentity = foodIdentity(query);
    const queryTokens = queryIdentity.split(" ").filter(token => token.length > 1);
    if (!queryTokens.length) return [];
    const brandTokens = new Set(brandSearch
        ? brandSearch.aliases.flatMap(alias => foodIdentity(alias).split(" ")).filter(token => token.length > 1)
        : []);
    const productTokens = brandSearch ? queryTokens.filter(token => !brandTokens.has(token)) : queryTokens;
    const expectedBrand = foodIdentity(brandSearch?.name);

    return (Array.isArray(foods) ? foods : [])
        .map((food, index) => {
            const name = foodIdentity(food?.name);
            const brand = foodIdentity(food?.brand);
            const brandMatches = !brandSearch || brand === expectedBrand || brand.startsWith(`${expectedBrand} `) || expectedBrand.startsWith(`${brand} `);
            const nameMatches = productTokens.length
                ? productTokens.every(token => name.includes(token))
                : Boolean(brandSearch && brandMatches);
            if (!name || !nameMatches || !brandMatches) return null;
            const exact = name === queryIdentity ? 100 : 0;
            const prefix = name.startsWith(`${queryIdentity} `) || queryIdentity.startsWith(`${name} `) ? 60 : 0;
            const phrase = name.includes(queryIdentity) ? 40 : 0;
            const tokenStart = productTokens.reduce((score, token) => score + (name.startsWith(token) ? 4 : 0), 0);
            return { food, index, score: exact + prefix + phrase + tokenStart };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(item => item.food);
}

function usdaBrandFoodScore(food, brandIdentity, queryTokens) {
    const brandValues = [food?.brandName, food?.brandOwner].map(foodIdentity).filter(Boolean);
    const brandMatches = brandValues.some(value => value === brandIdentity || value.startsWith(`${brandIdentity} `));
    if (!brandMatches) return Number.NEGATIVE_INFINITY;
    const description = foodIdentity(`${food?.description || ""} ${food?.subbrandName || ""} ${food?.foodCategory || ""}`);
    const tokenMatches = queryTokens.reduce((score, token) => score + (description.includes(token) ? 8 : 0), 0);
    const allTokensMatch = queryTokens.length && queryTokens.every(token => description.includes(token));
    const brandedBar = /snack|energy|granola|protein bar/.test(description);
    return 20 + tokenMatches + (allTokensMatch ? 15 : 0) + (brandedBar ? 5 : 0);
}

async function searchVerifiedFoods(query, env, countryCode = "CA") {
    if (!env?.DB) return [];
    const normalizedQuery = foodIdentity(query);
    if (!normalizedQuery) return [];
    const allTokens = normalizedQuery.split(" ").filter(Boolean).slice(0, 6);
    const searchTokens = allTokens.filter(token => token.length > 1);
    const tokens = searchTokens.length ? searchTokens : allTokens;
    const tokenFilters = tokens.map(() => "instr(search_text, ?) > 0").join(" AND ");
    let storedFoods = [];
    try {
        const result = await env.DB.prepare(`
            SELECT id, name, brand, category, country_code, barcode, product_family_id, serving_label,
                   serving_grams, calories, protein_g, carbs_g, fat_g, fiber_g,
                   source_name, source_url, verified_at, source_type, verification_status,
                   nutrition_scope, serving_type, popularity_score, last_checked_at, next_review_at
            FROM verified_foods
            WHERE status = 'active' AND verification_status = 'verified' AND ${tokenFilters}
            ORDER BY CASE
                WHEN country_code = ? THEN 0
                ELSE 1
            END, CASE
                WHEN lower(name) = ? THEN 0
                WHEN search_text LIKE ? THEN 1
                ELSE 2
            END, popularity_score DESC, brand, name
            LIMIT 12
        `).bind(...tokens, countryCode, query.toLowerCase(), `${normalizedQuery}%`).all();
        storedFoods = (Array.isArray(result?.results) ? result.results : []).map(normalizeVerifiedFood).filter(Boolean);
    }
    catch (error) {
        console.error(JSON.stringify({ event: "verified_food_search_failed", reason: String(error?.message || error) }));
    }
    return rankRestaurantFoods(rankFoodNameMatches(mergeFoodResults(storedFoods, searchBundledVerifiedFoods(query)), query), query, countryCode).slice(0, 8);
}

export function normalizeVerifiedFood(row) {
    const id = limitedText(row?.id, 100);
    const name = limitedText(row?.name, 180);
    if (!id || !name) return null;
    const nutrition = {
        calories: safeFoodNumber(row?.calories),
        protein: safeFoodNumber(row?.protein_g),
        carbs: safeFoodNumber(row?.carbs_g),
        fat: safeFoodNumber(row?.fat_g),
        fiber: safeFoodNumber(row?.fiber_g)
    };
    const servingGrams = Number(row?.serving_grams);
    const portions = [{
        label: foodServingLabel(limitedText(row?.serving_label, 80) || "1 serving", servingGrams),
        ...(Number.isFinite(servingGrams) && servingGrams > 0 ? { grams: servingGrams } : {}),
        nutrition
    }];
    if (Number.isFinite(servingGrams) && servingGrams > 0 && Math.abs(servingGrams - 100) > .01) {
        portions.push({ label: "100 g", grams: 100, nutrition: scaleUsdaNutrition(nutrition, 100 / servingGrams) });
    }
    return {
        source: "levelup",
        catalogueId: id,
        productFamilyId: limitedText(row?.product_family_id, 100),
        name,
        brand: limitedText(row?.brand, 120),
        dataType: String(limitedText(row?.category, 100) || "").toLowerCase() === "restaurant food" ? "Verified restaurant item" : "Level Up Verified",
        category: limitedText(row?.category, 100),
        countryCode: limitedText(row?.country_code, 8),
        barcode: limitedText(row?.barcode, 40),
        provenance: {
            sourceName: limitedText(row?.source_name, 120),
            sourceUrl: limitedText(row?.source_url, 500),
            verifiedAt: limitedText(row?.verified_at, 32),
            sourceType: limitedText(row?.source_type, 40) || "official_restaurant",
            verificationStatus: limitedText(row?.verification_status, 40) || "verified",
            nutritionScope: limitedText(row?.nutrition_scope, 40) || (nutrition.protein || nutrition.carbs || nutrition.fat ? "full" : "calories_only"),
            lastCheckedAt: limitedText(row?.last_checked_at, 32) || limitedText(row?.verified_at, 32),
            nextReviewAt: limitedText(row?.next_review_at, 32)
        },
        popularityScore: safeFoodNumber(row?.popularity_score),
        detailsLoaded: true,
        portions: addUsefulGramPortions(portions)
    };
}

export function mergeFoodResults(...foodGroups) {
    const merged = [];
    const identities = new Set();
    const verifiedBaseIdentities = new Set();
    foodGroups.flatMap(group => Array.isArray(group) ? group : []).forEach(food => {
        if (!food) return;
        const baseIdentity = `${foodIdentity(food.name)}|${foodIdentity(food.brand)}`;
        if (food?.source !== "levelup" && verifiedBaseIdentities.has(baseIdentity)) return;
        const region = food?.source === "levelup" ? foodIdentity(food.countryCode || "global") : "external";
        const serving = food?.source === "levelup" ? foodIdentity(food.portions?.[0]?.label || "serving") : "";
        const identity = `${baseIdentity}|${region}|${serving}`;
        if (identities.has(identity)) return;
        identities.add(identity);
        if (food?.source === "levelup") verifiedBaseIdentities.add(baseIdentity);
        merged.push(food);
    });
    return merged;
}

export function rankRestaurantFoods(foods, query, countryCode = "CA") {
    const queryIdentity = foodIdentity(query);
    return (Array.isArray(foods) ? foods : []).map((food, index) => {
        const name = foodIdentity(food?.name);
        const brand = foodIdentity(food?.brand);
        let score = Math.max(0, 200 - index);
        if (name === queryIdentity || `${brand} ${name}` === queryIdentity) score += 120;
        else if (name.startsWith(queryIdentity) || brand.startsWith(queryIdentity)) score += 60;
        if (food?.source === "levelup") score += 40;
        if (food?.countryCode === countryCode) score += 35;
        if (food?.provenance?.verificationStatus === "verified") score += 20;
        score += Math.min(30, Number(food?.popularityScore) || 0);
        return { food, index, score };
    }).sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.food);
}

function safeFoodNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

export function searchBundledVerifiedFoods(query) {
    const allTokens = foodIdentity(query).split(" ").filter(Boolean);
    const significantTokens = allTokens.filter(token => token.length > 1);
    const tokens = significantTokens.length ? significantTokens : allTokens;
    if (!tokens.length) return [];
    return BUNDLED_VERIFIED_FOODS.filter(food => {
        const searchable = foodIdentity(`${food.name} ${food.brand} ${food.aliases || ""}`);
        return tokens.every(token => searchable.includes(token));
    }).map(({ aliases, barcodeAliases, ...food }) => food);
}

export function findBundledVerifiedFoodByBarcode(barcode) {
    const candidates = new Set(barcodeVariants(barcode));
    if (!candidates.size) return null;
    const food = BUNDLED_VERIFIED_FOODS.find(item => [item.barcode, ...(item.barcodeAliases || [])]
        .some(storedBarcode => barcodeVariants(storedBarcode).some(candidate => candidates.has(candidate))));
    if (!food) return null;
    const { aliases, barcodeAliases, ...publicFood } = food;
    return publicFood;
}

const BUNDLED_VERIFIED_FOODS = [
    bundledVerifiedFood({ id: "mcd-ca-hamburger", name: "Hamburger", brand: "McDonald's", aliases: "mcdonald burger", label: "1 burger (100 g)", grams: 100, calories: 240, protein: 12, carbs: 32, fat: 8, fiber: 2, sourceUrl: "https://www.mcdonalds.com/ca/en-ca/product/hamburger.html" }),
    bundledVerifiedFood({ id: "mcd-ca-cheeseburger", name: "Cheeseburger", brand: "McDonald's", aliases: "mcdonald burger cheese", label: "1 burger (113 g)", grams: 113, calories: 290, protein: 14, carbs: 32, fat: 12, fiber: 2, sourceUrl: "https://www.mcdonalds.com/ca/en-ca/product/cheeseburger.html" }),
    bundledVerifiedFood({ id: "mcd-ca-big-mac", name: "Big Mac", brand: "McDonald's", aliases: "mcdonald burger", label: "1 burger (216 g)", grams: 216, calories: 570, protein: 24, carbs: 46, fat: 32, sourceUrl: "https://www.mcdonalds.com/ca/en-ca/product/big-mac-sandwich.html" }),
    bundledVerifiedFood({ id: "mcd-ca-quarter-pounder-no-cheese", name: "Quarter Pounder without Cheese", brand: "McDonald's", aliases: "mcdonald burger", label: "1 burger", calories: 430, protein: 24, carbs: 40, fat: 20, sourceUrl: "https://www.mcdonalds.com/ca/en-ca/product/quarter-pounder-without-cheese.html" }),
    bundledVerifiedFood({ id: "mcd-ca-double-quarter-cheese", name: "Double Quarter Pounder with Cheese", brand: "McDonald's", aliases: "mcdonald burger", label: "1 burger", calories: 750, protein: 47, carbs: 47, fat: 44, sourceUrl: "https://www.mcdonalds.com/ca/en-ca/product/double-quarter-pounder-with-cheese.html" }),
    bundledVerifiedFood({ id: "mcd-ca-hash-brown", name: "Hash Brown", brand: "McDonald's", aliases: "hashbrown mcdonald breakfast", label: "1 hash brown (55 g)", grams: 55, calories: 160, protein: 1, carbs: 16, fat: 10, sourceUrl: "https://www.mcdonalds.com/ca/en-ca/product/hash-browns.html" }),
    bundledVerifiedFood({ id: "grenade-cookie-dough-60g", name: "Chocolate Chip Cookie Dough Protein Bar", brand: "Grenade", aliases: "carb killa", label: "1 bar (60 g)", grams: 60, calories: 208, protein: 21, carbs: 18, fat: 7.8, fiber: 2.7, sourceUrl: "https://www.grenade.com/products/protein-bar-cookie-dough" }),
    bundledVerifiedFood({ id: "grenade-peanut-nutter-60g", name: "Peanut Nutter Protein Bar", brand: "Grenade", aliases: "carb killa peanut butter", label: "1 bar (60 g)", grams: 60, calories: 214, protein: 20, carbs: 18, fat: 9.1, fiber: 5.6, sourceUrl: "https://www.grenade.com/products/protein-bar-peanut-nutter" }),
    bundledVerifiedFood({ id: "grenade-salted-caramel-ca-60g", productFamilyId: "grenade-salted-caramel-60g", name: "Chocolate Chip Salted Caramel Protein Bar", brand: "Grenade", aliases: "carb killa salted caramel chocolate chip", barcode: "847534004261", label: "1 bar (60 g)", grams: 60, calories: 240, protein: 21, carbs: 22, fat: 9, fiber: 2, sourceName: "Canadian package label via Open Food Facts", sourceUrl: "https://world.openfoodfacts.org/product/0847534004261" }),
    bundledVerifiedFood({ id: "grenade-salted-caramel-us-60g", productFamilyId: "grenade-salted-caramel-60g", name: "Chocolate Chip Salted Caramel Protein Bar", brand: "Grenade", aliases: "carb killa salted caramel chocolate chip", barcode: "847534004063", label: "1 bar (60 g)", grams: 60, calories: 230, protein: 20, carbs: 23, fat: 10, fiber: 3, sourceName: "USDA FoodData Central", sourceUrl: "https://fdc.nal.usda.gov/food-details/2387796/nutrients" }),
    ...SWISS_CHALET_FOODS.map(food => bundledVerifiedFood({
        ...food,
        brand: "Swiss Chalet",
        aliases: "swiss chalet swisschalet restaurant canada",
        label: `1 serving (${food.grams} g)`,
        category: "Restaurant food",
        sourceName: "Swiss Chalet Canada",
        sourceUrl: "https://www.swisschalet.com/en/nutritional.html",
        verifiedAt: "2026-08-29"
    })),
    ...PUR_SIMPLE_FOODS.map(food => bundledVerifiedFood({
        ...food,
        brand: "Pür & Simple",
        aliases: "pür simple pur simple pursimple restaurant canada breakfast brunch avocado toast",
        label: "1 order",
        category: "Restaurant food",
        sourceName: "Pür & Simple Canada",
        sourceUrl: "https://pursimple.com/wp-content/uploads/2026/02/PS-Nutrition-Guide-English-2026-1.pdf",
        verifiedAt: "2026-08-30"
    })),
    ...NORTH_AMERICAN_CHAIN_FOODS.map(food => bundledVerifiedFood({
        ...food,
        category: "Restaurant food",
        verifiedAt: "2026-08-30"
    })),
    ...CANADIAN_CHAIN_EXPANSION.map(food => bundledVerifiedFood({
        ...food,
        category: "Restaurant food",
        verifiedAt: "2026-08-31"
    }))
];

function bundledVerifiedFood({ id, productFamilyId = "", name, brand, aliases, barcode = "", barcodeAliases = [], label, grams, calories, protein, carbs, fat, fiber = 0, category = "", countryCode = "CA", sourceName = "", sourceUrl, verifiedAt = "2026-08-27" }) {
    const nutrition = { calories, protein, carbs, fat, fiber };
    const portions = [{ label: foodServingLabel(label, grams), ...(grams ? { grams } : {}), nutrition }];
    if (grams && Math.abs(grams - 100) > .01) {
        portions.push({ label: "100 g", grams: 100, nutrition: scaleUsdaNutrition(nutrition, 100 / grams) });
    }
    return {
        source: "levelup",
        catalogueId: id,
        productFamilyId,
        name,
        brand,
        aliases,
        barcode: normalizeBarcode(barcode),
        barcodeAliases: barcodeAliases.map(normalizeBarcode).filter(Boolean),
        dataType: "Level Up Verified",
        category: category || (brand === "Grenade" ? "Protein bar" : "Restaurant food"),
        countryCode,
        provenance: { sourceName: sourceName || (brand === "Grenade" ? "Grenade" : "McDonald's Canada"), sourceUrl, verifiedAt, sourceType: "official_restaurant", verificationStatus: "verified", nutritionScope: protein || carbs || fat ? "full" : "calories_only", lastCheckedAt: verifiedAt },
        detailsLoaded: true,
        portions: addUsefulGramPortions(portions)
    };
}

async function getUsdaFoodDetails(fdcId, request, env) {
    if (!Number.isInteger(fdcId) || fdcId <= 0) return json({ error: "Invalid USDA food ID." }, 400, request, env);
    if (!env.USDA_FDC_API_KEY) return json({ error: "USDA food search is not configured yet." }, 503, request, env);

    const detailsUrl = new URL(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}`);
    detailsUrl.searchParams.set("api_key", env.USDA_FDC_API_KEY);
    detailsUrl.searchParams.set("format", "full");
    detailsUrl.searchParams.set("nutrients", "203,204,205,208,291,1003,1004,1005,1008,1079");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(detailsUrl, { headers: { "Accept": "application/json" }, signal: controller.signal });
        if (!response.ok) {
            console.error(JSON.stringify({ event: "usda_food_details_failed", status: response.status }));
            return json({ error: "USDA serving details are temporarily unavailable." }, 502, request, env);
        }
        const food = normalizeUsdaFood(await response.json());
        if (!food) return json({ error: "USDA serving details could not be read." }, 502, request, env);
        return json({ food: { ...food, detailsLoaded: true }, source: "USDA FoodData Central" }, 200, request, env);
    }
    catch (error) {
        console.error(JSON.stringify({ event: "usda_food_details_failed", reason: error?.name === "AbortError" ? "timeout" : "network" }));
        return json({ error: "USDA serving details are temporarily unavailable." }, 502, request, env);
    }
    finally {
        clearTimeout(timeout);
    }
}

export function dedupeUsdaFoods(foods) {
    const unique = new Map();
    (Array.isArray(foods) ? foods : []).forEach(food => {
        if (!food) return;
        const key = `${foodIdentity(food.name)}|${foodIdentity(food.brand)}`;
        const current = unique.get(key);
        if (!current || foodResultQuality(food) > foodResultQuality(current)) unique.set(key, food);
    });
    return [...unique.values()];
}

function foodIdentity(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[®™]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function foodResultQuality(food) {
    const labels = (food?.portions || []).map(portion => String(portion?.label || "").toLowerCase());
    const wholeItem = labels.some(label => /\b(burger|sandwich|item|piece|patty|wrap|burrito|taco|serving|order)\b/.test(label));
    const calories = Number(food?.portions?.[0]?.nutrition?.calories) || 0;
    return (wholeItem ? 20 : 0) + (food?.brand ? 5 : 0) + (calories > 0 ? 2 : 0);
}

export function normalizeUsdaFood(food) {
    const fdcId = Number(food?.fdcId);
    const name = consumerUsdaProductName(food?.description);
    if (!Number.isFinite(fdcId) || !name) return null;

    const per100 = {
        calories: usdaNutrient(food, ["208", "1008"], ["energy"], "KCAL"),
        protein: usdaNutrient(food, ["203", "1003"], ["protein"]),
        carbs: usdaNutrient(food, ["205", "1005"], ["carbohydrate, by difference", "carbohydrate"]),
        fat: usdaNutrient(food, ["204", "1004"], ["total lipid (fat)", "total fat"]),
        fiber: usdaNutrient(food, ["291", "1079"], ["fiber, total dietary", "dietary fiber"])
    };
    const portions = [];
    const servingSize = Number(food?.servingSize);
    const servingUnit = String(food?.servingSizeUnit || "").trim().toLowerCase();
    if (Number.isFinite(servingSize) && servingSize > 0 && ["g", "gram", "grams", "grm"].includes(servingUnit)) {
        const multiplier = servingSize / 100;
        portions.push({
            label: foodServingLabel(limitedText(food?.householdServingFullText, 80) || `${formatFoodNumber(servingSize)} g`, servingSize),
            grams: servingSize,
            nutrition: usdaLabelNutrition(food) || scaleUsdaNutrition(per100, multiplier)
        });
    }
    const detailedPortions = [...(Array.isArray(food?.foodPortions) ? food.foodPortions : []), ...(Array.isArray(food?.foodMeasures) ? food.foodMeasures : [])]
        .map(portion => normalizeUsdaPortion(portion, per100))
        .filter(Boolean)
        .sort((a, b) => portionPriority(b.label) - portionPriority(a.label));
    detailedPortions.forEach(portion => {
        const duplicate = portions.some(existing => existing.label.toLowerCase() === portion.label.toLowerCase() || Math.abs(existing.grams - portion.grams) < .01);
        if (!duplicate) portions.push(portion);
    });
    portions.push({ label: "100 g", grams: 100, nutrition: per100 });

    return {
        source: "usda",
        fdcId,
        barcode: limitedText(food?.gtinUpc, 40),
        name,
        brand: limitedText(food?.brandName || food?.brandOwner, 120),
        dataType: limitedText(food?.dataType, 60),
        category: limitedText(food?.foodCategory?.description || food?.wweiaFoodCategory?.wweiaFoodCategoryDescription || food?.foodCategory, 100),
        portions: addUsefulGramPortions(portions)
    };
}

export function consumerUsdaProductName(value) {
    const original = limitedText(value, 180);
    if (!original) return "";
    const parts = original.split(",").map(part => part.trim()).filter(Boolean);
    if (parts.length < 3) return original;
    const manufacturerIndex = parts.findIndex((part, index) => index > 0 && index < parts.length - 1 && usdaManufacturerSegment(part));
    if (manufacturerIndex < 0) return original;
    return limitedText(parts.slice(manufacturerIndex + 1).join(", "), 180) || original;
}

function usdaManufacturerSegment(value) {
    const segment = foodIdentity(value);
    return /\b(inc|incorporated|llc|ltd|limited|corp|corporation|company|snackfood|north america|usa|us)\b/.test(segment);
}

function normalizeUsdaPortion(portion, per100) {
    const grams = Number(portion?.gramWeight);
    if (!Number.isFinite(grams) || grams <= 0) return null;
    const label = foodServingLabel(usdaPortionLabel(portion), grams);
    if (!label) return null;
    return { label, grams, nutrition: scaleUsdaNutrition(per100, grams / 100) };
}

function usdaPortionLabel(portion) {
    const description = limitedText(portion?.portionDescription || portion?.disseminationText, 80);
    if (description) return description;
    const amount = Number(portion?.amount);
    const unit = limitedText(portion?.measureUnit?.name || portion?.measureUnit?.abbreviation || portion?.unit, 50);
    const modifier = limitedText(portion?.modifier, 50);
    const usefulModifier = modifier && !/^\d+$/.test(modifier) ? modifier : "";
    if (Number.isFinite(amount) && amount > 0 && (unit || usefulModifier)) {
        return `${formatFoodNumber(amount)} ${usefulModifier || unit}`.trim();
    }
    return usefulModifier;
}

function portionPriority(label) {
    const normalized = String(label || "").toLowerCase();
    if (/\b(burger|sandwich|item|piece|patty|wrap|burrito|taco)\b/.test(normalized)) return 4;
    if (/\b(serving|order|package|container)\b/.test(normalized)) return 3;
    if (/quantity not specified|undetermined/.test(normalized)) return 0;
    return 2;
}

function usdaLabelNutrition(food) {
    const labels = food?.labelNutrients;
    if (!labels || typeof labels !== "object") return null;
    const read = key => {
        const value = Number(labels?.[key]?.value);
        return Number.isFinite(value) && value >= 0 ? value : 0;
    };
    const calories = read("calories");
    if (!(calories > 0)) return null;
    return { calories, protein: read("protein"), carbs: read("carbohydrates"), fat: read("fat"), fiber: read("fiber") };
}

function usdaNutrient(food, numbers, names, requiredUnit = "") {
    const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
    const match = nutrients.find(item => {
        const number = String(item?.nutrientNumber || item?.number || item?.nutrientId || item?.nutrient?.number || item?.nutrient?.id || "");
        const name = String(item?.nutrientName || item?.name || item?.nutrient?.name || "").trim().toLowerCase();
        const unit = String(item?.unitName || item?.unit || item?.nutrient?.unitName || "").trim().toUpperCase();
        const identityMatches = numbers.includes(number) || names.includes(name);
        return identityMatches && (!requiredUnit || unit === requiredUnit);
    });
    const value = Number(match?.value ?? match?.amount);
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function scaleUsdaNutrition(nutrition, multiplier) {
    return Object.fromEntries(Object.entries(nutrition).map(([key, value]) => [key, Number((value * multiplier).toFixed(3))]));
}

function formatFoodNumber(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function foodServingLabel(label, grams) {
    const safeLabel = limitedText(label, 80) || "1 serving";
    const safeGrams = Number(grams);
    if (!Number.isFinite(safeGrams) || safeGrams <= 0 || /(?:^|[\s(])\d+(?:\.\d+)?\s*g(?:\s|\)|$)/i.test(safeLabel)) return safeLabel;
    return limitedText(`${safeLabel} (${formatFoodNumber(safeGrams)} g)`, 80);
}

function addUsefulGramPortions(portions) {
    const useful = (Array.isArray(portions) ? portions : []).filter(portion => portion?.label && portion?.nutrition);
    const basis = useful.find(portion => Number(portion?.grams) > 0 && Number(portion?.nutrition?.calories) > 0);
    if (!basis) return useful;
    const basisGrams = Number(basis.grams);
    const perGram = scaleUsdaNutrition(basis.nutrition, 1 / basisGrams);
    if (!useful.some(portion => Math.abs(Number(portion?.grams) - 100) < .01)) {
        useful.push({ label: "100 g", grams: 100, nutrition: scaleUsdaNutrition(perGram, 100) });
    }
    if (!useful.some(portion => Math.abs(Number(portion?.grams) - 1) < .01)) {
        useful.push({ label: "1 g", grams: 1, nutrition: perGram });
    }
    return useful;
}

async function putAcquisition(userId, body, request, env) {
    const reportedSource = nullableChoice(body?.reportedSource, ACQUISITION_SOURCES);
    if (body?.reportedSource && !reportedSource) return json({ error: "Acquisition source is not valid." }, 400, request, env);
    const now = new Date().toISOString();
    const firstSeenAt = validIso(body?.firstSeenAt) || now;
    const answeredAt = reportedSource ? (validIso(body?.answeredAt) || now) : null;
    await env.DB.prepare(`
        INSERT INTO user_acquisition
            (user_id, reported_source, other_text, utm_source, utm_medium, utm_campaign, utm_content,
             referrer, first_landing_path, first_seen_at, answered_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            reported_source = COALESCE(excluded.reported_source, user_acquisition.reported_source),
            other_text = CASE WHEN excluded.reported_source IS NOT NULL THEN excluded.other_text ELSE user_acquisition.other_text END,
            answered_at = COALESCE(excluded.answered_at, user_acquisition.answered_at),
            updated_at = excluded.updated_at
    `).bind(
        userId, reportedSource, reportedSource === "other" ? limitedText(body?.otherText, 80) : null,
        limitedText(body?.utmSource, 120), limitedText(body?.utmMedium, 120),
        limitedText(body?.utmCampaign, 120), limitedText(body?.utmContent, 120),
        limitedText(body?.referrer, 200), limitedText(body?.firstLandingPath, 200),
        firstSeenAt, answeredAt, now
    ).run();
    return json({ ok: true }, 200, request, env);
}

async function recordProductEvent(userId, body, request, env) {
    const eventName = typeof body?.eventName === "string" ? body.eventName : "";
    if (!CLIENT_EVENT_NAMES.has(eventName) && !USAGE_EVENT_NAMES.has(eventName)) return json({ error: "Event name is not valid." }, 400, request, env);
    const eventKey = limitedText(body?.eventKey, 128);
    if (!eventKey) return json({ error: "Event key is required." }, 400, request, env);
    const metadata = body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};
    const metadataJson = JSON.stringify(metadata);
    if (metadataJson.length > 2048) return json({ error: "Event metadata is too large." }, 400, request, env);
    const occurredAt = validIso(body?.occurredAt) || new Date().toISOString();
    if (USAGE_EVENT_NAMES.has(eventName)) await insertUsageEvent(env, userId, eventName, eventKey, occurredAt, metadata);
    else await insertProductEvent(env, userId, eventName, eventKey, occurredAt, metadata);
    return json({ ok: true }, 200, request, env);
}

async function insertProductEvent(env, userId, eventName, eventKey, occurredAt, metadata) {
    const now = new Date().toISOString();
    await env.DB.prepare(`
        INSERT INTO product_events (id, user_id, event_name, event_key, occurred_at, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, event_name, event_key) DO NOTHING
    `).bind(crypto.randomUUID(), userId, eventName, eventKey, occurredAt, JSON.stringify(metadata || {}), now).run();
}

async function insertUsageEvent(env, userId, eventName, eventKey, occurredAt, metadata) {
    const now = new Date().toISOString();
    await env.DB.prepare(`
        INSERT INTO usage_events (id, user_id, event_name, event_key, occurred_at, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, event_name, event_key) DO NOTHING
    `).bind(crypto.randomUUID(), userId, eventName, eventKey, occurredAt, JSON.stringify(metadata || {}), now).run();
}

function limitedText(value, maxLength) {
    if (typeof value !== "string") return null;
    const result = value.trim().slice(0, maxLength);
    return result || null;
}

function nullableChoice(value, choices) {
    return typeof value === "string" && choices.has(value) ? value : null;
}

function validIso(value) {
    if (typeof value !== "string" || value.length > 40 || !Number.isFinite(Date.parse(value))) return null;
    return new Date(value).toISOString();
}

async function getSatisfactionFeedbackStatus(userId, request, env) {
    const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    const status = await env.DB.prepare(`SELECT
        MAX(created_at) AS last_submitted_at,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS submissions_last_year
        FROM satisfaction_feedback WHERE user_id = ?`).bind(yearAgo, userId).first();
    return json({
        lastSubmittedAt: status?.last_submitted_at || null,
        submissionsLastYear: Number(status?.submissions_last_year || 0)
    }, 200, request, env);
}

async function recordSatisfactionFeedback(userId, body, request, env) {
    const rating = Number(body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return json({ error: "Choose a rating from 1 to 5." }, 400, request, env);
    }
    const triggers = new Set(["workout_milestone", "food_log_milestone", "active_day_milestone"]);
    const triggerName = triggers.has(body?.trigger) ? body.trigger : null;
    if (!triggerName) return json({ error: "Survey trigger is not valid." }, 400, request, env);
    const comment = limitedText(body?.comment, 1000);
    const appVersion = limitedText(body?.appVersion, 80);
    const now = new Date().toISOString();
    const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    const prior = await env.DB.prepare(`SELECT
        MAX(created_at) AS last_submitted_at,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS submissions_last_year
        FROM satisfaction_feedback WHERE user_id = ?`).bind(yearAgo, userId).first();
    if (Number(prior?.submissions_last_year || 0) >= 3) {
        return json({ error: "Thank you. You have already shared enough feedback this year." }, 429, request, env);
    }
    if (prior?.last_submitted_at && Date.now() - Date.parse(prior.last_submitted_at) < 30 * 86400000) {
        return json({ error: "Your recent feedback has already been received." }, 429, request, env);
    }
    await env.DB.prepare(`INSERT INTO satisfaction_feedback
        (id, user_id, rating, comment, trigger_name, app_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), userId, rating, comment, triggerName, appVersion, now).run();
    return json({ ok: true, submittedAt: now }, 201, request, env);
}

async function recordActivity(userId, request, env) {
    const now = new Date().toISOString();
    const day = localDateKey(now, analyticsTimeZone(env));
    await env.DB.batch([
        env.DB.prepare("UPDATE users SET last_active_at = ? WHERE id = ?").bind(now, userId),
        env.DB.prepare(`
            INSERT INTO usage_events (id, user_id, event_name, event_key, occurred_at, metadata_json, created_at)
            VALUES (?, ?, 'app_active', ?, ?, '{}', ?)
            ON CONFLICT(user_id, event_name, event_key) DO NOTHING
        `).bind(crypto.randomUUID(), userId, day, now, now)
    ]);
    return json({ ok: true, lastActiveAt: now }, 200, request, env);
}

function analyticsTimeZone(env) {
    return String(env?.ANALYTICS_TIME_ZONE || "America/Halifax").trim() || "America/Halifax";
}

function localDateKey(value, timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date(value));
    const part = type => parts.find(item => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
}

function nextDateKey(dateKey) {
    const date = new Date(`${dateKey}T12:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
}

function firstInstantForLocalDate(dateKey, timeZone) {
    const approximateMidnight = Date.parse(`${dateKey}T00:00:00.000Z`);
    let low = approximateMidnight - 36 * 60 * 60 * 1000;
    let high = approximateMidnight + 36 * 60 * 60 * 1000;
    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (localDateKey(middle, timeZone) < dateKey) low = middle + 1;
        else high = middle;
    }
    return new Date(low).toISOString();
}

function localDayBounds(value, timeZone) {
    const date = localDateKey(value, timeZone);
    return {
        date,
        start: firstInstantForLocalDate(date, timeZone),
        end: firstInstantForLocalDate(nextDateKey(date), timeZone)
    };
}

function normalizeRestaurantCountry(value) {
    const country = String(value || "CA").trim().toUpperCase();
    return ["CA", "US"].includes(country) ? country : "CA";
}

async function recordFoodSearchCoverage(userId, query, countryCode, resultCount, verifiedResultCount, env) {
    if (!env?.DB || verifiedResultCount > 0) return;
    try {
        await env.DB.prepare(`INSERT INTO food_search_misses
            (user_id, query_normalized, country_code, result_count, verified_result_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`)
            .bind(userId, foodIdentity(query).slice(0, 80), countryCode, resultCount, verifiedResultCount, new Date().toISOString()).run();
    }
    catch (error) {
        console.error(JSON.stringify({ event: "food_search_coverage_write_failed", reason: String(error?.message || error) }));
    }
}

export function validateRestaurantFoodCandidate(body) {
    const value = body || {};
    const errors = [];
    const required = ["name", "brand", "servingLabel", "sourceName", "sourceUrl", "verifiedAt"];
    required.forEach(field => { if (!String(value[field] || "").trim()) errors.push(`${field} is required`); });
    const countryCode = normalizeRestaurantCountry(value.countryCode);
    const calories = Number(value.calories);
    if (!Number.isFinite(calories) || calories <= 0) errors.push("calories must be an exact positive number");
    let sourceUrl;
    try { sourceUrl = new URL(String(value.sourceUrl || "")); }
    catch { errors.push("sourceUrl must be a valid URL"); }
    if (sourceUrl && sourceUrl.protocol !== "https:") errors.push("sourceUrl must use HTTPS");
    const sourceType = String(value.sourceType || "official_restaurant");
    if (!["official_restaurant", "official_menu", "official_label", "usda"].includes(sourceType)) errors.push("sourceType is not accepted");
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(value.verifiedAt || ""))) errors.push("verifiedAt must be an ISO date");
    const macros = ["protein", "carbs", "fat"].map(field => Math.max(0, Number(value[field]) || 0));
    const nutritionScope = macros.some(Boolean) ? "full" : "calories_only";
    if (nutritionScope === "full" && Number.isFinite(calories)) {
        const expected = macros[0] * 4 + macros[1] * 4 + macros[2] * 9;
        if (Math.abs(expected - calories) > Math.max(80, calories * .35)) errors.push("macro calories differ too much from stated calories");
    }
    const brand = limitedText(value.brand, 120);
    const name = limitedText(value.name, 180);
    const restaurantSlug = foodIdentity(value.restaurantSlug || brand).replace(/ /g, "-");
    return {
        valid: errors.length === 0,
        errors,
        food: {
            id: limitedText(value.id, 100) || `${restaurantSlug}-${countryCode.toLowerCase()}-${foodIdentity(name).replace(/ /g, "-")}`.slice(0, 100),
            name, brand, restaurantSlug, countryCode,
            regionCode: limitedText(value.regionCode, 24) || countryCode,
            menuCategory: limitedText(value.menuCategory, 100),
            searchText: foodIdentity(`${name} ${brand} ${value.aliases || ""}`),
            servingLabel: limitedText(value.servingLabel, 80),
            servingGrams: Number(value.servingGrams) > 0 ? Number(value.servingGrams) : null,
            calories, protein: macros[0], carbs: macros[1], fat: macros[2], fiber: Math.max(0, Number(value.fiber) || 0),
            sourceName: limitedText(value.sourceName, 120), sourceUrl: limitedText(value.sourceUrl, 500), sourceType,
            verifiedAt: limitedText(value.verifiedAt, 32), nutritionScope,
            servingType: limitedText(value.servingType, 40) || "item",
            popularityScore: Math.max(0, Math.min(100, Math.round(Number(value.popularityScore) || 0)))
        }
    };
}

async function stageRestaurantFood(user, body, request, env) {
    if (!isAdminUser(user, env)) return json({ error: "Admin access required." }, 403, request, env);
    const validation = validateRestaurantFoodCandidate(body);
    const food = validation.food;
    if (!food.name || !food.brand) return json({ error: "Name and restaurant are required.", validation }, 400, request, env);
    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT OR REPLACE INTO restaurant_food_staging
        (id, name, brand, restaurant_slug, country_code, region_code, menu_category, search_text,
         serving_label, serving_grams, calories, protein_g, carbs_g, fat_g, fiber_g, source_name,
         source_url, source_type, verified_at, nutrition_scope, serving_type, popularity_score,
         validation_status, validation_errors, submitted_by, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`)
        .bind(food.id, food.name, food.brand, food.restaurantSlug, food.countryCode, food.regionCode, food.menuCategory,
            food.searchText, food.servingLabel, food.servingGrams, food.calories, food.protein, food.carbs, food.fat,
            food.fiber, food.sourceName, food.sourceUrl, food.sourceType, food.verifiedAt, food.nutritionScope,
            food.servingType, food.popularityScore, JSON.stringify(validation.errors), user.id, now).run();
    return json({ ok: true, id: food.id, validation }, 201, request, env);
}

async function reviewRestaurantFood(user, id, body, request, env) {
    if (!isAdminUser(user, env)) return json({ error: "Admin access required." }, 403, request, env);
    const action = body?.action === "approve" ? "approved" : body?.action === "reject" ? "rejected" : "";
    if (!action) return json({ error: "Choose approve or reject." }, 400, request, env);
    const row = await env.DB.prepare("SELECT * FROM restaurant_food_staging WHERE id = ?").bind(id).first();
    if (!row) return json({ error: "Staged food not found." }, 404, request, env);
    const validationErrors = JSON.parse(row.validation_errors || "[]");
    if (action === "approved" && validationErrors.length) return json({ error: "Resolve validation errors before approval.", validationErrors }, 409, request, env);
    const now = new Date().toISOString();
    if (action === "approved") {
        await env.DB.prepare(`INSERT INTO verified_foods
            (id, name, brand, category, country_code, search_text, serving_label, serving_grams, calories,
             protein_g, carbs_g, fat_g, fiber_g, source_name, source_url, verified_at, status, created_at, updated_at,
             restaurant_slug, region_code, source_type, verification_status, nutrition_scope, serving_type,
             popularity_score, last_checked_at, next_review_at)
            VALUES (?, ?, ?, 'Restaurant food', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, 'verified', ?, ?, ?, ?, datetime(?, '+90 days'))
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, brand=excluded.brand, country_code=excluded.country_code,
             search_text=excluded.search_text, serving_label=excluded.serving_label, serving_grams=excluded.serving_grams,
             calories=excluded.calories, protein_g=excluded.protein_g, carbs_g=excluded.carbs_g, fat_g=excluded.fat_g,
             fiber_g=excluded.fiber_g, source_name=excluded.source_name, source_url=excluded.source_url,
             verified_at=excluded.verified_at, updated_at=excluded.updated_at, verification_status='verified',
             nutrition_scope=excluded.nutrition_scope, popularity_score=excluded.popularity_score,
             last_checked_at=excluded.last_checked_at, next_review_at=excluded.next_review_at, status='active'`)
            .bind(row.id, row.name, row.brand, row.country_code, row.search_text, row.serving_label, row.serving_grams,
                row.calories, row.protein_g || 0, row.carbs_g || 0, row.fat_g || 0, row.fiber_g || 0,
                row.source_name, row.source_url, row.verified_at, now, now, row.restaurant_slug, row.region_code,
                row.source_type, row.nutrition_scope, row.serving_type, row.popularity_score, now, now).run();
    }
    await env.DB.prepare(`UPDATE restaurant_food_staging SET validation_status = ?, reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ?`)
        .bind(action, user.id, now, limitedText(body?.note, 500), id).run();
    return json({ ok: true, status: action }, 200, request, env);
}

async function getRestaurantCatalogueAdminData(env) {
    try {
        const [audit, misses, dueReviews, staging] = await Promise.all([
            env.DB.prepare("SELECT * FROM restaurant_catalogue_audit ORDER BY country_code, item_count DESC, brand").all(),
            env.DB.prepare(`SELECT query_normalized, country_code, COUNT(*) AS searches, MAX(created_at) AS last_searched_at
                FROM food_search_misses WHERE created_at >= datetime('now', '-30 days')
                GROUP BY query_normalized, country_code ORDER BY searches DESC, last_searched_at DESC LIMIT 20`).all(),
            env.DB.prepare(`SELECT id, name, brand, country_code, source_url, next_review_at
                FROM verified_foods WHERE status='active' AND next_review_at <= datetime('now')
                ORDER BY next_review_at LIMIT 30`).all(),
            env.DB.prepare(`SELECT id, name, brand, country_code, serving_label, calories, source_url,
                nutrition_scope, validation_errors, submitted_at FROM restaurant_food_staging
                WHERE validation_status='pending' ORDER BY submitted_at LIMIT 30`).all()
        ]);
        return { audit: audit.results || [], misses: misses.results || [], dueReviews: dueReviews.results || [], staging: staging.results || [] };
    }
    catch (error) {
        console.error(JSON.stringify({ event: "restaurant_catalogue_admin_failed", reason: String(error?.message || error) }));
        return { audit: [], misses: [], dueReviews: [], staging: [], migrationPending: true };
    }
}

async function getLocalUsageSummary(env, since, timeZone) {
    const [usage, workouts] = await Promise.all([
        env.DB.prepare(`SELECT user_id, event_name, occurred_at
            FROM usage_events
            WHERE occurred_at >= ? AND event_name IN ('app_active', 'food_logged')`).bind(since).all(),
        env.DB.prepare(`SELECT user_id, occurred_at
            FROM product_events
            WHERE occurred_at >= ? AND event_name = 'workout_completed'`).bind(since).all()
    ]);
    const days = new Map();
    const activeDaysByUser = new Map();
    const dayFor = occurredAt => {
        const key = localDateKey(occurredAt, timeZone);
        if (!days.has(key)) days.set(key, { day: key, activeUsers: new Set(), foods: 0, workouts: 0 });
        return days.get(key);
    };
    for (const event of usage?.results || []) {
        const day = dayFor(event.occurred_at);
        if (event.event_name === "food_logged") {
            day.foods += 1;
            continue;
        }
        day.activeUsers.add(event.user_id);
        if (!activeDaysByUser.has(event.user_id)) activeDaysByUser.set(event.user_id, new Set());
        activeDaysByUser.get(event.user_id).add(day.day);
    }
    for (const event of workouts?.results || []) dayFor(event.occurred_at).workouts += 1;
    return {
        daily: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)).map(day => ({
            day: day.day,
            active_users: day.activeUsers.size,
            foods: day.foods,
            workouts: day.workouts
        })),
        repeatUsers: [...activeDaysByUser.values()].filter(activeDays => activeDays.size >= 2).length
    };
}

async function getAdminAnalytics(user, url, request, env) {
    if (!isAdminUser(user, env)) return json({ error: "Admin access required." }, 403, request, env);
    const requestedDays = Number(url.searchParams.get("days") || 30);
    const days = Number.isFinite(requestedDays) ? Math.min(365, Math.max(7, Math.round(requestedDays))) : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const activeSince = new Date(Date.now() - 7 * 86400000).toISOString();
    const timeZone = analyticsTimeZone(env);
    const today = localDayBounds(Date.now(), timeZone);
    const [totals, usageSummary, acquisition, people, feedbackSummary, feedback, restaurantCatalogue, workoutSources] = await Promise.all([
        env.DB.prepare(`SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM users WHERE created_at >= ?) AS new_users,
            (SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?) AS new_users_today,
            (SELECT COUNT(*) FROM users WHERE last_active_at >= ?) AS active_users,
            (SELECT COUNT(*) FROM users WHERE last_active_at >= ? AND last_active_at < ?) AS users_today,
            (SELECT COUNT(*) FROM (
                SELECT user_id FROM usage_events
                WHERE event_name = 'food_logged' AND occurred_at >= ? AND occurred_at < ?
                UNION
                SELECT user_id FROM product_events
                WHERE event_name = 'workout_completed' AND occurred_at >= ? AND occurred_at < ?
            )) AS engaged_users_today,
            (SELECT COUNT(*) FROM usage_events WHERE event_name = 'food_logged' AND occurred_at >= ?) AS foods_logged,
            (SELECT COUNT(DISTINCT user_id) FROM usage_events WHERE event_name = 'food_logged' AND occurred_at >= ?) AS food_log_users,
            (SELECT COUNT(*) FROM product_events WHERE event_name = 'workout_completed' AND occurred_at >= ?) AS workouts,
            (SELECT COUNT(DISTINCT user_id) FROM product_events WHERE event_name = 'workout_completed' AND occurred_at >= ?) AS workout_users,
            (SELECT COUNT(*) FROM product_events WHERE event_name = 'onboarding_completed' AND occurred_at >= ?) AS onboarding_completions`)
            .bind(since, today.start, today.end, activeSince, today.start, today.end,
                today.start, today.end, today.start, today.end,
                since, since, since, since, since).first(),
        getLocalUsageSummary(env, since, timeZone),
        env.DB.prepare(`SELECT COALESCE(NULLIF(reported_source, ''), 'Not answered') AS source, COUNT(*) AS users
            FROM user_acquisition GROUP BY source ORDER BY users DESC`).all(),
        env.DB.prepare(`SELECT
                u.id,
                u.display_name,
                u.email,
                u.avatar_url,
                u.created_at,
                u.last_active_at,
                (SELECT COUNT(DISTINCT substr(ue.occurred_at, 1, 10)) FROM usage_events ue
                    WHERE ue.user_id = u.id AND ue.event_name = 'app_active' AND ue.occurred_at >= ?) AS active_days,
                (SELECT COUNT(*) FROM usage_events ue
                    WHERE ue.user_id = u.id AND ue.event_name = 'food_logged' AND ue.occurred_at >= ?) AS foods_logged,
                (SELECT COUNT(*) FROM product_events pe
                    WHERE pe.user_id = u.id AND pe.event_name = 'workout_completed' AND pe.occurred_at >= ?) AS workouts_logged
            FROM users u
            WHERE u.last_active_at >= ?
                OR EXISTS (SELECT 1 FROM usage_events ue WHERE ue.user_id = u.id AND ue.occurred_at >= ?)
                OR EXISTS (SELECT 1 FROM product_events pe WHERE pe.user_id = u.id AND pe.occurred_at >= ?)
            ORDER BY u.last_active_at DESC, u.created_at DESC
            LIMIT 100`).bind(since, since, since, since, since, since).all(),
        env.DB.prepare(`SELECT COUNT(*) AS responses, ROUND(AVG(rating), 2) AS average_rating,
            SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS rating_1,
            SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS rating_2,
            SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS rating_3,
            SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS rating_4,
            SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS rating_5
            FROM satisfaction_feedback WHERE created_at >= ?`).bind(since).first(),
        env.DB.prepare(`SELECT sf.id, sf.rating, sf.comment, sf.trigger_name, sf.app_version, sf.created_at,
                u.display_name, u.email
            FROM satisfaction_feedback sf JOIN users u ON u.id = sf.user_id
            WHERE sf.created_at >= ? ORDER BY sf.created_at DESC LIMIT 100`).bind(since).all(),
        getRestaurantCatalogueAdminData(env),
        env.DB.prepare(`SELECT workout_source, COUNT(*) AS workouts, COUNT(DISTINCT user_id) AS users
            FROM (
                SELECT user_id,
                    CASE
                        WHEN json_extract(metadata_json, '$.workoutSource') IN ('coach_builder', 'manual_builder', 'template_library', 'imported_routine', 'one_off')
                            THEN json_extract(metadata_json, '$.workoutSource')
                        WHEN json_extract(metadata_json, '$.planId') LIKE 'smart-%' THEN 'coach_builder'
                        WHEN json_extract(metadata_json, '$.planId') LIKE 'import-%' THEN 'imported_routine'
                        WHEN json_extract(metadata_json, '$.planId') LIKE 'one-off-%' THEN 'one_off'
                        ELSE 'legacy_unknown'
                    END AS workout_source
                FROM product_events
                WHERE event_name = 'workout_completed' AND occurred_at >= ?
            )
            GROUP BY workout_source
            ORDER BY workouts DESC`).bind(since).all()
    ]);
    const localTotals = { ...(totals || {}), repeat_users: usageSummary.repeatUsers };
    return json({
        days,
        since,
        timeZone,
        today: today.date,
        updatedAt: new Date().toISOString(),
        totals: localTotals,
        daily: usageSummary.daily,
        acquisition: acquisition?.results || [],
        people: people?.results || [],
        feedbackSummary: feedbackSummary || {},
        feedback: feedback?.results || [],
        restaurantCatalogue,
        workoutSources: workoutSources?.results || []
    }, 200, request, env);
}

async function importRedditSource(body, request, env) {
    const sourceUrl = typeof body?.url === "string" ? body.url.trim() : "";
    let parsed;
    try { parsed = new URL(sourceUrl); }
    catch { return json({ error: "Enter a valid Reddit link." }, 400, request, env); }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (parsed.protocol !== "https:" || !["reddit.com", "old.reddit.com", "redd.it"].includes(host)) {
        return json({ error: "This beta currently supports Reddit links only." }, 400, request, env);
    }
    const match = host === "redd.it" ? parsed.pathname.match(/^\/([a-z0-9]+)/i) : parsed.pathname.match(/\/comments\/([a-z0-9]+)/i);
    if (!match) return json({ error: "This does not look like a Reddit post link." }, 400, request, env);
    const postId = match[1].toLowerCase();
    let result = await fetchRedditListing(postId);
    if (!result) result = await fetchArchivedRedditListing(postId);
    if (!result) return json({ error: "Reddit did not make this post available. Copy and paste the routine instead." }, 422, request, env);
    return json({ ...result, sourceUrl: `https://www.reddit.com/comments/${postId}/`, candidates: result.candidates.slice(0, 50) }, 200, request, env);
}

async function fetchRedditListing(postId) {
    try {
        const response = await fetch(`https://www.reddit.com/comments/${postId}.json?raw_json=1&limit=50&depth=3`, {
            headers: { "User-Agent": "LevelUpRoutineImporter/1.1 (https://leveluphypertrophy.com)" }
        });
        if (!response.ok || !String(response.headers.get("Content-Type") || "").includes("application/json")) return null;
        const listing = await response.json();
        const post = listing?.[0]?.data?.children?.[0]?.data || {};
        const candidates = [];
        addRedditCandidate(candidates, "post", post.author, post.selftext);
        collectRedditComments(listing?.[1]?.data?.children || [], candidates);
        return { title: post.title || "Reddit routine", candidates };
    } catch {
        return null;
    }
}

async function fetchArchivedRedditListing(postId) {
    try {
        const [postResponse, commentsResponse] = await Promise.all([
            fetch(`https://api.pullpush.io/reddit/search/submission/?ids=${encodeURIComponent(postId)}`),
            fetch(`https://api.pullpush.io/reddit/search/comment/?link_id=${encodeURIComponent(postId)}&size=100`)
        ]);
        if (!postResponse.ok || !commentsResponse.ok) return null;
        const [postPayload, commentsPayload] = await Promise.all([postResponse.json(), commentsResponse.json()]);
        const post = Array.isArray(postPayload?.data) ? postPayload.data[0] || {} : {};
        const candidates = [];
        addRedditCandidate(candidates, "post", post.author, post.selftext);
        for (const comment of Array.isArray(commentsPayload?.data) ? commentsPayload.data : []) {
            addRedditCandidate(candidates, "comment", comment.author, comment.body);
        }
        if (!candidates.length) return null;
        return { title: post.title || "Reddit routine", candidates };
    } catch {
        return null;
    }
}

function addRedditCandidate(output, kind, author, text) {
    if (typeof text !== "string") return;
    const trimmed = text.trim();
    if (trimmed.length < 20 || ["[deleted]", "[removed]"].includes(trimmed)) return;
    output.push({ kind, author: author || null, text: trimmed.slice(0, 20000) });
}

function collectRedditComments(children, output) {
    for (const child of Array.isArray(children) ? children : []) {
        const data = child?.data;
        if (!data) continue;
        addRedditCandidate(output, "comment", data.author, data.body);
        if (output.length >= 50) return;
        collectRedditComments(data.replies?.data?.children || [], output);
        if (output.length >= 50) return;
    }
}

function isAdminUser(user, env) {
    return String(env.ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean).includes(String(user.email || "").toLowerCase());
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
        betaStatus: user.beta_status || "active",
        lastActiveAt: user.last_active_at || null
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
