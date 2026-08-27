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
const { barcodeVariants, dedupeUsdaFoods, detectUsdaBrandSearch, isValidBarcode, mergeFoodResults, normalizeBarcode, normalizeUsdaFood, normalizeVerifiedFood, rankUsdaBrandFoods, searchBundledVerifiedFoods, selectExactUsdaBarcodeFood } = await import("../cloud/src/index.js");

test("barcode lookup validates GTIN check digits and normalizes formatting", () => {
    assert.equal(normalizeBarcode("0 36000-29145 2"), "036000291452");
    assert.equal(isValidBarcode("036000291452"), true);
    assert.equal(isValidBarcode("4006381333931"), true);
    assert.equal(isValidBarcode("036000291453"), false);
    assert.equal(isValidBarcode("123456789"), false);
});

test("barcode matching treats UPC-A and zero-padded EAN/GTIN as the same product", () => {
    assert.deepEqual(barcodeVariants("036000291452"), ["036000291452", "0036000291452", "00036000291452"]);
    assert.deepEqual(barcodeVariants("0036000291452"), ["0036000291452", "00036000291452", "036000291452"]);
    const selected = selectExactUsdaBarcodeFood([
        { fdcId: 1, gtinUpc: "111111111111", description: "Wrong food" },
        { fdcId: 2, gtinUpc: "0036000291452", description: "Right food", servingSize: 30, labelNutrients: { calories: { value: 120 } } }
    ], "036000291452");
    assert.equal(selected.fdcId, 2);
});

test("barcode endpoint retries equivalent USDA barcode forms before reporting not found", async () => {
    const worker = await readFile(new URL("../cloud/src/index.js", import.meta.url), "utf8");
    assert.match(worker, /const queries = barcodeVariants\(barcode\)/);
    assert.match(worker, /queries\.slice\(1\)\.map\(query => fetchUsdaBarcodeVariant/);
    assert.match(worker, /selectExactUsdaBarcodeFood\(results\.flatMap/);
});

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

test("yesterday's meal is cloned in full without changing its source entries", () => {
    storage.clear();
    const food = { source: "custom", name: "Potatoes", nutrition: { calories: 180, protein: 4, carbs: 40, fat: 0 }, portions: [] };
    const source = [
        data.createLogEntry({ meal: "Dinner", food, portion: { label: "1 plate", nutrition: food.nutrition }, quantity: 1 }),
        data.createLogEntry({ meal: "Dinner", food: { ...food, name: "Chicken" }, portion: { label: "1 serving", nutrition: { calories: 220, protein: 40, carbs: 0, fat: 6 } }, quantity: 1 })
    ];
    data.saveEntries("2026-08-26", source);
    const clones = data.cloneEntriesForMeal(source, "Lunch");
    data.saveEntries("2026-08-27", clones);
    assert.equal(data.previousDateKey("2026-08-27"), "2026-08-26");
    assert.equal(data.mealPreview(source), "Potatoes and 1 more");
    assert.deepEqual(data.entriesForDate("2026-08-27").map(entry => entry.meal), ["Lunch", "Lunch"]);
    assert.notEqual(clones[0].id, source[0].id);
    assert.equal(data.entriesForDate("2026-08-26")[0].meal, "Dinner");
});

test("saved meals remain reusable and log their foods to the chosen meal", () => {
    storage.clear();
    const food = { source: "custom", name: "Greek Yogurt", nutrition: { calories: 130, protein: 20, carbs: 8, fat: 1 }, portions: [] };
    const entry = data.createLogEntry({ meal: "Breakfast", food, portion: { label: "1 cup", nutrition: food.nutrition }, quantity: 1 });
    const saved = data.saveSavedMeal({ name: "Quick Breakfast", items: [entry] });
    const logged = data.logSavedMeal("2026-08-27", saved, "Snacks");
    assert.equal(data.readSavedMeals()[0].name, "Quick Breakfast");
    assert.equal(logged[0].meal, "Snacks");
    assert.equal(data.entriesForDate("2026-08-27")[0].name, "Greek Yogurt");
    data.removeSavedMeal(saved.id);
    assert.deepEqual(data.readSavedMeals(), []);
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
    assert.match(html, /css\/food-log\.css\?v=food-search-lazy-1/);
});

test("Level Up verified foods use the official item serving before a 100 g option", () => {
    const food = normalizeVerifiedFood({
        id: "grenade-cookie-dough-60g",
        name: "Chocolate Chip Cookie Dough Protein Bar",
        brand: "Grenade",
        category: "Protein bar",
        country_code: "CA",
        serving_label: "1 bar (60 g)",
        serving_grams: 60,
        calories: 208,
        protein_g: 21,
        carbs_g: 18,
        fat_g: 7.8,
        fiber_g: 2.7,
        source_name: "Grenade",
        source_url: "https://www.grenade.com/products/protein-bar-cookie-dough",
        verified_at: "2026-08-27"
    });
    assert.equal(food.source, "levelup");
    assert.equal(food.detailsLoaded, true);
    assert.equal(food.portions[0].label, "1 bar (60 g)");
    assert.equal(food.portions[0].nutrition.calories, 208);
    assert.equal(food.portions[1].label, "100 g");
    assert.equal(Math.round(food.portions[1].nutrition.calories), 347);
    assert.equal(food.provenance.sourceName, "Grenade");
});

test("Level Up verified matches rank before USDA and replace exact duplicates", () => {
    const verified = [{ source: "levelup", name: "Hamburger", brand: "McDonald's" }];
    const usda = [
        { source: "usda", name: "HAMBURGER", brand: "McDonald's" },
        { source: "usda", name: "Hamburger, plain", brand: "USDA" }
    ];
    const merged = mergeFoodResults(verified, usda);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].source, "levelup");
    assert.equal(merged[1].name, "Hamburger, plain");
});

