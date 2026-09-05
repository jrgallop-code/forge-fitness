const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_ROOT = "https://platform.fatsecret.com/rest";
const AUTO_SCOPE = "auto";
const REQUEST_TIMEOUT_MS = 5000;

let tokenCache = {
    key: "",
    token: "",
    scopes: [],
    expiresAt: 0
};

export function fatSecretConfigured(env = {}) {
    return Boolean(
        String(env.FATSECRET_CLIENT_ID || "").trim() &&
        String(env.FATSECRET_CLIENT_SECRET || "").trim()
    );
}

export function fatSecretConfiguredScope(env = {}) {
    const value = String(env.FATSECRET_SCOPE || "").trim().toLowerCase();
    return !value || value === AUTO_SCOPE ? "" : value;
}

export function fatSecretScopeMode(env = {}) {
    return fatSecretConfiguredScope(env) ? "explicit" : AUTO_SCOPE;
}

export function fatSecretScopes(env = {}) {
    return new Set(
        fatSecretConfiguredScope(env)
            .split(/\s+/)
            .map(value => value.trim())
            .filter(Boolean)
    );
}

// These synchronous helpers are only pre-flight checks. In auto mode the actual
// granted scopes are discovered from the OAuth access token before API calls.
export function fatSecretCanLocalize(env = {}) {
    const configured = fatSecretConfiguredScope(env);
    if (!configured) return true;
    const scopes = fatSecretScopes(env);
    return scopes.has("premier") && scopes.has("localization");
}

export function fatSecretCanBarcode(env = {}) {
    const configured = fatSecretConfiguredScope(env);
    if (!configured) return true;
    return fatSecretScopes(env).has("barcode");
}

export async function getFatSecretCapabilities(env = {}) {
    const auth = await getFatSecretAuth(env);
    return capabilitiesFromAuth(auth, env);
}

export async function searchFatSecretFoods(query, countryCode, env = {}, options = {}) {
    const searchExpression = String(query || "").trim().replace(/\s+/g, " ");
    if (!fatSecretConfigured(env) || searchExpression.length < 2) return [];

    const auth = await getFatSecretAuth(env);
    const capabilities = capabilitiesFromAuth(auth, env);
    const maxResults = String(clampInteger(options.limit, 1, 20, 8));
    const normalizedCountry = normalizeCountry(countryCode);
    let payload;

    if (capabilities.premier) {
        const url = new URL(`${FATSECRET_API_ROOT}/foods/search/v5`);
        url.searchParams.set("search_expression", searchExpression);
        url.searchParams.set("page_number", "0");
        url.searchParams.set("max_results", maxResults);
        url.searchParams.set("format", "json");
        if (capabilities.canLocalize && normalizedCountry) {
            url.searchParams.set("region", normalizedCountry);
            url.searchParams.set("flag_default_serving", "true");
        }
        payload = await fatSecretJson(url, env, {}, auth);
    }
    else {
        // FatSecret's OAuth 2.0 Basic example uses the method-based foods.search
        // API. Region filtering is not sent unless the granted token supports
        // Premier + localization.
        const url = new URL(`${FATSECRET_API_ROOT}/server.api`);
        const body = new URLSearchParams({
            method: "foods.search",
            search_expression: searchExpression,
            page_number: "0",
            max_results: maxResults,
            format: "json"
        });
        payload = await fatSecretJson(url, env, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
        }, auth);
    }

    const foods = asArray(payload?.foods?.food);
    const responseCountry = capabilities.canLocalize && normalizedCountry ? normalizedCountry : "US";
    return foods
        .map(food => normalizeFatSecretFood(food, { countryCode: responseCountry }))
        .filter(Boolean);
}

export async function getFatSecretFood(foodId, countryCode, env = {}) {
    const id = String(foodId || "").trim();
    if (!fatSecretConfigured(env) || !/^\d+$/.test(id)) return null;

    const auth = await getFatSecretAuth(env);
    const capabilities = capabilitiesFromAuth(auth, env);
    const url = new URL(`${FATSECRET_API_ROOT}/food/v5`);
    url.searchParams.set("food_id", id);
    url.searchParams.set("format", "json");

    const normalizedCountry = normalizeCountry(countryCode);
    if (capabilities.canLocalize && normalizedCountry) {
        url.searchParams.set("region", normalizedCountry);
    }

    const payload = await fatSecretJson(url, env, {}, auth);
    return normalizeFatSecretFood(payload?.food, {
        countryCode: capabilities.canLocalize && normalizedCountry ? normalizedCountry : "US"
    });
}

