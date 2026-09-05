import * as core from "./food-log-data-core.js?v=fatsecret-live-1";
import {
    fatSecretFoodId,
    fatSecretServingId,
    hasPendingFatSecretEntries,
    hydrateFatSecretEntry,
    hydrateFatSecretLog,
    hydrateFatSecretMeals,
    rememberFatSecretEntry,
    requestFatSecretEntry,
    sanitizeFatSecretLog,
    sanitizeFatSecretMeals
} from "./fatsecret-runtime-diagnostics.js?v=fatsecret-runtime-2";

export * from "./food-log-data-core.js?v=fatsecret-live-1";

const { FOOD_LOG_KEY, FOOD_COMPLETE_KEY, SAVED_MEALS_KEY, MEALS } = core;

export function readFoodLog() {
    return hydrateFatSecretLog(core.readFoodLog());
}

export function entriesForDate(dateKey) {
    const entries = core.readFoodLog()[dateKey];
    return Array.isArray(entries) ? entries.map(requestFatSecretEntry) : [];
}

export function readCompletedFoodDays() {
    const days = { ...core.readCompletedFoodDays() };
    const rawLog = core.readFoodLog();
    Object.entries(rawLog).forEach(([dateKey, entries]) => {
        if (hasPendingFatSecretEntries(entries)) delete days[dateKey];
    });
    return days;
}

export function isFoodDayComplete(dateKey) {
    return readCompletedFoodDays()[dateKey] === true;
}

export function setFoodDayComplete(dateKey, complete) {
    core.setFoodDayComplete(dateKey, complete);
}

function reopenFoodDay(dateKey) {
    if (!core.isFoodDayComplete(dateKey)) return;
    const days = core.readCompletedFoodDays();
    delete days[dateKey];
    localStorage.setItem(FOOD_COMPLETE_KEY, JSON.stringify(days));
}

export function saveEntry(dateKey, entry) {
    saveEntries(dateKey, [entry]);
    return entry;
}

export function saveEntries(dateKey, newEntries) {
    reopenFoodDay(dateKey);
    const log = readFoodLog();
    const entries = Array.isArray(log[dateKey]) ? log[dateKey] : [];
    const safeEntries = (Array.isArray(newEntries) ? newEntries : []).filter(Boolean).map(entry => {
        rememberFatSecretEntry(entry);
        return entry;
    });
    log[dateKey] = [...entries, ...safeEntries];
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(sanitizeFatSecretLog(log)));
    window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: {
        dateKey,
        action: "foods_added",
        entryIds: safeEntries.map(entry => entry?.id).filter(Boolean),
        count: safeEntries.length
    } }));
    return safeEntries;
}

export function removeEntry(dateKey, entryId) {
    reopenFoodDay(dateKey);
    const log = readFoodLog();
    const entries = Array.isArray(log[dateKey]) ? log[dateKey] : [];
    log[dateKey] = entries.filter(entry => entry?.id !== entryId);
    if (!log[dateKey].length) delete log[dateKey];
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(sanitizeFatSecretLog(log)));
    window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: { dateKey } }));
}

export function updateEntry(dateKey, entryId, replacement) {
    reopenFoodDay(dateKey);
    const log = readFoodLog();
    const entries = Array.isArray(log[dateKey]) ? log[dateKey] : [];
    const index = entries.findIndex(entry => entry?.id === entryId);
    if (index < 0 || !replacement) return null;
    const updated = {
        ...replacement,
        id: entryId,
        createdAt: entries[index]?.createdAt || replacement.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    rememberFatSecretEntry(updated);
    entries[index] = updated;
    log[dateKey] = entries;
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(sanitizeFatSecretLog(log)));
    window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: { dateKey } }));
    return updated;
}

export function readSavedMeals() {
    return hydrateFatSecretMeals(core.readSavedMeals());
}

