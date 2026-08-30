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
const { barcodeVariants, consumerUsdaProductName, dedupeUsdaFoods, detectUsdaBrandSearch, findBundledVerifiedFoodByBarcode, isValidBarcode, mergeFoodResults, normalizeBarcode, normalizeOpenFoodFactsProduct, normalizeOpenFoodFactsSearchProducts, normalizeUsdaFood, normalizeVerifiedFood, rankFoodNameMatches, rankRestaurantFoods, rankUsdaBrandFoods, searchBundledVerifiedFoods, searchCachedExternalFoods, selectExactUsdaBarcodeFood, validateRestaurantFoodCandidate } = await import("../cloud/src/index.js");

test("restaurant staging accepts exact official nutrition and marks calories-only records", () => {
    const validation = validateRestaurantFoodCandidate({
        name: "Avocado Lox", brand: "Pür & Simple", countryCode: "CA", servingLabel: "1 order",
        calories: 720, sourceName: "Pür & Simple Canada", sourceUrl: "https://pursimple.com/nutrition.pdf",
        sourceType: "official_restaurant", verifiedAt: "2026-08-30"
    });
    assert.equal(validation.valid, true);
    assert.equal(validation.food.nutritionScope, "calories_only");
});

test("restaurant staging rejects ranges and non-official URLs", () => {
    const validation = validateRestaurantFoodCandidate({
        name: "Burger", brand: "Example", countryCode: "US", servingLabel: "1 burger",
        calories: "500-600", sourceName: "Blog", sourceUrl: "http://example.com/post", verifiedAt: "today"
    });
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some(error => error.includes("calories")));
    assert.ok(validation.errors.some(error => error.includes("HTTPS")));
});

test("restaurant ranking prefers the user's country while keeping regional variants", () => {
    const ca = normalizeVerifiedFood({ id: "ca", name: "Burger", brand: "Chain", country_code: "CA", serving_label: "1 burger", calories: 500, protein_g: 20, carbs_g: 40, fat_g: 25, verification_status: "verified" });
    const us = normalizeVerifiedFood({ id: "us", name: "Burger", brand: "Chain", country_code: "US", serving_label: "1 burger", calories: 530, protein_g: 22, carbs_g: 41, fat_g: 27, verification_status: "verified" });
    const merged = mergeFoodResults([us], [ca]);
    assert.equal(merged.length, 2);
    assert.equal(rankRestaurantFoods(merged, "burger", "CA")[0].countryCode, "CA");
});

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

test("food log preserves gram amounts above 100 from barcode portions", () => {
    storage.clear();
    const food = {
        source: "openfoodfacts",
        barcode: "12345670",
        name: "Red potatoes",
        portions: [{ label: "1 g", grams: 1, nutrition: { calories: .8, protein: .02, carbs: .18, fat: 0 } }]
    };
    const entry = data.createLogEntry({ meal: "Dinner", food, portion: food.portions[0], quantity: 250 });
    assert.equal(entry.quantity, 250);
    assert.equal(entry.servingLabel, "1 g");
    assert.equal(entry.nutrition.calories, 200);
    assert.equal(entry.nutrition.carbs, 45);
});

test("matching logged foods rank prefix matches by frequency and recency", () => {
    storage.clear();
    const chunky = { source: "openfoodfacts", barcode: "11111111", name: "Chunky Guacamole", brand: "Example", portions: [{ label: "30 g", nutrition: { calories: 50 } }] };
    const chicken = { source: "usda", fdcId: 22, name: "Chunky Chicken Soup", brand: "Example", portions: [{ label: "1 cup", nutrition: { calories: 120 } }] };
    const unrelated = { source: "usda", fdcId: 33, name: "Greek Yogurt", brand: "Example", portions: [{ label: "1 cup", nutrition: { calories: 100 } }] };
    data.saveEntries("2026-08-25", [
        data.createLogEntry({ meal: "Snacks", food: chunky, portion: chunky.portions[0], quantity: 1 }),
        data.createLogEntry({ meal: "Lunch", food: chicken, portion: chicken.portions[0], quantity: 1 })
    ]);
    data.saveEntries("2026-08-27", [
        data.createLogEntry({ meal: "Snacks", food: chunky, portion: chunky.portions[0], quantity: 1 }),
        data.createLogEntry({ meal: "Breakfast", food: unrelated, portion: unrelated.portions[0], quantity: 1 })
    ]);
    const matches = data.matchingLoggedFoods("chun");
    assert.deepEqual(matches.map(food => food.name), ["Chunky Guacamole", "Chunky Chicken Soup"]);
    assert.equal(matches[0].previouslyLogged, true);
});

