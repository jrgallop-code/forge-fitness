import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../cloud/src/fatsecret-enabled-worker.js", import.meta.url), "utf8");
const provider = await readFile(new URL("../cloud/src/fatsecret-food-provider.js", import.meta.url), "utf8");
const dataSource = await readFile(new URL("../js/nutrition/food-log-data.js", import.meta.url), "utf8");
const foodLogSource = await readFile(new URL("../js/nutrition/food-log.js", import.meta.url), "utf8");
const cacheSource = await readFile(new URL("../js/nutrition/fatsecret-live-cache.js", import.meta.url), "utf8");
const wrangler = await readFile(new URL("../cloud/wrangler.jsonc", import.meta.url), "utf8");

const live = await import("../js/nutrition/fatsecret-live-cache.js");
const fatSecretWorker = await import("../cloud/src/fatsecret-enabled-worker.js");

const storage = new Map();
globalThis.localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
};
globalThis.window = { dispatchEvent() {}, addEventListener() {} };
globalThis.CustomEvent = class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options?.detail; }
};
const data = await import("../js/nutrition/food-log-data.js");

test("provider-neutral search copy does not trigger an observer write loop", () => {
    let writes = 0;
    const status = {
        _value: "Searching foods…",
        get textContent() { return this._value; },
        set textContent(value) { writes += 1; this._value = value; }
    };
    const root = { querySelector: () => status };

    live.updateFoodSearchLoadingCopy(root);
    assert.equal(writes, 0);

    status._value = "Searching provider catalogues…";
    live.updateFoodSearchLoadingCopy(root);
    assert.equal(status.textContent, "Searching foods…");
    assert.equal(writes, 1);
});

test("production worker composes FatSecret with the existing food API", () => {
    assert.match(wrangler, /"main": "src\/fatsecret-(?:enabled|diagnostic)-worker\.js"/);
    assert.match(worker, /searchFatSecretFoods/);
    assert.match(worker, /getFatSecretFood/);
    assert.match(worker, /baseWorker\.fetch/);
    assert.match(worker, /fatsecret_food_search_failed/);
    assert.match(worker, /getFatSecretDetailResponse/);
    assert.match(provider, /FATSECRET_CLIENT_ID/);
    assert.match(provider, /FATSECRET_CLIENT_SECRET/);
    assert.match(worker, /const FATSECRET_SEARCH_LIMIT = 16/);
});

