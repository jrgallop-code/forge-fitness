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

test("food search prioritizes matching logged history as the user types", async () => {
    const module = await read("../js/nutrition/food-log.js");
    assert.match(module, /prioritizeLoggedFoodMatches\(query, payload\.foods \|\| \[\]\)/);
    assert.match(module, /Previously logged/);
    assert.match(module, /foodSearchForm\.requestSubmit\(\)/);
    assert.match(module, /setTimeout\(\(\) => foodSearchForm\.requestSubmit\(\), 300\)/);
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

test("My Meals can build a reusable meal from pasted ingredients", async () => {
    const [module, parser, styles] = await Promise.all([
        read("../js/nutrition/food-log.js"),
        read("../js/nutrition/ingredient-paste-parser.js"),
        read("../css/food-log.css")
    ]);
    assert.match(module, /data-paste-meal/);
    assert.match(module, /Paste Ingredients/);
    assert.match(module, /parseIngredientText/);
    assert.match(module, /Analyze Ingredients/);
    assert.match(module, /Review the foods and weights below before saving/);
    assert.match(parser, /ingredientPortionSelection/);
    assert.match(styles, /\.food-builder-paste/);
});

test("the pasted ingredient field does not collapse behind meal cards when the iOS keyboard opens", async () => {
    const styles = await read("../css/food-log.css");
    assert.match(styles, /\.food-meal-builder:not\(\[hidden\]\)>\*\{flex:0 0 auto\}/);
    assert.match(styles, /\.food-builder-paste\{flex:0 0 auto;min-height:62px\}/);
    assert.match(styles, /\.food-builder-paste textarea\{[^}]*height:150px;min-height:150px/);
    assert.match(styles, /scroll-padding-bottom:max\(260px,42dvh\)/);
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
    assert.match(module, /class="food-calorie-target"/);
    assert.match(module, /cal target/);
    assert.match(styles, /Actual calories with target directly beneath/);
    assert.match(styles, /\.food-calorie-value\{[^}]*display:grid[^}]*justify-items:end/);
    assert.match(styles, /\.food-calorie-target\{/);
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


test("saved meal photo picker stays attached through iOS selection and renders the stored thumbnail", async () => {
    const [module, data, styles] = await Promise.all([
        read("../js/nutrition/food-log.js"),
        read("../js/nutrition/food-log-data.js"),
        read("../css/food-log.css")
    ]);
    assert.match(module, /document\.body\.append\(input\)/);
    assert.match(module, /class="food-saved-meal-thumbnail"/);
    assert.match(module, /if \(!saved\.photoDataUrl\)/);
    assert.match(data, /rawPhotoDataUrl\.length <= 240000/);
    assert.doesNotMatch(data, /photoDataUrl\)\.slice\(0, 180000\)/);
    assert.match(styles, /\.food-saved-meal-thumbnail/);
});


test("saved meal cards place a larger thumbnail on the left", async () => {
    const [module, styles] = await Promise.all([
        read("../js/nutrition/food-log.js"),
        read("../css/food-log.css")
    ]);
    assert.match(module, /<article class="food-saved-meal"><button type="button" class="food-saved-meal-photo"/);
    assert.match(styles, /grid-template-columns:58px minmax\(0,1fr\) 42px 24px/);
    assert.match(styles, /\.food-saved-meal-photo\{[^}]*width:58px;height:58px/);
});


test("saved meals reopen as editable drafts with a whole-meal macro breakdown", async () => {
    const [module, styles] = await Promise.all([
        read("../js/nutrition/food-log.js"),
        read("../css/food-log.css")
    ]);
    assert.match(module, /data-edit-saved-meal/);
    assert.match(module, /openMealBuilder\(meal\.items, meal\.name, meal\)/);
    assert.match(module, /id: savedMeal\?\.id \|\| null/);
    assert.match(module, /photoDataUrl: savedMeal\?\.photoDataUrl \|\| ""/);
    assert.match(module, /macroBreakdownMarkup\(totals/);
    assert.match(module, /Whole meal/);
    assert.match(module, /data-meal-item-details/);
    assert.match(module, /editingMealItemIndex !== null/);
    assert.match(styles, /\.food-builder-macros/);
    assert.match(styles, /\.food-builder-item-edit/);
});

test("expanded diary meals show their own calorie and macro breakdown", async () => {
    const [module, styles] = await Promise.all([
        read("../js/nutrition/food-log.js"),
        read("../css/food-log.css")
    ]);
    assert.match(module, /entries\.length \? `<div class="food-meal-macros">/);
    assert.match(module, /macroBreakdownMarkup\(totals, `\$\{meal\} total/);
    assert.match(module, /class="food-edit-calorie-ring"/);
    assert.match(module, /food-edit-macro--carbs/);
    assert.match(module, /food-edit-macro--fat/);
    assert.match(module, /food-edit-macro--protein/);
    assert.match(styles, /\.food-meal-macros\{/);
    assert.match(module, /\.food-meal > summary/);
    assert.match(module, /event\.preventDefault\(\);/);
    assert.match(module, /details\.open = !details\.open/);
    assert.match(module, /aria-expanded/);
});

test("custom foods can be edited and saved over their existing record", async () => {
    const [module, styles] = await Promise.all([
        read("../js/nutrition/food-log.js"),
        read("../css/food-log.css")
    ]);
    assert.match(module, /data-edit-custom-food/);
    assert.match(module, /function beginCustomFoodEdit/);
    assert.match(module, /editingCustomFoodId \|\| crypto\.randomUUID\(\)/);
    assert.match(module, /Food updated\./);
    assert.match(styles, /\.food-custom-edit/);
    assert.match(styles, /\.custom-food-actions/);
});


test("meal ingredient rows keep full-width touch targets and contain their text", async () => {
    const styles = await read("../css/food-log.css");
    assert.match(styles, /\.food-builder-items \.food-builder-item-edit\{[^}]*width:100%;height:auto;[^}]*min-height:62px;[^}]*overflow:hidden/);
    assert.match(styles, /\.food-builder-item-edit strong,\.food-builder-item-edit small\{[^}]*text-overflow:ellipsis;white-space:nowrap/);
    assert.match(styles, /\[data-remove-meal-item\]\{width:42px;height:42px/);
});


test("saved meal ingredients use native expandable editing controls", async () => {
    const [module, styles] = await Promise.all([
        read("../js/nutrition/food-log.js"),
        read("../css/food-log.css")
    ]);
    assert.match(module, /<details class="food-builder-item-details"/);
    assert.match(module, /<summary>/);
    assert.match(module, /data-meal-item-serving/);
    assert.match(module, /data-meal-item-quantity/);
    assert.match(module, /data-meal-item-save/);
    assert.match(module, /data-meal-item-remove/);
    assert.match(module, /const updated = createLogEntry/);
    assert.match(module, /mealDraft\.items\.splice\(index, 1, updated\)/);
    assert.doesNotMatch(module, /function openMealItemEditor/);
    assert.match(styles, /\.food-builder-item-details>summary/);
    assert.match(styles, /\.food-builder-item-details\[open\]>summary/);
});
