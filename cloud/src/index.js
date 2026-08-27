const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 100000;
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_MAX_FAILURES = 10;
const ACQUISITION_SOURCES = new Set(["instagram", "tiktok", "reddit", "youtube", "google_search", "friend_family", "app_recommendation", "other", "prefer_not_to_say"]);
const CLIENT_EVENT_NAMES = new Set(["onboarding_completed", "workout_completed"]);

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
    if (url.pathname === "/v1/foods/search" && request.method === "GET") {
        return searchUsdaFoods(url, request, env);
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

async function searchUsdaFoods(url, request, env) {
    const query = String(url.searchParams.get("q") || "").trim().replace(/\s+/g, " ");
    if (query.length < 2) return json({ error: "Enter at least 2 characters." }, 400, request, env);
    if (query.length > 80) return json({ error: "Food search is too long." }, 400, request, env);
    if (!env.USDA_FDC_API_KEY) {
        return json({ error: "USDA food search is not configured yet." }, 503, request, env);
    }

    const upstreamUrl = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    upstreamUrl.searchParams.set("api_key", env.USDA_FDC_API_KEY);
    upstreamUrl.searchParams.set("query", query);
    upstreamUrl.searchParams.set("pageSize", "15");
    upstreamUrl.searchParams.set("pageNumber", "1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
        response = await fetch(upstreamUrl, {
            headers: { "Accept": "application/json" },
            signal: controller.signal
        });
    }
    catch (error) {
        console.error(JSON.stringify({ event: "usda_food_search_failed", reason: error?.name === "AbortError" ? "timeout" : "network" }));
        return json({ error: "USDA food search is temporarily unavailable." }, 502, request, env);
    }
    finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        console.error(JSON.stringify({ event: "usda_food_search_failed", status: response.status }));
        const status = response.status === 429 ? 429 : 502;
        const message = response.status === 429
            ? "USDA search is busy. Wait a moment and try again."
            : "USDA food search is temporarily unavailable.";
        return json({ error: message }, status, request, env);
    }

    const payload = await response.json();
    const searchFoods = Array.isArray(payload?.foods) ? payload.foods : [];
    const foods = dedupeUsdaFoods(searchFoods.map(normalizeUsdaFood).filter(Boolean)).slice(0, 12);
    return json({ foods, source: "USDA FoodData Central" }, 200, request, env);
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
    const name = limitedText(food?.description, 180);
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
    if (Number.isFinite(servingSize) && servingSize > 0 && ["g", "gram", "grams"].includes(servingUnit)) {
        const multiplier = servingSize / 100;
        portions.push({
            label: limitedText(food?.householdServingFullText, 80) || `${formatFoodNumber(servingSize)} g`,
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
        name,
        brand: limitedText(food?.brandOwner || food?.brandName, 120),
        dataType: limitedText(food?.dataType, 60),
        category: limitedText(food?.foodCategory?.description || food?.wweiaFoodCategory?.wweiaFoodCategoryDescription || food?.foodCategory, 100),
        portions
    };
}

function normalizeUsdaPortion(portion, per100) {
    const grams = Number(portion?.gramWeight);
    if (!Number.isFinite(grams) || grams <= 0) return null;
    const label = usdaPortionLabel(portion);
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
    if (!CLIENT_EVENT_NAMES.has(eventName)) return json({ error: "Event name is not valid." }, 400, request, env);
    const eventKey = limitedText(body?.eventKey, 128);
    if (!eventKey) return json({ error: "Event key is required." }, 400, request, env);
    const metadata = body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};
    const metadataJson = JSON.stringify(metadata);
    if (metadataJson.length > 2048) return json({ error: "Event metadata is too large." }, 400, request, env);
    await insertProductEvent(env, userId, eventName, eventKey, validIso(body?.occurredAt) || new Date().toISOString(), metadata);
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

async function recordActivity(userId, request, env) {
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE users SET last_active_at = ? WHERE id = ?")
        .bind(now, userId).run();
    return json({ ok: true, lastActiveAt: now }, 200, request, env);
}

async function getAdminAnalytics(user, url, request, env) {
    if (!isAdminUser(user, env)) return json({ error: "Admin access required." }, 403, request, env);
    const requestedDays = Number(url.searchParams.get("days") || 30);
    const days = Number.isFinite(requestedDays) ? Math.min(365, Math.max(7, Math.round(requestedDays))) : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const activeSince = new Date(Date.now() - 7 * 86400000).toISOString();
    const [totals, daily, acquisition] = await Promise.all([
        env.DB.prepare(`SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM users WHERE created_at >= ?) AS new_users,
            (SELECT COUNT(*) FROM users WHERE last_active_at >= ?) AS active_users,
            (SELECT COUNT(*) FROM product_events WHERE event_name = 'workout_completed' AND occurred_at >= ?) AS workouts,
            (SELECT COUNT(DISTINCT user_id) FROM product_events WHERE event_name = 'workout_completed' AND occurred_at >= ?) AS workout_users,
            (SELECT COUNT(*) FROM product_events WHERE event_name = 'onboarding_completed' AND occurred_at >= ?) AS onboarding_completions`)
            .bind(since, activeSince, since, since, since).first(),
        env.DB.prepare(`SELECT substr(occurred_at, 1, 10) AS day, COUNT(*) AS workouts,
            COUNT(DISTINCT user_id) AS users
            FROM product_events
            WHERE event_name = 'workout_completed' AND occurred_at >= ?
            GROUP BY day ORDER BY day`).bind(since).all(),
        env.DB.prepare(`SELECT COALESCE(NULLIF(reported_source, ''), 'Not answered') AS source, COUNT(*) AS users
            FROM user_acquisition GROUP BY source ORDER BY users DESC`).all()
    ]);
    return json({ days, since, totals: totals || {}, daily: daily?.results || [], acquisition: acquisition?.results || [] }, 200, request, env);
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
