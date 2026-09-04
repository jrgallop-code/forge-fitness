const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const FOOD_LOG_KEY = "level_up_food_log_v1";
const SAVED_MEALS_KEY = "level_up_saved_meals_v1";
const MAX_SESSION_FOODS = 60;

const foods = new Map();
const pending = new Map();
let queuedCount = 0;

export function isFatSecretEntry(entry) {
    return Boolean(fatSecretFoodId(entry));
}

export function fatSecretFoodId(entry) {
    const explicit = String(entry?.fatSecretFoodId || entry?.food?.fatSecretFoodId || "").trim();
    if (/^\d+$/.test(explicit)) return explicit;
    const catalogue = String(entry?.catalogueId || entry?.food?.catalogueId || "");
    const match = catalogue.match(/^fatsecret:(\d+)$/i);
    return match?.[1] || "";
}

export function fatSecretServingId(entry) {
    const explicit = String(entry?.fatSecretServingId || "").trim();
    if (/^\d+$/.test(explicit)) return explicit;
    const label = String(entry?.servingLabel || "");
    const portions = Array.isArray(entry?.food?.portions) ? entry.food.portions : [];
    const selected = portions.find(portion => String(portion?.label || "") === label) || portions.find(portion => portion?.servingId);
    const value = String(selected?.servingId || "").trim();
    return /^\d+$/.test(value) ? value : "";
}

export function rememberFatSecretEntry(entry) {
    const foodId = fatSecretFoodId(entry);
    if (!foodId) return entry;
    const food = entry?.food?.source === "fatsecret" ? entry.food : entry?.source === "fatsecret" && entry?.portions ? entry : null;
    if (food) foods.set(foodId, food);
    else queueFood(foodId);
    return entry;
}

export function sanitizeFatSecretEntry(entry) {
    if (!entry || typeof entry !== "object") return entry;
    const foodId = fatSecretFoodId(entry);
    if (!foodId) return entry;
    rememberFatSecretEntry(entry);
    const servingId = fatSecretServingId(entry);
    const result = {
        source: "fatsecret",
        catalogueId: `fatsecret:${foodId}`,
        fatSecretFoodId: foodId,
        ...(servingId ? { fatSecretServingId: servingId } : {}),
        quantity: Math.max(.01, Number(entry.quantity) || 1)
    };
    ["id", "meal", "createdAt", "updatedAt", "copiedFromDate", "copiedFromMeal"].forEach(key => {
        if (entry[key] !== undefined && entry[key] !== null && entry[key] !== "") result[key] = entry[key];
    });
    return result;
}

export function hydrateFatSecretEntry(entry) {
    if (!entry || typeof entry !== "object") return entry;
    const foodId = fatSecretFoodId(entry);
    if (!foodId) return entry;
    const food = foods.get(foodId);
    if (!food) {
        queueFood(foodId);
        return {
            ...entry,
            source: "fatsecret",
            catalogueId: `fatsecret:${foodId}`,
            fatSecretFoodId: foodId,
            name: "FatSecret food",
            brand: "",
            servingLabel: "Refreshing…",
            nutrition: emptyNutrition(),
            food: null,
            fatSecretPending: true
        };
    }
    const wantedServing = String(entry.fatSecretServingId || "");
    const portions = Array.isArray(food.portions) ? food.portions : [];
    const portion = portions.find(item => String(item?.servingId || "") === wantedServing) || portions[0];
    if (!portion) return { ...entry, fatSecretPending: true, nutrition: emptyNutrition(), food: null };
    const quantity = Math.max(.01, Number(entry.quantity) || 1);
    return {
        ...entry,
        source: "fatsecret",
        catalogueId: `fatsecret:${foodId}`,
        fatSecretFoodId: foodId,
        fatSecretServingId: String(portion.servingId || wantedServing || "") || null,
        name: String(food.name || "FatSecret food"),
        brand: String(food.brand || ""),
        quantity,
        servingLabel: String(portion.label || "1 serving"),
        nutrition: scaledNutrition(portion.nutrition, quantity),
        food,
        fatSecretPending: false
    };
}

export function hydrateFatSecretLog(log) {
    if (!log || typeof log !== "object" || Array.isArray(log)) return {};
    return Object.fromEntries(Object.entries(log).map(([date, entries]) => [
        date,
        Array.isArray(entries) ? entries.map(hydrateFatSecretEntry) : entries
    ]));
}

export function sanitizeFatSecretLog(log) {
    if (!log || typeof log !== "object" || Array.isArray(log)) return {};
    return Object.fromEntries(Object.entries(log).map(([date, entries]) => [
        date,
        Array.isArray(entries) ? entries.map(sanitizeFatSecretEntry) : entries
    ]));
}

export function hydrateFatSecretMeals(meals) {
    return (Array.isArray(meals) ? meals : []).map(meal => ({
        ...meal,
        items: (Array.isArray(meal?.items) ? meal.items : []).map(hydrateFatSecretEntry)
    }));
}

