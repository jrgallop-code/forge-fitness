import assert from "node:assert/strict";
import test from "node:test";

import {
    assessBarcodeFood,
    barcodeFoodResponse,
    barcodeFoodsMateriallyDisagree,
    rankBarcodeFoods
} from "../cloud/src/barcode-food-quality.js";

function food(source, name, nutrition, grams = 50) {
    return {
        source,
        name,
        barcode: "036000291452",
        detailsLoaded: true,
        portions: [{ label: `1 serving (${grams} g)`, grams, nutrition }]
    };
}

test("barcode quality rejects incomplete all-zero nutrition", () => {
    const result = assessBarcodeFood(food("openfoodfacts", "Protein bar", { calories: 0, protein: 0, carbs: 0, fat: 0 }));
    assert.equal(result.usable, false);
    assert.ok(result.flags.includes("all_nutrition_zero"));
});

test("barcode quality preserves legitimate zero-calorie products", () => {
    const result = assessBarcodeFood(food("openfoodfacts", "Sparkling water", { calories: 0, protein: 0, carbs: 0, fat: 0 }));
    assert.equal(result.usable, true);
    assert.equal(result.flags.length, 0);
});

test("barcode quality rejects calories with missing macros for ordinary food", () => {
    const result = assessBarcodeFood(food("openfoodfacts", "Chicken wrap", { calories: 520, protein: 0, carbs: 0, fat: 0 }, 240));
    assert.equal(result.usable, false);
    assert.ok(result.flags.includes("calories_without_macros"));
});

test("barcode ranking prefers complete FatSecret data over a weaker community record", () => {
    const community = food("openfoodfacts", "Greek yogurt", { calories: 120, protein: 15, carbs: 9, fat: 2 }, 170);
    const fatSecret = food("fatsecret", "Greek yogurt", { calories: 130, protein: 17, carbs: 8, fat: 3 }, 170);
    assert.equal(rankBarcodeFoods([community, fatSecret])[0].food.source, "fatsecret");
});

test("barcode response exposes materially different records for confirmation", () => {
    const first = food("fatsecret", "Protein bar", { calories: 210, protein: 20, carbs: 22, fat: 6 }, 60);
    const second = food("usda", "Protein bar", { calories: 280, protein: 10, carbs: 35, fat: 11 }, 60);
    const response = barcodeFoodResponse([second, first]);
    assert.equal(response.food.source, "fatsecret");
    assert.equal(response.candidates.length, 2);
});

test("same-calorie records remain selectable when their macros disagree", () => {
    const first = food("fatsecret", "Protein shake", { calories: 180, protein: 30, carbs: 6, fat: 4 }, 330);
    const second = food("usda", "Protein shake", { calories: 180, protein: 15, carbs: 25, fat: 2 }, 330);
    const response = barcodeFoodResponse([first, second]);
    assert.equal(response.candidates.length, 2);
});

test("equivalent per-100g nutrition does not create a false conflict", () => {
    const small = food("fatsecret", "Milk", { calories: 100, protein: 5, carbs: 12, fat: 3 }, 200);
    const large = food("usda", "Milk", { calories: 150, protein: 7.5, carbs: 18, fat: 4.5 }, 300);
    assert.equal(barcodeFoodsMateriallyDisagree(small, large), false);
});
