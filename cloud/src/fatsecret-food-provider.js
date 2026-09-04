const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_ROOT = "https://platform.fatsecret.com/rest";
const DEFAULT_SCOPE = "basic";
const REQUEST_TIMEOUT_MS = 5000;

let tokenCache = {
    key: "",
    token: "",
    expiresAt: 0
};

export function fatSecretConfigured(env = {}) {
    return Boolean(
        String(env.FATSECRET_CLIENT_ID || "").trim() &&
        String(env.FATSECRET_CLIENT_SECRET || "").trim()
    );
}

export function fatSecretScopes(env = {}) {
    return new Set(
        String(env.FATSECRET_SCOPE || DEFAULT_SCOPE)
            .toLowerCase()
            .split(/\s+/)
            .map(value => value.trim())
            .filter(Boolean)
    );
}

export function fatSecretCanLocalize(env = {}) {
    const scopes = fatSecretScopes(env);
    return scopes.has("premier") || scopes.has("localization");
}

export function fatSecretCanBarcode(env = {}) {
    return fatSecretScopes(env).has("barcode");
}

export async function searchFatSecretFoods(query, countryCode, env = {}, options = {}) {
    const searchExpression = String(query || "").trim().replace(/\s+/g, " ");
    if (!fatSecretConfigured(env) || searchExpression.length < 2) return [];

    const scopes = fatSecretScopes(env);
    const premier = scopes.has("premier");
    const maxResults = String(clampInteger(options.limit, 1, 20, 8));
    const normalizedCountry = normalizeCountry(countryCode);
    let payload;

    if (premier) {
        const url = new URL(`${FATSECRET_API_ROOT}/foods/search/v5`);
        url.searchParams.set("search_expression", searchExpression);
        url.searchParams.set("page_number", "0");
        url.searchParams.set("max_results", maxResults);
        url.searchParams.set("format", "json");
        if (normalizedCountry) {
            url.searchParams.set("region", normalizedCountry);
            url.searchParams.set("flag_default_serving", "true");
        }
        payload = await fatSecretJson(url, env);
    }
    else {
        // FatSecret's OAuth 2.0 Basic example uses the legacy method-based
        // foods.search call. The path-based foods/search/v1 endpoint is
        // documented with the Premier scope, so do not use it for Basic.
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
        });
    }

    const foods = asArray(payload?.foods?.food);
    const responseCountry = premier && normalizedCountry ? normalizedCountry : "US";
    return foods
        .map(food => normalizeFatSecretFood(food, { countryCode: responseCountry }))
        .filter(Boolean);
}

export async function getFatSecretFood(foodId, countryCode, env = {}) {
    const id = String(foodId || "").trim();
    if (!fatSecretConfigured(env) || !/^\d+$/.test(id)) return null;

    const url = new URL(`${FATSECRET_API_ROOT}/food/v5`);
    url.searchParams.set("food_id", id);
    url.searchParams.set("format", "json");

    const normalizedCountry = normalizeCountry(countryCode);
    if (fatSecretCanLocalize(env) && normalizedCountry) {
        url.searchParams.set("region", normalizedCountry);
    }

    const payload = await fatSecretJson(url, env);
    return normalizeFatSecretFood(payload?.food, {
        countryCode: fatSecretCanLocalize(env) && normalizedCountry ? normalizedCountry : "US"
    });
}

export async function findFatSecretFoodByBarcode(barcode, countryCode, env = {}) {
    if (!fatSecretConfigured(env) || !fatSecretCanBarcode(env)) return null;
    const gtin13 = toFatSecretGtin13(barcode);
    if (!gtin13) return null;

    const url = new URL(`${FATSECRET_API_ROOT}/food/barcode/find-by-id/v2`);
    url.searchParams.set("barcode", gtin13);
    url.searchParams.set("format", "json");

    const normalizedCountry = normalizeCountry(countryCode);
    if (fatSecretCanLocalize(env) && normalizedCountry) {
        url.searchParams.set("region", normalizedCountry);
    }

    const payload = await fatSecretJson(url, env);
    const normalized = normalizeFatSecretFood(payload?.food, {
        countryCode: fatSecretCanLocalize(env) && normalizedCountry ? normalizedCountry : "US",
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
        nutrition: {
            calories,
            protein,
            carbs,
            fat,
            fiber
        }
    };
}

export function toFatSecretGtin13(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 14 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length < 8 || digits.length > 13) return "";
    return digits.padStart(13, "0");
}

async function fatSecretJson(url, env, requestOptions = {}) {
    const token = await getFatSecretAccessToken(env);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const headers = new Headers(requestOptions.headers || {});
        headers.set("Authorization", `Bearer ${token}`);
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

async function getFatSecretAccessToken(env) {
    if (!fatSecretConfigured(env)) throw new Error("FatSecret is not configured.");

    const clientId = String(env.FATSECRET_CLIENT_ID || "").trim();
    const clientSecret = String(env.FATSECRET_CLIENT_SECRET || "").trim();
    const scope = String(env.FATSECRET_SCOPE || DEFAULT_SCOPE).trim() || DEFAULT_SCOPE;
    const cacheKey = `${clientId}|${scope}`;
    const now = Date.now();

    if (tokenCache.key === cacheKey && tokenCache.token && tokenCache.expiresAt - 60_000 > now) {
        return tokenCache.token;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const body = new URLSearchParams({
            grant_type: "client_credentials",
            scope
        });
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
        const lifetimeSeconds = Math.max(60, Number(payload.expires_in) || 3600);
        tokenCache = {
            key: cacheKey,
            token: String(payload.access_token),
            expiresAt: now + lifetimeSeconds * 1000
        };
        return tokenCache.token;
    }
    finally {
        clearTimeout(timeout);
    }
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
