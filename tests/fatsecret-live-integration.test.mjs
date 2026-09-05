import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../cloud/src/fatsecret-enabled-worker.js", import.meta.url), "utf8");
const provider = await readFile(new URL("../cloud/src/fatsecret-food-provider.js", import.meta.url), "utf8");
const dataSource = await readFile(new URL("../js/nutrition/food-log-data.js", import.meta.url), "utf8");
const cacheSource = await readFile(new URL("../js/nutrition/fatsecret-live-cache.js", import.meta.url), "utf8");
const wrangler = await readFile(new URL("../cloud/wrangler.jsonc", import.meta.url), "utf8");

const live = await import("../js/nutrition/fatsecret-live-cache.js");

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

test("production worker composes FatSecret with the existing food API", () => {
    assert.match(wrangler, /"main": "src\/fatsecret-(?:enabled|diagnostic)-worker\.js"/);
    assert.match(worker, /searchFatSecretFoods/);
    assert.match(worker, /getFatSecretFood/);
    assert.match(worker, /baseWorker\.fetch/);
    assert.match(worker, /fatsecret_food_search_failed/);
    assert.match(worker, /getFatSecretDetailResponse/);
    assert.match(provider, /FATSECRET_CLIENT_ID/);
    assert.match(provider, /FATSECRET_CLIENT_SECRET/);
});

test("valid Premier search results are used directly instead of being discarded by a second detail request", () => {
    assert.match(worker, /const usableFromSearch = summaries\.filter\(hasStorableServingId\)/);
    assert.match(worker, /filter\(food => !hasStorableServingId\(food\)\)/);
    assert.match(worker, /mergeFatSecretCandidates/);
    assert.match(worker, /directResults/);
    assert.match(worker, /enrichedResults/);
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