test("verified food catalogue stores provenance and item-sized restaurant servings", async () => {
    const migration = await readFile(new URL("../cloud/migrations/0005_verified_food_catalogue.sql", import.meta.url), "utf8");
    assert.match(migration, /CREATE TABLE IF NOT EXISTS verified_foods/);
    assert.match(migration, /source_url TEXT NOT NULL/);
    assert.match(migration, /'1 burger \(113 g\)'/);
    assert.match(migration, /'1 bar \(60 g\)'/);
    assert.match(migration, /McDonald''s Canada/);
});

test("logged Level Up foods preserve their catalogue identity", () => {
    const food = {
        source: "levelup",
        catalogueId: "mcd-ca-cheeseburger",
        name: "Cheeseburger",
        portions: [{ label: "1 burger (113 g)", nutrition: { calories: 290, protein: 14, carbs: 32, fat: 12 } }]
    };
    const entry = data.createLogEntry({ meal: "Lunch", food, portion: food.portions[0], quantity: 1 });
    assert.equal(entry.catalogueId, "mcd-ca-cheeseburger");
    assert.equal(entry.nutrition.calories, 290);
});

test("bundled verified foods keep the catalogue working before D1 migration", () => {
    const burgers = searchBundledVerifiedFoods("McDonald's cheeseburger");
    const bars = searchBundledVerifiedFoods("Grenade cookie dough");
    assert.equal(burgers[0].catalogueId, "mcd-ca-cheeseburger");
    assert.equal(burgers[0].portions[0].label, "1 burger (113 g)");
    assert.equal(bars[0].portions[0].nutrition.calories, 208);
});

test("known branded searches detect Grenade names and Carb Killa aliases", () => {
    assert.equal(detectUsdaBrandSearch("Grenade protein bar").name, "Grenade");
    assert.equal(detectUsdaBrandSearch("Carb Killa salted caramel").name, "Grenade");
    assert.equal(detectUsdaBrandSearch("chicken breast"), null);
});

test("brand-aware USDA results reject unrelated grenades and rank matching protein bars", () => {
    const brand = detectUsdaBrandSearch("Grenade protein bar");
    const foods = rankUsdaBrandFoods([
        { fdcId: 1, description: "GRENADES, GRAPE BOMB", brandName: "GRENADES", foodCategory: "Chewing Gum & Mints" },
        { fdcId: 2, description: "CHOCOLATE CHIP COOKIE DOUGH HIGH PROTEIN BARS", brandName: "GRENADE", foodCategory: "Snack, Energy & Granola Bars" },
        { fdcId: 3, description: "PROTEIN BAR", brandName: "MET-RX", foodCategory: "Snack, Energy & Granola Bars" }
    ], "Grenade protein bar", brand);
    assert.deepEqual(foods.map(food => food.fdcId), [2]);
});

