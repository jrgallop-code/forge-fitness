import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const storage = new Map();
globalThis.localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } };

const data = await import("../js/nutrition/food-log-data.js");
const { normalizeUsdaFood } = await import("../cloud/src/index.js");

test("food log scales a serving and totals its macros", () => {
    storage.clear();
    const food = {
        source: "usda",
        fdcId: 123,
        name: "Greek yogurt",
        brand: "Example",
        portions: [{ label: "170 g cup", nutrition: { calories: 120, protein: 18, carbs: 8, fat: 1, fiber: 0 } }]
    };
    const entry = data.createLogEntry({ meal: "Breakfast", food, portion: food.portions[0], quantity: 1.5 });
    data.saveEntry("2026-08-27", entry);
    const totals = data.summarizeEntries(data.entriesForDate("2026-08-27"));
    assert.equal(totals.calories, 180);
    assert.equal(totals.protein, 27);
    assert.equal(totals.carbs, 12);
    assert.equal(totals.fat, 1.5);
});

test("food log keeps days and meals separate and removes exact entries", () => {
    storage.clear();
    const food = { source: "custom", name: "Oats", nutrition: { calories: 150, protein: 5, carbs: 27, fat: 3 }, portions: [] };
    const first = data.createLogEntry({ meal: "Breakfast", food, portion: { label: "1 bowl", nutrition: food.nutrition }, quantity: 1 });
    const second = data.createLogEntry({ meal: "Dinner", food, portion: { label: "1 bowl", nutrition: food.nutrition }, quantity: 2 });
    data.saveEntry("2026-08-27", first);
    data.saveEntry("2026-08-28", second);
    assert.equal(data.entriesForDate("2026-08-27")[0].meal, "Breakfast");
    assert.equal(data.entriesForDate("2026-08-28")[0].nutrition.calories, 300);
    data.removeEntry("2026-08-27", first.id);
    assert.deepEqual(data.entriesForDate("2026-08-27"), []);
    assert.equal(data.entriesForDate("2026-08-28").length, 1);
});

test("USDA search stays behind the Worker and the browser receives normalized foods", async () => {
    const [worker, browser, html] = await Promise.all([
        readFile(new URL("../cloud/src/index.js", import.meta.url), "utf8"),
        readFile(new URL("../js/nutrition/food-log.js", import.meta.url), "utf8"),
        readFile(new URL("../index.html", import.meta.url), "utf8")
    ]);
    assert.match(worker, /env\.USDA_FDC_API_KEY/);
    assert.match(worker, /api\.nal\.usda\.gov\/fdc\/v1\/foods\/search/);
    assert.match(worker, /url\.pathname === "\/v1\/foods\/search"/);
    assert.doesNotMatch(browser, /api\.nal\.usda\.gov/);
    assert.match(browser, /\/v1\/foods\/search\?q=/);
    assert.match(html, /css\/food-log\.css\?v=usda-food-log-1/);
});

test("USDA nutrients are converted from 100 g to the labelled gram serving", () => {
    const food = normalizeUsdaFood({
        fdcId: 456,
        description: "TEST CEREAL",
        brandOwner: "Example Foods",
        servingSize: 30,
        servingSizeUnit: "g",
        householdServingFullText: "1 cup",
        foodNutrients: [
            { nutrientNumber: "208", nutrientName: "Energy", unitName: "KCAL", value: 400 },
            { nutrientNumber: "208", nutrientName: "Energy", unitName: "kJ", value: 1674 },
            { nutrientNumber: "203", nutrientName: "Protein", unitName: "G", value: 10 },
            { nutrientNumber: "205", nutrientName: "Carbohydrate, by difference", unitName: "G", value: 70 },
            { nutrientNumber: "204", nutrientName: "Total lipid (fat)", unitName: "G", value: 5 }
        ]
    });
    assert.equal(food.portions[0].label, "1 cup");
    assert.equal(food.portions[0].nutrition.calories, 120);
    assert.equal(food.portions[0].nutrition.protein, 3);
    assert.equal(food.portions[1].nutrition.calories, 400);
});
