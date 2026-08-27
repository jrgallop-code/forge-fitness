export const FOOD_LOG_KEY = "level_up_food_log_v1";
export const CUSTOM_FOODS_KEY = "level_up_custom_foods_v1";
export const SAVED_MEALS_KEY = "level_up_saved_meals_v1";
export const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function readJson(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        return value ?? fallback;
    }
    catch {
        return fallback;
    }
}

export function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function readFoodLog() {
    const value = readJson(FOOD_LOG_KEY, {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function entriesForDate(dateKey) {
    const entries = readFoodLog()[dateKey];
    return Array.isArray(entries) ? entries : [];
}

export function previousDateKey(dateKey) {
    const date = new Date(`${dateKey}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return localDateKey(date);
}

export function saveEntry(dateKey, entry) {
    saveEntries(dateKey, [entry]);
    return entry;
}

export function saveEntries(dateKey, newEntries) {
    const log = readFoodLog();
    const entries = Array.isArray(log[dateKey]) ? log[dateKey] : [];
    const safeEntries = Array.isArray(newEntries) ? newEntries.filter(Boolean) : [];
    log[dateKey] = [...entries, ...safeEntries];
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(log));
    window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: { dateKey } }));
    return safeEntries;
}

export function removeEntry(dateKey, entryId) {
    const log = readFoodLog();
    const entries = Array.isArray(log[dateKey]) ? log[dateKey] : [];
    log[dateKey] = entries.filter(entry => entry?.id !== entryId);
    if (!log[dateKey].length) delete log[dateKey];
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(log));
    window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: { dateKey } }));
}

export function readCustomFoods() {
    const value = readJson(CUSTOM_FOODS_KEY, []);
    return Array.isArray(value) ? value : [];
}

export function saveCustomFood(food) {
    const foods = readCustomFoods();
    const next = [food, ...foods.filter(item => item?.id !== food.id)].slice(0, 100);
    localStorage.setItem(CUSTOM_FOODS_KEY, JSON.stringify(next));
    return food;
}

export function readSavedMeals() {
    const value = readJson(SAVED_MEALS_KEY, []);
    return Array.isArray(value) ? value : [];
}

export function saveSavedMeal(meal) {
    const meals = readSavedMeals();
    const safeMeal = {
        id: meal?.id || crypto.randomUUID(),
        name: String(meal?.name || "My Meal").trim().slice(0, 100),
        items: (Array.isArray(meal?.items) ? meal.items : []).map(item => mealItemSnapshot(item)).filter(Boolean).slice(0, 50),
        updatedAt: new Date().toISOString()
    };
    const next = [safeMeal, ...meals.filter(item => item?.id !== safeMeal.id)].slice(0, 100);
    localStorage.setItem(SAVED_MEALS_KEY, JSON.stringify(next));
    return safeMeal;
}

export function removeSavedMeal(mealId) {
    const next = readSavedMeals().filter(meal => meal?.id !== mealId);
    localStorage.setItem(SAVED_MEALS_KEY, JSON.stringify(next));
}

export function mealPreview(entries) {
    const items = (Array.isArray(entries) ? entries : []).filter(Boolean);
    if (!items.length) return "No foods";
    const first = String(items[0]?.name || "Food");
    return items.length === 1 ? first : `${first} and ${items.length - 1} more`;
}

export function cloneEntriesForMeal(entries, meal) {
    const safeMeal = MEALS.includes(meal) ? meal : "Snacks";
    return (Array.isArray(entries) ? entries : []).map(entry => ({
        ...mealItemSnapshot(entry),
        id: crypto.randomUUID(),
        meal: safeMeal,
        createdAt: new Date().toISOString()
    }));
}

export function logSavedMeal(dateKey, savedMeal, meal) {
    const entries = cloneEntriesForMeal(savedMeal?.items || [], meal);
    saveEntries(dateKey, entries);
    return entries;
}

function mealItemSnapshot(entry) {
    if (!entry || typeof entry !== "object") return null;
    return {
        source: entry.source || entry.food?.source || "custom",
        catalogueId: entry.catalogueId || entry.food?.catalogueId || null,
        fdcId: entry.fdcId || entry.food?.fdcId || null,
        name: String(entry.name || entry.food?.name || "Food").slice(0, 180),
        brand: String(entry.brand || entry.food?.brand || "").slice(0, 120),
        quantity: Math.max(.01, Number(entry.quantity) || 1),
        servingLabel: String(entry.servingLabel || entry.food?.servingLabel || "1 serving").slice(0, 80),
        nutrition: { ...entry.nutrition },
        food: entry.food ? { ...entry.food } : null
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

export function scaledNutrition(nutrition, quantity = 1) {
    const multiplier = Math.max(0, Number(quantity) || 0);
    return ["calories", "protein", "carbs", "fat", "fiber"].reduce((totals, key) => {
        totals[key] = Math.max(0, Number(nutrition?.[key]) || 0) * multiplier;
        return totals;
    }, {});
}

export function summarizeEntries(entries) {
    return (Array.isArray(entries) ? entries : []).reduce((totals, entry) => {
        const nutrition = entry?.nutrition || {};
        Object.keys(totals).forEach(key => {
            totals[key] += Math.max(0, Number(nutrition[key]) || 0);
        });
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

export function createLogEntry({ meal, food, portion, quantity }) {
    const safeMeal = MEALS.includes(meal) ? meal : "Snacks";
    const safeQuantity = Math.max(0.01, Math.min(100, Number(quantity) || 1));
    return {
        id: crypto.randomUUID(),
        meal: safeMeal,
        source: food.source || "custom",
        catalogueId: food.catalogueId || null,
        fdcId: food.fdcId || null,
        name: String(food.name || "Food").slice(0, 180),
        brand: String(food.brand || "").slice(0, 120),
        quantity: safeQuantity,
        servingLabel: String(portion?.label || food.servingLabel || "1 serving").slice(0, 80),
        nutrition: scaledNutrition(portion?.nutrition || food.nutrition, safeQuantity),
        food,
        createdAt: new Date().toISOString()
    };
}