export function sanitizeFatSecretMeals(meals) {
    return (Array.isArray(meals) ? meals : []).map(meal => ({
        ...meal,
        items: (Array.isArray(meal?.items) ? meal.items : []).map(sanitizeFatSecretEntry)
    }));
}

export function hasPendingFatSecretEntries(entries) {
    return (Array.isArray(entries) ? entries : []).some(entry => isFatSecretEntry(entry) && hydrateFatSecretEntry(entry)?.fatSecretPending);
}

async function queueFood(foodId) {
    if (!foodId || foods.has(foodId) || pending.has(foodId) || queuedCount >= MAX_SESSION_FOODS) return;
    const token = sessionToken();
    if (!token) return;
    queuedCount += 1;
    const task = fetchFood(foodId, token)
        .catch(error => console.warn("FatSecret food refresh failed:", error?.message || error))
        .finally(() => pending.delete(foodId));
    pending.set(foodId, task);
    await task;
}

async function fetchFood(foodId, token) {
    const country = String(globalThis.navigator?.language || "en-CA").toUpperCase().endsWith("-US") ? "US" : "CA";
    const response = await fetch(`${API_URL}/v1/foods/fatsecret/${encodeURIComponent(foodId)}?country=${country}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.food) throw new Error(payload.error || "FatSecret food could not be refreshed.");
    foods.set(String(foodId), payload.food);
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: { action: "fatsecret_refreshed", foodId: String(foodId) } }));
    }
}

function sessionToken() {
    try {
        const session = JSON.parse(globalThis.localStorage?.getItem?.(SESSION_KEY) || "null");
        return session?.token || "";
    }
    catch { return ""; }
}

function scaledNutrition(nutrition, quantity) {
    return ["calories", "protein", "carbs", "fat", "fiber"].reduce((result, key) => {
        result[key] = Math.max(0, Number(nutrition?.[key]) || 0) * quantity;
        return result;
    }, {});
}

function emptyNutrition() {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

function queuePersistedIds() {
    if (!globalThis.localStorage) return;
    const ids = new Set();
    try {
        const log = JSON.parse(localStorage.getItem(FOOD_LOG_KEY) || "{}");
        Object.values(log || {}).flatMap(entries => Array.isArray(entries) ? entries : []).forEach(entry => {
            const id = fatSecretFoodId(entry); if (id) ids.add(id);
        });
        const meals = JSON.parse(localStorage.getItem(SAVED_MEALS_KEY) || "[]");
        (Array.isArray(meals) ? meals : []).flatMap(meal => Array.isArray(meal?.items) ? meal.items : []).forEach(entry => {
            const id = fatSecretFoodId(entry); if (id) ids.add(id);
        });
    }
    catch {}
    [...ids].slice(0, MAX_SESSION_FOODS).forEach(id => void queueFood(id));
}

function ensureAttribution(root = globalThis.document) {
    if (!root?.querySelector) return;
    const href = "https://platform.fatsecret.com";
    const credit = root.querySelector(".food-data-credit");
    if (credit && !credit.querySelector("[data-fatsecret-attribution]")) {
        credit.insertAdjacentHTML("beforeend", ` <a data-fatsecret-attribution href="${href}" target="_blank" rel="noopener">Powered by fatsecret Platform API</a>`);
    }
    const sheet = root.querySelector(".food-sheet-card");
    if (sheet && !sheet.querySelector("[data-fatsecret-attribution]")) {
        const note = document.createElement("small");
        note.dataset.fatsecretAttribution = "true";
        note.style.cssText = "display:block;text-align:center;margin:6px 12px 10px;color:var(--muted,#8f8f98);font-size:9px";
        note.innerHTML = `<a href="${href}" target="_blank" rel="noopener" style="color:inherit">Powered by fatsecret Platform API</a>`;
        sheet.appendChild(note);
    }
    const login = root.querySelector("#level-up-login-gate .level-up-login-panel");
    if (login && !login.querySelector("[data-fatsecret-attribution]")) {
        const note = document.createElement("p");
        note.dataset.fatsecretAttribution = "true";
        note.style.cssText = "margin:8px 0 0;text-align:center;opacity:.65;font-size:9px";
        note.innerHTML = `<a href="${href}" target="_blank" rel="noopener" style="color:inherit">Powered by fatsecret Platform API</a>`;
        login.appendChild(note);
    }
}

if (typeof window !== "undefined") {
    queueMicrotask(queuePersistedIds);
    window.addEventListener("online", queuePersistedIds, { passive: true });
    window.addEventListener("levelup:cloud-session-started", queuePersistedIds);
    window.addEventListener("storage", event => { if (event.key === SESSION_KEY) queuePersistedIds(); });
    if (typeof document !== "undefined") {
        const start = () => {
            ensureAttribution(document);
            new MutationObserver(() => ensureAttribution(document)).observe(document.body, { childList: true, subtree: true });
        };
        if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
    }
}
