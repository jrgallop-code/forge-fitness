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