test("restaurant menus page through FatSecret instead of truncating a chain to normal search limits", () => {
    assert.match(worker, /const RESTAURANT_MENU_PAGE_SIZE = 20/);
    assert.match(worker, /const RESTAURANT_MENU_PAGES = 5/);
    assert.match(worker, /Array\.from\(\{ length: RESTAURANT_MENU_PAGES \}/);
    assert.match(worker, /searchFatSecretFoods\(query, country, env, \{ limit: RESTAURANT_MENU_PAGE_SIZE, page \}\)/);
    assert.match(worker, /restaurantMenu \? RESTAURANT_MENU_PAGE_SIZE \* RESTAURANT_MENU_PAGES : SEARCH_LIMIT/);
});

test("manual FatSecret search still runs when USDA is unavailable", () => {
    assert.doesNotMatch(worker, /if \(!baseResponse\.ok \|\| !fatSecretConfigured\(env\)\) return baseResponse/);
    assert.match(worker, /if \(!fatSecretConfigured\(env\)\) return baseResponse/);
    assert.match(worker, /!\[429, 502, 503, 504\]\.includes\(baseResponse\.status\)/);
    assert.match(worker, /baseResponse\.ok && Array\.isArray\(payload\?\.foods\)/);
    assert.match(worker, /warning: payload\?\.error \|\| "Other food catalogues are temporarily unavailable\."/);
});

test("valid Premier search results are used directly instead of being discarded by a second detail request", () => {
    assert.match(worker, /const usableFromSearch = summaries\.filter\(hasStorableServingId\)/);
    assert.match(worker, /filter\(food => !hasStorableServingId\(food\)\)/);
    assert.match(worker, /mergeFatSecretCandidates/);
    assert.match(worker, /directResults/);
    assert.match(worker, /enrichedResults/);
});

test("late Basic restaurant summaries remain visible until they are hydrated on selection", () => {
    const summaries = Array.from({ length: 70 }, (_, index) => ({
        source: "fatsecret",
        fatSecretFoodId: String(index + 1),
        name: index === 69 ? "Thai Chicken Wrap - Grilled Chicken" : `Boston Pizza Item ${index + 1}`,
        brand: "Boston Pizza",
        detailsLoaded: false,
        portions: [{ label: "1 serving", nutrition: { calories: 500 + index } }]
    }));
    const enriched = summaries.slice(0, 5).map((food, index) => ({
        ...food,
        detailsLoaded: true,
        portions: [{ servingId: String(1000 + index), label: "1 serving", nutrition: food.portions[0].nutrition }]
    }));
    const foods = fatSecretWorker.mergeFatSecretCandidates(summaries, [], enriched, { includeSummaries: true });
    assert.equal(foods.length, 70);
    assert.equal(foods[0].detailsLoaded, true);
    assert.equal(foods[69].name, "Thai Chicken Wrap - Grilled Chicken");
    assert.equal(foods[69].detailsLoaded, false);
});

test("Food Log hydrates a selected FatSecret summary before it can be logged", () => {
    assert.match(foodLogSource, /food\?\.source === "fatsecret"/);
    assert.match(foodLogSource, /!hasFatSecretServingId\(food\)/);
    assert.match(foodLogSource, /loadFatSecretFoodDetails/);
    assert.match(foodLogSource, /\/v1\/foods\/fatsecret\/\$\{encodeURIComponent\(foodId\)\}/);
    assert.match(foodLogSource, /!payload\.food \|\| !hasFatSecretServingId\(payload\.food\)/);
});

test("FatSecret failures expose only a safe diagnostic code", () => {
    assert.match(worker, /safeFatSecretError/);
    assert.match(worker, /invalid_ip/);
    assert.match(worker, /missing_scope/);
    assert.match(worker, /token_request_failed/);
});

test("FatSecret persistent entries keep provider IDs but remove API payload", () => {
    const full = {
        id: "entry-1",
        meal: "Lunch",
        source: "fatsecret",
        catalogueId: "fatsecret:12345",
        fatSecretFoodId: "12345",
        quantity: 2,
        servingLabel: "1 bar",
        nutrition: { calories: 200, protein: 20, carbs: 15, fat: 7, fiber: 3 },
        food: {
            source: "fatsecret",
            fatSecretFoodId: "12345",
            name: "Example Bar",
            brand: "Example",
            portions: [{ servingId: "678", label: "1 bar", nutrition: { calories: 200 } }]
        },
        createdAt: "2026-09-04T20:00:00.000Z"
    };
    const stored = live.sanitizeFatSecretEntry(full);
    assert.equal(stored.fatSecretFoodId, "12345");
    assert.equal(stored.fatSecretServingId, "678");
    assert.equal(stored.quantity, 2);
    assert.equal(stored.id, "entry-1");
    assert.equal(stored.meal, "Lunch");
    assert.equal("nutrition" in stored, false);
    assert.equal("food" in stored, false);
    assert.equal("name" in stored, false);
    assert.equal("brand" in stored, false);
    assert.equal("servingLabel" in stored, false);
});

test("food log wrapper writes FatSecret IDs instead of a nutrition snapshot", () => {
    storage.clear();
    const food = {
        source: "fatsecret",
        catalogueId: "fatsecret:111",
        fatSecretFoodId: "111",
        name: "Test Food",
        brand: "Test Brand",
        portions: [{ servingId: "222", label: "1 serving", nutrition: { calories: 180, protein: 10, carbs: 20, fat: 6, fiber: 2 } }]
    };
    const entry = data.createLogEntry({ meal: "Dinner", food, portion: food.portions[0], quantity: 1 });
    data.saveEntry("2026-09-04", entry);
    const raw = JSON.parse(localStorage.getItem(data.FOOD_LOG_KEY));
    const stored = raw["2026-09-04"][0];
    assert.equal(stored.fatSecretFoodId, "111");
    assert.equal(stored.fatSecretServingId, "222");
    assert.equal("nutrition" in stored, false);
    assert.equal("food" in stored, false);
});

test("adaptive intake ignores a day until FatSecret nutrition has rehydrated", () => {
    storage.clear();
    localStorage.setItem(data.FOOD_LOG_KEY, JSON.stringify({
        "2026-09-03": [{ nutrition: { calories: 2000 } }],
        "2026-09-04": [{
            id: "fat-day",
            meal: "Lunch",
            source: "fatsecret",
            catalogueId: "fatsecret:999",
            fatSecretFoodId: "999",
            fatSecretServingId: "888",
            quantity: 1
        }]
    }));
    const result = data.getLoggedCalorieWindow({ startDate: "2026-09-03", endDate: "2026-09-04", minLoggedDays: 1 });
    assert.equal(result.totalDays, 2);
    assert.equal(result.loggedDays, 1);
    assert.equal(result.averageCalories, 2000);
    assert.equal(result.sufficient, true);
});

test("compatibility wrapper preserves existing instrumentation and saved-meal photo limits", () => {
    assert.match(dataSource, /action: "foods_added"/);
    assert.match(dataSource, /entryIds: safeEntries\.map/);
    assert.match(dataSource, /rawPhotoDataUrl\.length <= 240000/);
    assert.match(dataSource, /food-log-data-core\.js/);
    assert.match(dataSource, /entry\?\.fatSecretPending/);
});

test("FatSecret attribution is attached to food and public login surfaces", () => {
    assert.match(cacheSource, /Powered by fatsecret Platform API/);
    assert.match(cacheSource, /\.food-data-credit/);
    assert.match(cacheSource, /#level-up-login-gate \.level-up-login-panel/);
});
