import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const storage = new Map();
globalThis.localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
};
globalThis.window = { addEventListener() {}, dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options?.detail; }
};

const live = await import("../js/nutrition/fatsecret-live-cache.js?v=food-search-freeze-fix-1");
const stats = await import("../js/nutrition/calorie-stats.js?test=fatsecret-progress-calories");

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

test("Nutrition Progress counts a hydrated FatSecret restaurant entry", () => {
    storage.clear();
    const date = localDateKey();
    const food = {
        source: "fatsecret",
        catalogueId: "fatsecret:12345",
        fatSecretFoodId: "12345",
        name: "Boston Pizza restaurant item",
        brand: "Boston Pizza",
        portions: [{
            servingId: "67890",
            label: "1 serving",
            nutrition: { calories: 740, protein: 42, carbs: 71, fat: 31, fiber: 5 }
        }]
    };

    live.rememberFatSecretEntry({ food });
    localStorage.setItem("level_up_food_log_v1", JSON.stringify({
        [date]: [{
            id: "restaurant-entry",
            meal: "Dinner",
            source: "fatsecret",
            catalogueId: "fatsecret:12345",
            fatSecretFoodId: "12345",
            fatSecretServingId: "67890",
            quantity: 1.5
        }]
    }));

    const day = stats.calorieDaysForRange(1)[0];
    assert.equal(day.logged, true);
    assert.equal(day.calories, 1110);
    assert.equal(day.protein, 63);
    assert.equal(day.mealCalories.Dinner, 1110);
});

test("all active Progress calorie consumers use the hydrated food-log reader", async () => {
    const paths = [
        "js/nutrition/calorie-stats.js",
        "js/nutrition/calculated-maintenance.js",
        "js/nutrition/tdee-calorie-expenditure-carousel.js",
        "js/nutrition/energy-balance-state.js",
        "js/progress/weight-calorie-context-v2.js"
    ];
    const sources = await Promise.all(paths.map(path => readFile(new URL(`../${path}`, import.meta.url), "utf8")));

    sources.forEach((source, index) => {
        assert.match(source, /import \{[^}]*readFoodLog[^}]*\}/, `${paths[index]} must import the hydrated reader`);
        assert.match(source, /const foodLog = readFoodLog\(\)|const log = readFoodLog\(\)|foodLog: readFoodLog\(\)/, `${paths[index]} must use the hydrated reader`);
    });
});

test("Dashboard energy analytics reaches FatSecret nutrition through the shared hydrated state", async () => {
    const [dashboard, state] = await Promise.all([
        readFile(new URL("../js/dashboard/dashboard-insights-analytics-v5.js", import.meta.url), "utf8"),
        readFile(new URL("../js/nutrition/energy-balance-state.js", import.meta.url), "utf8")
    ]);

    assert.match(dashboard, /getEnergyBalanceState/);
    assert.match(state, /import \{ readCompletedFoodDays, readFoodLog \}/);
    assert.match(state, /foodLog: readFoodLog\(\)/);
    assert.match(state, /completedDays: readCompletedFoodDays\(\)/);
    assert.doesNotMatch(dashboard, /localStorage\.getItem\(FOOD_LOG_KEY\)/);
});