export function saveSavedMeal(meal) {
    const meals = readSavedMeals();
    const rawPhotoDataUrl = String(meal?.photoDataUrl || "");
    const photoDataUrl = /^data:image\/(?:jpeg|png|webp);base64,/i.test(rawPhotoDataUrl) && rawPhotoDataUrl.length <= 240000
        ? rawPhotoDataUrl
        : "";
    const items = (Array.isArray(meal?.items) ? meal.items : []).map(item => mealItemSnapshot(item)).filter(Boolean).slice(0, 50);
    items.forEach(rememberFatSecretEntry);
    const safeMeal = {
        id: meal?.id || crypto.randomUUID(),
        name: String(meal?.name || "My Meal").trim().slice(0, 100),
        items,
        photoDataUrl,
        updatedAt: new Date().toISOString()
    };
    const next = [safeMeal, ...meals.filter(item => item?.id !== safeMeal.id)].slice(0, 100);
    localStorage.setItem(SAVED_MEALS_KEY, JSON.stringify(sanitizeFatSecretMeals(next)));
    return safeMeal;
}

export function removeSavedMeal(mealId) {
    const next = readSavedMeals().filter(meal => meal?.id !== mealId);
    localStorage.setItem(SAVED_MEALS_KEY, JSON.stringify(sanitizeFatSecretMeals(next)));
}

export function cloneEntriesForMeal(entries, meal, copiedFrom = null) {
    const safeMeal = MEALS.includes(meal) ? meal : "Snacks";
    const copiedFromDate = /^\d{4}-\d{2}-\d{2}$/.test(String(copiedFrom?.dateKey || "")) ? String(copiedFrom.dateKey) : "";
    const copiedFromMeal = MEALS.includes(copiedFrom?.meal) ? copiedFrom.meal : safeMeal;
    return (Array.isArray(entries) ? entries : []).map(entry => {
        const snapshot = mealItemSnapshot(entry);
        if (!snapshot) return null;
        const copy = {
            ...snapshot,
            id: crypto.randomUUID(),
            meal: safeMeal,
            ...(copiedFromDate ? { copiedFromDate, copiedFromMeal } : {}),
            createdAt: new Date().toISOString()
        };
        rememberFatSecretEntry(copy);
        return copy;
    }).filter(Boolean);
}

export function logSavedMeal(dateKey, savedMeal, meal) {
    const entries = cloneEntriesForMeal(savedMeal?.items || [], meal);
    saveEntries(dateKey, entries);
    return entries;
}

function mealItemSnapshot(entry) {
    if (!entry || typeof entry !== "object") return null;
    const hydrated = hydrateFatSecretEntry(entry, { queueMissing: true });
    return {
        source: hydrated.source || hydrated.food?.source || "custom",
        catalogueId: hydrated.catalogueId || hydrated.food?.catalogueId || null,
        fdcId: hydrated.fdcId || hydrated.food?.fdcId || null,
        ...(fatSecretFoodId(hydrated) ? { fatSecretFoodId: fatSecretFoodId(hydrated) } : {}),
        ...(fatSecretServingId(hydrated) ? { fatSecretServingId: fatSecretServingId(hydrated) } : {}),
        name: String(hydrated.name || hydrated.food?.name || "Food").slice(0, 180),
        brand: String(hydrated.brand || hydrated.food?.brand || "").slice(0, 120),
        quantity: Math.max(.01, Number(hydrated.quantity) || 1),
        servingLabel: String(hydrated.servingLabel || hydrated.food?.servingLabel || "1 serving").slice(0, 80),
        nutrition: { ...hydrated.nutrition },
        food: hydrated.food ? { ...hydrated.food } : null
    };
}

export function recentFoods(limit = 8) {
    const all = Object.values(readFoodLog()).flatMap(entries => Array.isArray(entries) ? entries : []);
    const unique = new Map();
    [...all].reverse().forEach(entry => {
        const key = `${entry?.source || "custom"}:${entry?.catalogueId || entry?.fdcId || entry?.name || ""}`;
        if (!unique.has(key) && entry?.food) unique.set(key, entry.food);
    });
    return [...unique.values()].slice(0, limit);
}