test("previously logged matches stay above database foods without duplicates", () => {
    const results = data.prioritizeLoggedFoodMatches("chun", [
        { source: "openfoodfacts", name: "Chunky Guacamole", brand: "Example" },
        { source: "usda", name: "Chunk Roast", brand: "Other" }
    ]);
    assert.equal(results[0].name, "Chunky Guacamole");
    assert.equal(results[0].previouslyLogged, true);
    assert.equal(results.filter(food => food.name === "Chunky Guacamole").length, 1);
    assert.equal(results.at(-1).name, "Chunk Roast");
});

test("previously logged food search does not match manufacturer name alone", () => {
    storage.clear();
    const unrelated = { source: "openfoodfacts", barcode: "11111111", name: "M&M's Milk Chocolate Candies", brand: "Mars Incorporated", portions: [{ label: "1 bag", nutrition: { calories: 200 } }] };
    const marsBar = { source: "openfoodfacts", barcode: "22222222", name: "Mars Bar", brand: "Mars Incorporated", portions: [{ label: "1 bar", nutrition: { calories: 230 } }] };
    data.saveEntries("2026-08-29", [
        data.createLogEntry({ meal: "Snacks", food: unrelated, portion: unrelated.portions[0], quantity: 1 }),
        data.createLogEntry({ meal: "Snacks", food: marsBar, portion: marsBar.portions[0], quantity: 1 })
    ]);

    assert.deepEqual(data.matchingLoggedFoods("Mars").map(food => food.name), ["Mars Bar"]);
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

test("logged foods can be edited without changing their identity or position", () => {
    storage.clear();
    const food = { source: "custom", name: "Oats", portions: [{ label: "1 bowl", nutrition: { calories: 150, protein: 5, carbs: 27, fat: 3 } }] };
    const first = data.createLogEntry({ meal: "Breakfast", food, portion: food.portions[0], quantity: 1 });
    const second = data.createLogEntry({ meal: "Breakfast", food: { ...food, name: "Banana" }, portion: food.portions[0], quantity: 1 });
    data.saveEntries("2026-08-27", [first, second]);
    const replacement = data.createLogEntry({ meal: "Lunch", food, portion: food.portions[0], quantity: 2 });
    const updated = data.updateEntry("2026-08-27", first.id, replacement);
    const entries = data.entriesForDate("2026-08-27");
    assert.equal(updated.id, first.id);
    assert.equal(entries[0].meal, "Lunch");
    assert.equal(entries[0].nutrition.calories, 300);
    assert.equal(entries[1].name, "Banana");
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
    assert.match(html, /css\/food-log\.css\?v=meal-macros-2/);
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
    assert.equal(food.portions[2].label, "1 g");
    assert.equal(Math.round(food.portions[2].nutrition.calories * 100), 347);
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

test("manual search finds products previously discovered by barcode", () => {
    const cached = {
        cacheSchema: 2,
        source: "openfoodfacts",
        barcode: "12345670",
        name: "Pomme de terre rouge",
        brand: "Ferme Exemple",
        portions: [{ label: "100 g", grams: 100, nutrition: { calories: 89, protein: 2, carbs: 20, fat: 0 } }]
    };
    const byName = searchCachedExternalFoods([{ food_json: JSON.stringify(cached) }], "pomme terre rouge");
    const byBrand = searchCachedExternalFoods([{ food_json: JSON.stringify(cached) }], "Ferme Exemple");
    assert.equal(byName[0].barcode, "12345670");
    assert.equal(byBrand[0].name, "Pomme de terre rouge");
});

test("manual search normalizes live Open Food Facts text results", () => {
    const foods = normalizeOpenFoodFactsSearchProducts({ products: [{
        code: "12345670",
        product_name: "Pomme de terre rouge",
        brands: "Ferme Exemple",
        serving_size: "100 g",
        serving_quantity: 100,
        nutriments: {
            "energy-kcal_100g": 89,
            "proteins_100g": 2,
            "carbohydrates_100g": 20,
            "fat_100g": 0
        }
    }] });
    assert.equal(foods[0].name, "Pomme de terre rouge");
    assert.equal(foods[0].source, "openfoodfacts");
    assert.equal(foods[0].portions[0].nutrition.calories, 89);
});

test("manual search matches product names instead of manufacturer names", () => {
    const results = rankFoodNameMatches([
        { name: "Mars Bar", brand: "Mars Incorporated" },
        { name: "M&M's Milk Chocolate Candies", brand: "Mars Incorporated" },
        { name: "Chocolate Candy", brand: "Mars Incorporated" },
        { name: "Mars Protein Bar", brand: "Example Foods" }
    ], "Mars bar");

    assert.deepEqual(results.map(food => food.name), ["Mars Bar", "Mars Protein Bar"]);
});

test("USDA legacy descriptions remove embedded manufacturers before matching", () => {
    const snickers = normalizeUsdaFood({
        fdcId: 170000,
        description: "Candies, MARS SNACKFOOD US, SNICKERS Bar",
        dataType: "SR Legacy"
    });
    const unrelated = normalizeUsdaFood({
        fdcId: 170001,
        description: "Candies, MARS SNACKFOOD US, M&M's Milk Chocolate Candies",
        dataType: "SR Legacy"
    });

    assert.equal(snickers.name, "SNICKERS Bar");
    assert.equal(unrelated.name, "M&M's Milk Chocolate Candies");
    assert.deepEqual(rankFoodNameMatches([unrelated, snickers], "Snickers bar").map(food => food.name), ["SNICKERS Bar"]);
    assert.equal(consumerUsdaProductName("Chicken, broilers or fryers, breast, meat only, cooked"), "Chicken, broilers or fryers, breast, meat only, cooked");
});

test("manual search still permits explicit supported-brand plus product searches", () => {
    const results = rankFoodNameMatches([
        { name: "Chipotle Grilled Chicken", brand: "Kirkland Signature" },
        { name: "Chicken Breast", brand: "Another Brand" },
        { name: "Chocolate Almonds", brand: "Kirkland Signature" }
    ], "Kirkland chipotle chicken");

    assert.deepEqual(results.map(food => food.name), ["Chipotle Grilled Chicken"]);
    assert.equal(rankFoodNameMatches([{ name: "Fiesta Salad", brand: "Swiss Chalet" }], "Swiss Chalet fiesta salad").length, 1);
});

test("manual search queries the Open Food Facts text catalogue", async () => {
    const worker = await readFile(new URL("../cloud/src/index.js", import.meta.url), "utf8");
    assert.match(worker, /world\.openfoodfacts\.org\/cgi\/search\.pl/);
    assert.match(worker, /url\.searchParams\.set\("search_terms", query\)/);
    assert.match(worker, /fetchOpenFoodFactsSearch\(query\)/);
});

test("cached external foods rank after verified and USDA results", () => {
    const verified = [{ source: "levelup", name: "Red Potato", brand: "Level Up" }];
    const usda = [{ source: "usda", name: "Potatoes, red", brand: "USDA" }];
    const external = [{ source: "openfoodfacts", name: "Pomme de terre rouge", brand: "Example" }];
    assert.deepEqual(mergeFoodResults(verified, usda, external).map(food => food.source), ["levelup", "usda", "openfoodfacts"]);
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

test("custom foods use a structured serving and calculate gram logging options", () => {
    const nutrition = { calories: 100, protein: 16, carbs: 3, fat: 2.5, fiber: 0 };
    const portions = data.buildCustomFoodPortions({ amount: 85, unit: "g", nutrition });
    assert.deepEqual(portions.map(portion => portion.label), ["85 g", "100 g", "1 g"]);
    assert.equal(portions[0].nutrition.calories, 100);
    assert.equal(Math.round(portions[1].nutrition.calories), 118);
    assert.equal(Number(portions[2].nutrition.protein.toFixed(3)), .188);

    const burger = data.buildCustomFoodPortions({ amount: 1, unit: "burger", nutrition });
    assert.deepEqual(burger.map(portion => portion.label), ["1 burger"]);
});

test("bundled verified foods keep the catalogue working before D1 migration", () => {
    const burgers = searchBundledVerifiedFoods("McDonald's cheeseburger");
    const bars = searchBundledVerifiedFoods("Grenade cookie dough");
    assert.equal(burgers[0].catalogueId, "mcd-ca-cheeseburger");
    assert.equal(burgers[0].portions[0].label, "1 burger (113 g)");
    assert.equal(bars[0].portions[0].nutrition.calories, 208);
});

test("Swiss Chalet's official catalogue is bundled with the Fiesta Salad variants", () => {
    const allSwissChalet = searchBundledVerifiedFoods("Swiss Chalet");
    const rotisserie = searchBundledVerifiedFoods("Swiss Chalet fiesta rotisserie")[0];
    const crispy = searchBundledVerifiedFoods("Swiss Chalet fiesta crispy")[0];
    const salads = searchBundledVerifiedFoods("Swiss Chalet fiesta salad");

    assert.ok(allSwissChalet.length >= 250);
    assert.equal(rotisserie.name, "Fiesta Salad - Rotisserie Chicken");
    assert.equal(rotisserie.portions[0].label, "1 serving (728 g)");
    assert.deepEqual(rotisserie.portions[0].nutrition, { calories: 1090, protein: 79, carbs: 42, fat: 70, fiber: 12 });
    assert.equal(crispy.portions[0].nutrition.calories, 1120);
    assert.equal(salads.length, 3);
    assert.equal(rotisserie.provenance.sourceName, "Swiss Chalet Canada");
    assert.equal(rotisserie.provenance.sourceUrl, "https://www.swisschalet.com/en/nutritional.html");
    assert.equal(rotisserie.provenance.verifiedAt, "2026-08-29");
});

test("Swiss Chalet migration contains the official Fiesta Salad nutrition", async () => {
    const migration = await readFile(new URL("../cloud/migrations/0009_swiss_chalet_foods.sql", import.meta.url), "utf8");
    assert.match(migration, /Fiesta Salad - Rotisserie Chicken/);
    assert.match(migration, /'1 serving \(728 g\)', 728, 1090, 79, 42, 70, 12/);
    assert.match(migration, /https:\/\/www\.swisschalet\.com\/en\/nutritional\.html/);
    assert.match(migration, /2026-08-29/);
});

test("Pür & Simple's official avocado toast catalogue includes Avocado Lox", () => {
    const lox = searchBundledVerifiedFoods("Pür & Simple avocado lox")[0];
    const plainAscii = rankFoodNameMatches(searchBundledVerifiedFoods("pur simple avocado lox"), "pur simple avocado lox")[0];

    assert.equal(lox.catalogueId, "pur-simple-ca-avocado-lox");
    assert.equal(lox.portions[0].label, "1 order");
    assert.deepEqual(lox.portions[0].nutrition, { calories: 1013, protein: 43.7, carbs: 95.96, fat: 45.87, fiber: 15.2 });
    assert.equal(plainAscii.catalogueId, lox.catalogueId);
    assert.equal(lox.provenance.sourceName, "Pür & Simple Canada");
    assert.equal(lox.provenance.sourceUrl, "https://pursimple.com/wp-content/uploads/2026/02/PS-Nutrition-Guide-English-2026-1.pdf");
    assert.equal(lox.provenance.verifiedAt, "2026-08-30");
});

test("Pür & Simple migration stores only the official Avocado Lox calories", async () => {
    const migration = await readFile(new URL("../cloud/migrations/0010_pur_simple_foods.sql", import.meta.url), "utf8");
    assert.match(migration, /'Avocado Lox'.*'1 order', NULL, 1013, 43\.7, 95\.96, 45\.87, 15\.2/);
    assert.doesNotMatch(migration, /'Avocado Lox'.*\b970\b/);
    assert.match(migration, /PS-Nutrition-Guide-English-2026-1\.pdf/);
});

test("top North American restaurant catalogue uses official sources and skips existing McDonald's duplicates", () => {
    const starbucks = searchBundledVerifiedFoods("Starbucks caramel macchiato")[0];
    const subway = searchBundledVerifiedFoods("Subway 6 inch meatball marinara")[0];
    const panda = searchBundledVerifiedFoods("Panda Express orange chicken")[0];
    const dairyQueen = searchBundledVerifiedFoods("Dairy Queen chicken strip basket")[0];

    assert.deepEqual(starbucks.portions[0].nutrition, { calories: 250, protein: 10, carbs: 35, fat: 7, fiber: 0 });
    assert.deepEqual(subway.portions[0].nutrition, { calories: 570, protein: 27, carbs: 53, fat: 28, fiber: 4 });
    assert.deepEqual(panda.portions[0].nutrition, { calories: 510, protein: 16, carbs: 53, fat: 24, fiber: 2 });
    assert.deepEqual(dairyQueen.portions[0].nutrition, { calories: 1020, protein: 35, carbs: 111, fat: 48, fiber: 6 });
    assert.equal(starbucks.countryCode, "US");
    assert.match(starbucks.provenance.sourceName, /official nutrition/);
    assert.match(starbucks.provenance.sourceUrl, /^https:\/\//);
    assert.equal(starbucks.provenance.verifiedAt, "2026-08-30");
    assert.equal(searchBundledVerifiedFoods("McDonald's Big Mac").length, 1);
});

test("all 20 ranked chains have verified catalogue coverage without calorie ranges", () => {
    const expectedBrands = [
        "McDonald's", "Starbucks", "Chick-fil-A", "Taco Bell", "Dunkin'", "Wendy's", "Chipotle",
        "Burger King", "Domino's", "Subway", "Panda Express", "Panera Bread", "Texas Roadhouse",
        "Popeyes", "Chili's", "Raising Cane's", "Olive Garden", "SONIC", "Pizza Hut", "Dairy Queen"
    ];
    expectedBrands.forEach(brand => {
        const foods = searchBundledVerifiedFoods(brand);
        assert.ok(foods.length >= 1, `${brand} should have verified catalogue coverage`);
        foods.forEach(food => assert.ok(Number.isFinite(food.portions[0].nutrition.calories)));
    });
});

test("Canadian and US Grenade barcodes resolve to regional variants of one product family", () => {
    const canadian = findBundledVerifiedFoodByBarcode("847534004261");
    const us = findBundledVerifiedFoodByBarcode("847534004063");
    assert.equal(canadian.catalogueId, "grenade-salted-caramel-ca-60g");
    assert.equal(us.catalogueId, "grenade-salted-caramel-us-60g");
    assert.equal(us.productFamilyId, canadian.productFamilyId);
    assert.equal(canadian.barcode, "847534004261");
    assert.deepEqual(canadian.portions[0].nutrition, { calories: 240, protein: 21, carbs: 22, fat: 9, fiber: 2 });
    assert.deepEqual(us.portions[0].nutrition, { calories: 230, protein: 20, carbs: 23, fat: 10, fiber: 3 });
});

test("verified barcode migration stores regional UPC aliases", async () => {
    const migration = await readFile(new URL("../cloud/migrations/0006_verified_food_barcode_aliases.sql", import.meta.url), "utf8");
    assert.match(migration, /CREATE TABLE IF NOT EXISTS verified_food_barcodes/);
    assert.match(migration, /'847534004261', 'CA', 1/);
    assert.match(migration, /'847534004063', 'US', 1/);
    assert.match(migration, /product_family_id = 'grenade-salted-caramel-60g'/);
});

test("Open Food Facts products normalize labelled servings and Canadian identity", () => {
    const food = normalizeOpenFoodFactsProduct({
        code: "847534004261",
        product_name: "Canadian Protein Bar",
        brands: "Example Canada, Example Foods",
        categories: "Protein bars, Snacks",
        countries_tags: ["en:canada"],
        serving_size: "1 bar (60 g)",
        serving_quantity: 60,
        nutrition: {
            input_sets: [{
                source: "packaging",
                preparation: "as_sold",
                per: "serving",
                per_quantity: 60,
                per_unit: "g",
                nutrients: {
                    "energy-kcal": { value: 230, unit: "kcal" },
                    proteins: { value: 20, unit: "g" },
                    carbohydrates: { value: 23, unit: "g" },
                    fat: { value: 10, unit: "g" },
                    fiber: { value: 3, unit: "g" }
                }
            }]
        }
    }, "847534004261");
    assert.equal(food.source, "openfoodfacts");
    assert.equal(food.countryCode, "CA");
    assert.equal(food.brand, "Example Canada");
    assert.equal(food.portions[0].label, "1 bar (60 g)");
    assert.equal(food.portions[0].nutrition.calories, 230);
    assert.equal(food.portions[0].nutrition.protein, 20);
    assert.equal(food.portions[1].label, "100 g");
    assert.equal(Math.round(food.portions[1].nutrition.calories), 383);
});

test("Open Food Facts prefers grams printed in the serving label when metadata conflicts", () => {
    const food = normalizeOpenFoodFactsProduct({
        code: "12345670",
        product_name: "Red potatoes",
        serving_size: "1 potato (150 g)",
        serving_quantity: 1,
        nutriments: {
            "energy-kcal_100g": 80,
            "proteins_100g": 2,
            "carbohydrates_100g": 18,
            "fat_100g": 0
        }
    }, "12345670");
    assert.equal(food.portions[0].grams, 150);
    assert.equal(food.portions[0].label, "1 potato (150 g)");
    assert.equal(food.portions[0].nutrition.calories, 120);
});

test("barcode lookup uses verified, cached, Open Food Facts, then USDA sources", async () => {
    const worker = await readFile(new URL("../cloud/src/index.js", import.meta.url), "utf8");
    const verifiedAt = worker.indexOf("await findVerifiedFoodByBarcode(barcode, env)");
    const cacheAt = worker.indexOf("await readExternalFoodCache(barcode, env)");
    const openAt = worker.indexOf("await fetchOpenFoodFactsBarcode(barcode)");
    const usdaAt = worker.indexOf("await fetchUsdaBarcodeVariant(env.USDA_FDC_API_KEY");
    assert.ok(verifiedAt > -1 && verifiedAt < cacheAt && cacheAt < openAt && openAt < usdaAt);
    assert.match(worker, /api\/v3\.6\/product\/\$\{encodeURIComponent\(barcode\)\}\.json/);
    assert.match(worker, /LevelUpHypertrophy\/1\.0 \(support@leveluphypertrophy\.com\)/);
});

test("Open Food Facts barcode responses use a persistent D1 cache", async () => {
    const [migration, worker] = await Promise.all([
        readFile(new URL("../cloud/migrations/0007_external_food_barcode_cache.sql", import.meta.url), "utf8"),
        readFile(new URL("../cloud/src/index.js", import.meta.url), "utf8")
    ]);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS external_food_barcode_cache/);
    assert.match(migration, /barcode TEXT PRIMARY KEY/);
    assert.match(migration, /expires_at TEXT NOT NULL/);
    assert.match(worker, /cacheSchema: OPEN_FOOD_FACTS_CACHE_SCHEMA/);
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
    assert.equal(food.portions[0].label, "1 cup (30 g)");
    assert.equal(food.portions[0].nutrition.calories, 120);
    assert.equal(food.portions[0].nutrition.protein, 3);
    assert.equal(food.portions[1].nutrition.calories, 400);
    assert.equal(food.portions[2].label, "1 g");
});

test("USDA GRM servings show the labelled amount and usable gram units", () => {
    const food = normalizeUsdaFood({
        fdcId: 457,
        description: "FLAME SEARED CHARGRILLED CHIPOTLE CHICKEN",
        brandName: "KIRKLAND SIGNATURE",
        servingSize: 85,
        servingSizeUnit: "GRM",
        householdServingFullText: "1 serving",
        labelNutrients: {
            calories: { value: 100 }, protein: { value: 16 }, carbohydrates: { value: 3 }, fat: { value: 2.5 }
        },
        foodNutrients: [
            { nutrientNumber: "208", nutrientName: "Energy", unitName: "KCAL", value: 117.647 },
            { nutrientNumber: "203", nutrientName: "Protein", unitName: "G", value: 18.824 },
            { nutrientNumber: "205", nutrientName: "Carbohydrate, by difference", unitName: "G", value: 3.529 },
            { nutrientNumber: "204", nutrientName: "Total lipid (fat)", unitName: "G", value: 2.941 }
        ]
    });
    assert.deepEqual(food.portions.map(portion => portion.label), ["1 serving (85 g)", "100 g", "1 g"]);
    assert.equal(food.portions[0].nutrition.calories, 100);
    assert.equal(Math.round(food.portions[1].nutrition.calories), 118);
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
    assert.equal(food.portions[0].label, "1 sandwich (108 g)");
    assert.equal(food.portions[0].grams, 108);
    assert.equal(food.portions[0].nutrition.calories, 270);
    assert.equal(food.portions.at(-2).label, "100 g");
    assert.equal(food.portions.at(-1).label, "1 g");
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
    assert.equal(food.portions[0].label, "1 burger (112 g)");
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


test("liquid foods promote practical volume measures without changing nutrition", () => {
    const cream = data.withUsefulLiquidPortions({
        source: "usda",
        name: "Coffee Cream 18%",
        category: "Cream",
        portions: [{ label: "1 g", grams: 1, nutrition: { calories: 2, protein: .02, carbs: .067, fat: .167, fiber: 0 } }]
    });
    assert.equal(cream.portions[0].label, "1 tbsp (15 mL)");
    assert.equal(Math.round(cream.portions[0].nutrition.calories), 30);
    assert.equal(cream.portions.find(portion => portion.label === "1 tsp (5 mL)").nutrition.calories, 10);
    assert.ok(cream.portions.some(portion => portion.label === "1 g"));
});

test("liquid conversions use food-specific density instead of treating every mL as one gram", () => {
    const oil = data.withUsefulLiquidPortions({
        source: "usda",
        name: "Extra virgin olive oil",
        category: "Oil",
        portions: [{ label: "100 g", grams: 100, nutrition: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 } }]
    });
    const tablespoon = oil.portions.find(portion => portion.label === "1 tbsp (15 mL)");
    assert.equal(Number(tablespoon.grams.toFixed(1)), 13.8);
    assert.equal(Math.round(tablespoon.nutrition.calories), 122);

    const oats = data.withUsefulLiquidPortions({
        name: "Rolled oats",
        category: "Cereal",
        portions: [{ label: "100 g", grams: 100, nutrition: { calories: 380, protein: 13, carbs: 68, fat: 7 } }]
    });
    assert.deepEqual(oats.portions.map(portion => portion.label), ["100 g"]);
});

test("custom liquid foods generate equivalent mL and household measures", () => {
    const portions = data.buildCustomFoodPortions({
        amount: 15,
        unit: "ml",
        nutrition: { calories: 30, protein: 0, carbs: 1, fat: 3, fiber: 0 }
    });
    assert.equal(portions[0].label, "15 mL");
    assert.equal(portions.find(portion => portion.label === "1 tbsp (15 mL)").nutrition.calories, 30);
    assert.equal(portions.find(portion => portion.label === "1 tsp (5 mL)").nutrition.calories, 10);
    assert.equal(portions.find(portion => portion.label === "1 cup (250 mL)").nutrition.calories, 500);
});


test("food log rows display total amounts instead of serving multiplication", () => {
    assert.equal(data.totalServingLabel(1.2, "100 g"), "120 g");
    assert.equal(data.totalServingLabel(3.5, "100 g"), "350 g");
    assert.equal(data.totalServingLabel(24, "1 g"), "24 g");
    assert.equal(data.totalServingLabel(1.5, "1 tbsp (15 mL)"), "1.5 tbsp (22.5 mL)");
    assert.equal(data.totalServingLabel(2, "1 serving (85 g)"), "2 servings (170 g)");
    assert.equal(data.totalServingLabel(2, "large handful"), "2 × large handful");
});


test("previous-day meal banner state follows the copied entries", () => {
    const food = { source: "custom", name: "Oats", portions: [{ label: "100 g", nutrition: { calories: 150 } }] };
    const source = [data.createLogEntry({ meal: "Breakfast", food, portion: food.portions[0], quantity: 1 })];
    const copies = data.cloneEntriesForMeal(source, "Breakfast", { dateKey: "2026-08-27", meal: "Breakfast" });
    assert.equal(data.hasCopiedMeal(copies, "2026-08-27", "Breakfast"), true);
    assert.equal(data.hasCopiedMeal(copies, "2026-08-27", "Lunch"), false);
    assert.equal(copies[0].copiedFromDate, "2026-08-27");
    assert.equal(copies[0].copiedFromMeal, "Breakfast");
    assert.equal(data.hasCopiedMeal([], "2026-08-27", "Breakfast"), false);
});
