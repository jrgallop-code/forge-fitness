export const FOOD_LOG_KEY = "level_up_food_log_v1";
export const CUSTOM_FOODS_KEY = "level_up_custom_foods_v1";
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

export function saveEntry(dateKey, entry) {
    const log = readFoodLog();
    const entries = Array.isArray(log[dateKey]) ? log[dateKey] : [];
    log[dateKey] = [...entries, entry];
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(log));
    window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: { dateKey } }));
    return entry;
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

export function recentFoods(limit = 8) {
    const all = Object.values(readFoodLog()).flatMap(entries => Array.isArray(entries) ? entries : []);
    const unique = new Map();
    [...all].reverse().forEach(entry => {
        const key = `${entry?.source || "custom"}:${entry?.fdcId || entry?.name || ""}`;
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