export async function findFatSecretFoodByBarcode(barcode, countryCode, env = {}) {
    if (!fatSecretConfigured(env)) return null;
    const gtin13 = toFatSecretGtin13(barcode);
    if (!gtin13) return null;

    const auth = await getFatSecretAuth(env);
    const capabilities = capabilitiesFromAuth(auth, env);
    if (!capabilities.canBarcode) return null;

    const url = new URL(`${FATSECRET_API_ROOT}/food/barcode/find-by-id/v2`);
    url.searchParams.set("barcode", gtin13);
    url.searchParams.set("format", "json");

    const normalizedCountry = normalizeCountry(countryCode);
    if (capabilities.canLocalize && normalizedCountry) {
        url.searchParams.set("region", normalizedCountry);
    }

    const payload = await fatSecretJson(url, env, {}, auth);
    const normalized = normalizeFatSecretFood(payload?.food, {
        countryCode: capabilities.canLocalize && normalizedCountry ? normalizedCountry : "US",
        barcode: String(barcode || "").replace(/\D/g, "")
    });
    return normalized || null;
}

export function normalizeFatSecretFood(food, options = {}) {
    if (!food || typeof food !== "object") return null;
    const foodId = String(food.food_id || "").trim();
    const name = cleanText(food.food_name, 180);
    if (!foodId || !name) return null;

    let portions = asArray(food?.servings?.serving)
        .map(normalizeServing)
        .filter(Boolean);

    if (!portions.length) {
        const summary = parseFatSecretDescription(food.food_description);
        if (summary) portions = [summary];
    }

    if (!portions.length) return null;

    const countryCode = normalizeCountry(options.countryCode) || "US";
    const sourceUrl = cleanUrl(food.food_url);
    const brand = cleanText(food.brand_name, 120);
    const barcode = String(options.barcode || "").replace(/\D/g, "").slice(0, 14) || null;

    return {
        source: "fatsecret",
        catalogueId: `fatsecret:${foodId}`,
        fatSecretFoodId: foodId,
        name,
        brand,
        dataType: food.food_type ? `FatSecret ${cleanText(food.food_type, 40)}` : "FatSecret food",
        countryCode,
        barcode,
        portions,
        servingLabel: portions[0].label,
        detailsLoaded: true,
        provenance: {
            sourceName: "FatSecret",
            sourceUrl,
            sourceType: "fatsecret_api",
            verificationStatus: "external",
            nutritionScope: portions.some(portion => Number(portion?.nutrition?.fiber) > 0) ? "full" : "macros",
            fetchedAt: new Date().toISOString()
        }
    };
}

export function parseFatSecretDescription(description) {
    const value = String(description || "").trim();
    if (!value) return null;

    const servingMatch = value.match(/^Per\s+(.+?)\s+-\s+/i);
    const label = cleanText(servingMatch?.[1] || "1 serving", 80) || "1 serving";
    const calories = extractNutritionNumber(value, /Calories:\s*([\d.]+)\s*kcal/i);
    const fat = extractNutritionNumber(value, /Fat:\s*([\d.]+)\s*g/i);
    const carbs = extractNutritionNumber(value, /Carbs?:\s*([\d.]+)\s*g/i);
    const protein = extractNutritionNumber(value, /Protein:\s*([\d.]+)\s*g/i);
    const fiber = extractNutritionNumber(value, /Fiber:\s*([\d.]+)\s*g/i);

    if (![calories, fat, carbs, protein].some(number => number > 0)) return null;

    const metric = metricAmountFromLabel(label);
    return {
        label,
        ...(metric.grams ? { grams: metric.grams } : {}),
        ...(metric.milliliters ? { milliliters: metric.milliliters } : {}),
        nutrition: { calories, protein, carbs, fat, fiber }
    };
}

export function toFatSecretGtin13(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 14 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length < 8 || digits.length > 13) return "";
    return digits.padStart(13, "0");
}

export function decodeFatSecretAccessTokenScopes(token) {
    try {
        const part = String(token || "").split(".")[1];
        if (!part) return [];
        const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        const payload = JSON.parse(atob(padded));
        const raw = payload?.scope;
        const values = Array.isArray(raw) ? raw : String(raw || "").split(/\s+/);
        return [...new Set(values.map(value => String(value || "").trim().toLowerCase()).filter(Boolean))];
    }
    catch {
        return [];
    }
}

async function fatSecretJson(url, env, requestOptions = {}, auth = null) {
    const credentials = auth || await getFatSecretAuth(env);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const headers = new Headers(requestOptions.headers || {});
        headers.set("Authorization", `Bearer ${credentials.token}`);
        headers.set("Accept", "application/json");
        const response = await fetch(url, {
            ...requestOptions,
            headers,
            signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.error) {
            const reason = payload?.error?.message || payload?.error_description || `FatSecret request failed (${response.status})`;
            throw new Error(reason);
        }
        return payload;
    }
    finally {
        clearTimeout(timeout);
    }
}

