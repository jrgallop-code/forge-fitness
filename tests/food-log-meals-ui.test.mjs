import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("food picker is meal-first and includes Recent, My Meals, and My Foods", async () => {
    const module = await read("../js/nutrition/food-log.js");
    assert.match(module, /class="food-meal-picker"/);
    assert.match(module, /data-food-target-meal/);
    assert.match(module, />Recent</);
    assert.match(module, />My Meals</);
    assert.match(module, />My Foods</);
    assert.match(module, /defaultMealForTime/);
});

test("food picker clears the bottom navigation and keeps content scrollable", async () => {
    const styles = await read("../css/food-log.css");
    assert.match(styles, /z-index:12000/);
    assert.match(styles, /height:100dvh/);
    assert.match(styles, /food-sheet-open \.bottom-nav/);
    assert.match(styles, /food-sheet-scroll\{[^}]*overflow-y:auto/);
});

test("yesterday meals support swipe copy and preview the food names", async () => {
    const module = await read("../js/nutrition/food-log.js");
    assert.match(module, /Yesterday’s \$\{meal\}/);
    assert.match(module, /mealPreview\(yesterdayEntries\)/);
    assert.match(module, /touchstart/);
    assert.match(module, /touchmove/);
    assert.match(module, /dx >= 72/);
    assert.match(module, /cloneEntriesForMeal/);
});

test("users can build, save, and quickly log reusable meals", async () => {
    const module = await read("../js/nutrition/food-log.js");
    assert.match(module, /Build a Meal/);
    assert.match(module, /Save to My Meals/);
    assert.match(module, /saveSavedMeal/);
    assert.match(module, /logSavedMeal\(selectedDate, meal, selectedMeal\)/);
});

test("logged meal items open an editor for serving, meal, quantity, or removal", async () => {
    const [module, styles] = await Promise.all([read("../js/nutrition/food-log.js"), read("../css/food-log.css")]);
    assert.match(module, /data-food-edit=/);
    assert.match(module, /openLoggedFoodEditor/);
    assert.match(module, /Save Changes/);
    assert.match(module, /data-food-edit-remove/);
    assert.match(module, /updateEntry\(selectedDate, editingEntryId, entry\)/);
    assert.match(module, /if \(addContext === "edit"\) \{\s*closeFoodSheet\(\);\s*return;/);
    assert.match(module, /Close food editor/);
    assert.match(styles, /\.food-entry-edit/);
});

test("food diary uses a restrained native typography hierarchy", async () => {
    const styles = await read("../css/food-log.css");
    assert.match(styles, /Refined native typography/);
    assert.match(styles, /"SF Pro Text"/);
    assert.match(styles, /\.food-log-heading h2\{[^}]*font-size:28px[^}]*font-weight:700/);
    assert.match(styles, /\.food-calorie-total strong\{[^}]*font-size:27px[^}]*font-weight:700/);
    assert.match(styles, /\.food-meal summary strong\{[^}]*font-size:15\.5px[^}]*font-weight:650/);
    assert.match(styles, /\.food-entry-edit strong\{[^}]*font-size:14px[^}]*font-weight:600/);
});

test("daily calories place the target directly below actual intake", async () => {
    const [module, styles] = await Promise.all([read("../js/nutrition/food-log.js"), read("../css/food-log.css")]);
    assert.match(module, /class="food-calorie-value"/);
    assert.match(module, /cal target/);
    assert.match(styles, /Actual calories with target directly beneath/);
    assert.match(styles, /\.food-calorie-value\{[^}]*display:grid[^}]*justify-items:end/);
    assert.match(styles, /\.food-calorie-value small\{/);
});

test("custom foods collect MyFitnessPal-style serving details", async () => {
    const module = await read("../js/nutrition/food-log.js");
    assert.match(module, /Brand name/);
    assert.match(module, /Description/);
    assert.match(module, /name="servingAmount"/);
    assert.match(module, /name="servingUnit"/);
    assert.match(module, /Servings per container/);
    assert.match(module, /Nutrition per serving/);
    assert.match(module, /buildCustomFoodPortions/);
    assert.match(module, /Number of servings/);
});

test("food picker includes a compact barcode scanner with manual and custom fallbacks", async () => {
    const [module, styles, worker] = await Promise.all([
        read("../js/nutrition/food-log.js"),
        read("../css/food-barcode-scanner.css"),
        read("../cloud/src/index.js")
    ]);
    assert.match(module, /data-barcode-open/);
    assert.match(module, /class="food-search-entry"/);
    assert.doesNotMatch(module, /class="food-search-field"><input[^>]+><button[^>]+class="food-barcode-open"/);
    assert.match(module, /facingMode: \{ ideal: "environment" \}/);
    assert.match(module, /width: \{ ideal: 1920 \}/);
    assert.match(module, /Hold the barcode inside the box/);
    assert.match(module, /getCapabilities/);
    assert.match(module, /applyConstraints\(\{ advanced: \[\{ zoom \}\] \}\)/);
    assert.match(module, /data-barcode-zoom-range/);
    assert.match(module, /Only the barcode number is sent for lookup/);
    assert.match(module, /\/v1\/foods\/barcode\//);
    assert.match(module, /Create a custom food with this barcode/);
    assert.match(module, /barcodeScannerControls\?\.stop/);
    assert.match(styles, /food-barcode-frame/);
    assert.match(styles, /food-barcode-frame i:nth-child/);
    assert.doesNotMatch(styles, /food-barcode-frame:before/);
    assert.match(worker, /selectExactUsdaBarcodeFood/);
    assert.match(worker, /fetchUsdaBarcodeVariant/);
    assert.match(worker, /const queries = barcodeVariants\(barcode\)/);
});