test("USDA normalization shows the consumer brand instead of a distributor owner", () => {
    const food = normalizeUsdaFood({
        fdcId: 2170186,
        gtinUpc: "4006381333931",
        description: "CHOCOLATE CHIP COOKIE DOUGH HIGH PROTEIN BARS",
        dataType: "Branded",
        brandName: "GRENADE",
        brandOwner: "Bill Blass Fashions, LLC.",
        foodNutrients: []
    });
    assert.equal(food.brand, "GRENADE");
    assert.equal(food.barcode, "4006381333931");
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

test("USDA restaurant foods default to one burger instead of 100 g", () => {
    const food = normalizeUsdaFood({
        fdcId: 789,
        description: "McDONALD'S, HAMBURGER",
        dataType: "Survey (FNDDS)",
        foodNutrients: [
            { nutrient: { number: "208", name: "Energy", unitName: "KCAL" }, amount: 250 },
            { nutrient: { number: "203", name: "Protein", unitName: "G" }, amount: 13 },
            { nutrient: { number: "205", name: "Carbohydrate, by difference", unitName: "G" }, amount: 30 },
            { nutrient: { number: "204", name: "Total lipid (fat)", unitName: "G" }, amount: 9 }
        ],
        foodPortions: [
            { amount: 1, gramWeight: 108, portionDescription: "1 sandwich" },
            { amount: 1, gramWeight: 42, portionDescription: "1 small patty" }
        ]
    });
    assert.equal(food.portions[0].label, "1 sandwich");
    assert.equal(food.portions[0].grams, 108);
    assert.equal(food.portions[0].nutrition.calories, 270);
    assert.equal(food.portions.at(-1).label, "100 g");
});

test("USDA branded foods prefer exact label nutrients for one item", () => {
    const food = normalizeUsdaFood({
        fdcId: 790,
        description: "CHEESEBURGER",
        dataType: "Branded",
        servingSize: 112,
        servingSizeUnit: "g",
        householdServingFullText: "1 burger",
        labelNutrients: {
            calories: { value: 330 }, protein: { value: 17 }, carbohydrates: { value: 31 }, fat: { value: 15 }
        },
        foodNutrients: [
            { nutrientNumber: "208", nutrientName: "Energy", unitName: "KCAL", value: 294.64 },
            { nutrientNumber: "203", nutrientName: "Protein", unitName: "G", value: 15.18 }
        ]
    });
    assert.equal(food.portions[0].label, "1 burger");
    assert.equal(food.portions[0].nutrition.calories, 330);
    assert.equal(food.portions[0].nutrition.protein, 17);
});

test("USDA search returns immediately and full serving details load only after selection", async () => {
    const [worker, browser] = await Promise.all([
        readFile(new URL("../cloud/src/index.js", import.meta.url), "utf8"),
        readFile(new URL("../js/nutrition/food-log.js", import.meta.url), "utf8")
    ]);
    assert.match(worker, /url\.pathname\.match\(\/\^\\\/v1\\\/foods\\\/\(\\d\+\)\$\//);
    assert.match(worker, /new URL\(`https:\/\/api\.nal\.usda\.gov\/fdc\/v1\/food\/\$\{fdcId\}`\)/);
    assert.doesNotMatch(worker, /fdcIds/);
    assert.match(browser, /foodDetailCache/);
    assert.match(browser, /foodSearchController\?\.abort\(\)/);
    assert.match(browser, /Loading servings/);
    assert.match(browser, /\/v1\/foods\/\$\{encodeURIComponent\(cacheKey\)\}/);
});

test("USDA duplicate records collapse to the strongest same-name result", () => {
    const weak = { source: "usda", fdcId: 1, name: "McDonald's Hamburger", brand: "", portions: [{ label: "100 g", nutrition: { calories: 250 } }] };
    const useful = { source: "usda", fdcId: 2, name: "McDonald's Hamburger", brand: "", portions: [{ label: "1 sandwich", nutrition: { calories: 270 } }] };
    const other = { source: "usda", fdcId: 3, name: "McDonald's Cheeseburger", brand: "", portions: [{ label: "1 sandwich", nutrition: { calories: 300 } }] };
    assert.deepEqual(dedupeUsdaFoods([weak, useful, other]).map(food => food.fdcId), [2, 3]);
});