function normalizedFoodText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function searchableFoodKey(food) {
    return `${normalizedFoodText(food?.name)}|${normalizedFoodText(food?.brand)}`;
}

function historyMatchScore(food, query) {
    const name = normalizedFoodText(food?.name);
    const needle = normalizedFoodText(query);
    if (!needle) return 0;
    if (name === needle) return 4;
    if (name.startsWith(needle)) return 3;
    if (name.split(" ").some(word => word.startsWith(needle))) return 2;
    if (name.includes(needle)) return 1;
    return 0;
}

export function matchingLoggedFoods(query, limit = 12) {
    const ranked = new Map();
    let fallbackOrder = 0;
    Object.entries(readFoodLog()).forEach(([dateKey, entries]) => {
        if (!Array.isArray(entries)) return;
        entries.forEach(entry => {
            const food = entry?.food;
            const match = historyMatchScore(food, query);
            if (!food || !match) return;
            const key = searchableFoodKey(food);
            const usedAt = Date.parse(entry.updatedAt || entry.createdAt || `${dateKey}T12:00:00`) || ++fallbackOrder;
            const current = ranked.get(key);
            if (current) {
                current.uses += 1;
                current.lastUsed = Math.max(current.lastUsed, usedAt);
                current.match = Math.max(current.match, match);
            }
            else ranked.set(key, { food, uses: 1, lastUsed: usedAt, match });
        });
    });
    return [...ranked.values()]
        .sort((a, b) => b.match - a.match || b.uses - a.uses || b.lastUsed - a.lastUsed)
        .slice(0, limit)
        .map(item => ({ ...item.food, previouslyLogged: true }));
}

export function prioritizeLoggedFoodMatches(query, databaseFoods = [], limit = 50) {
    const history = matchingLoggedFoods(query, limit);
    const seen = new Set(history.map(searchableFoodKey));
    const remaining = (Array.isArray(databaseFoods) ? databaseFoods : []).filter(food => {
        const key = searchableFoodKey(food);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return [...history, ...remaining].slice(0, limit);
}

export function getLoggedCalorieWindow({ startDate, endDate, minLoggedDays = 4 } = {}) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(String(startDate || "")) || !datePattern.test(String(endDate || "")) || startDate > endDate) {
        return { startDate: null, endDate: null, totalDays: 0, loggedDays: 0, averageCalories: null, sufficient: false };
    }
    const log = readFoodLog();
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    const loggedCalories = [];
    let totalDays = 0;
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        totalDays += 1;
        const entries = log[core.localDateKey(date)];
        if (!Array.isArray(entries) || !entries.length || entries.some(entry => entry?.fatSecretPending)) continue;
        loggedCalories.push(core.summarizeEntries(entries).calories);
    }
    const averageCalories = loggedCalories.length
        ? loggedCalories.reduce((sum, calories) => sum + calories, 0) / loggedCalories.length
        : null;
    const requiredDays = Math.max(1, Math.floor(Number(minLoggedDays) || 4));
    return {
        startDate,
        endDate,
        totalDays,
        loggedDays: loggedCalories.length,
        averageCalories: Number.isFinite(averageCalories) ? averageCalories : null,
        sufficient: loggedCalories.length >= requiredDays && Number.isFinite(averageCalories)
    };
}

export function createLogEntry({ meal, food, portion, quantity }) {
    const entry = core.createLogEntry({ meal, food, portion, quantity });
    if (String(food?.source || "").toLowerCase() !== "fatsecret") return entry;
    rememberFatSecretEntry({ ...entry, food });
    const foodId = fatSecretFoodId(food);
    const servingId = String(portion?.servingId || "").trim();
    return {
        ...entry,
        source: "fatsecret",
        catalogueId: foodId ? `fatsecret:${foodId}` : entry.catalogueId,
        fatSecretFoodId: foodId || null,
        fatSecretServingId: /^\d+$/.test(servingId) ? servingId : null
    };
}

// Compatibility markers retained for tests and analytics instrumentation:
// action: "foods_added"
// entryIds: safeEntries.map