async function getFatSecretAuth(env) {
    if (!fatSecretConfigured(env)) throw new Error("FatSecret is not configured.");

    const clientId = String(env.FATSECRET_CLIENT_ID || "").trim();
    const clientSecret = String(env.FATSECRET_CLIENT_SECRET || "").trim();
    const requestedScope = fatSecretConfiguredScope(env);
    const cacheKey = `${clientId}|${requestedScope || AUTO_SCOPE}`;
    const now = Date.now();

    if (tokenCache.key === cacheKey && tokenCache.token && tokenCache.expiresAt - 60_000 > now) {
        return {
            token: tokenCache.token,
            scopes: new Set(tokenCache.scopes),
            scopeMode: requestedScope ? "explicit" : AUTO_SCOPE
        };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const body = new URLSearchParams({ grant_type: "client_credentials" });
        // FatSecret documents that omitting scope grants every scope available to
        // the client. This lets Level Up automatically use localization/barcode
        // access when the account is entitled to it.
        if (requestedScope) body.set("scope", requestedScope);

        const response = await fetch(FATSECRET_TOKEN_URL, {
            method: "POST",
            headers: {
                Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json"
            },
            body,
            signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.access_token) {
            throw new Error(payload?.error_description || payload?.error || `FatSecret token request failed (${response.status})`);
        }

        const token = String(payload.access_token);
        let scopes = decodeFatSecretAccessTokenScopes(token);
        if (!scopes.length && requestedScope) {
            scopes = requestedScope.split(/\s+/).map(value => value.trim().toLowerCase()).filter(Boolean);
        }

        const lifetimeSeconds = Math.max(60, Number(payload.expires_in) || 3600);
        tokenCache = {
            key: cacheKey,
            token,
            scopes,
            expiresAt: now + lifetimeSeconds * 1000
        };
        return {
            token,
            scopes: new Set(scopes),
            scopeMode: requestedScope ? "explicit" : AUTO_SCOPE
        };
    }
    finally {
        clearTimeout(timeout);
    }
}

function capabilitiesFromAuth(auth, env) {
    const scopes = auth?.scopes instanceof Set ? auth.scopes : new Set(auth?.scopes || []);
    const premier = scopes.has("premier");
    const localization = scopes.has("localization");
    return {
        scopeMode: auth?.scopeMode || fatSecretScopeMode(env),
        requestedScope: fatSecretConfiguredScope(env) || null,
        grantedScopes: [...scopes].sort(),
        premier,
        localization,
        canLocalize: premier && localization,
        canBarcode: scopes.has("barcode")
    };
}

function normalizeServing(serving) {
    if (!serving || typeof serving !== "object") return null;
    const label = cleanText(serving.serving_description, 80) || "1 serving";
    const calories = positiveOrZero(serving.calories);
    const protein = positiveOrZero(serving.protein);
    const carbs = positiveOrZero(serving.carbohydrate ?? serving.carbs);
    const fat = positiveOrZero(serving.fat);
    const fiber = positiveOrZero(serving.fiber);
    if (![calories, protein, carbs, fat].some(number => number > 0)) return null;

    const amount = Number(serving.metric_serving_amount);
    const unit = String(serving.metric_serving_unit || "").toLowerCase();
    const grams = Number.isFinite(amount) && amount > 0
        ? unit === "g"
            ? amount
            : unit === "oz"
                ? amount * 28.349523125
                : 0
        : 0;
    const milliliters = Number.isFinite(amount) && amount > 0 && unit === "ml" ? amount : 0;

    return {
        servingId: String(serving.serving_id || "") || null,
        label,
        ...(grams > 0 ? { grams } : {}),
        ...(milliliters > 0 ? { milliliters } : {}),
        nutrition: { calories, protein, carbs, fat, fiber }
    };
}

function metricAmountFromLabel(label) {
    const grams = String(label).match(/(?:^|\s)([\d.]+)\s*g\b/i);
    if (grams) return { grams: Number(grams[1]) || 0, milliliters: 0 };
    const milliliters = String(label).match(/(?:^|\s)([\d.]+)\s*m[lL]\b/);
    if (milliliters) return { grams: 0, milliliters: Number(milliliters[1]) || 0 };
    const ounces = String(label).match(/(?:^|\s)([\d.]+)\s*oz\b/i);
    if (ounces) return { grams: (Number(ounces[1]) || 0) * 28.349523125, milliliters: 0 };
    return { grams: 0, milliliters: 0 };
}

function extractNutritionNumber(value, pattern) {
    const match = String(value).match(pattern);
    return match ? positiveOrZero(match[1]) : 0;
}

function positiveOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

function asArray(value) {
    if (Array.isArray(value)) return value;
    return value && typeof value === "object" ? [value] : [];
}

function normalizeCountry(value) {
    const country = String(value || "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(country) ? country : "";
}

function cleanText(value, maxLength) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanUrl(value) {
    const url = String(value || "").trim();
    return /^https:\/\//i.test(url) ? url.slice(0, 500) : "";
}

function clampInteger(value, min, max, fallback) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
}
