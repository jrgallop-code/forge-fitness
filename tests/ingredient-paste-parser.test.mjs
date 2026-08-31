import assert from "node:assert/strict";
import test from "node:test";

import {
    chooseIngredientFood,
    ingredientPortionSelection,
    parseIngredientLine,
    parseIngredientText,
    parseSpokenIngredientText
} from "../js/nutrition/ingredient-paste-parser.js";

test("pasted ingredient lines recognize weights, volumes, fractions, and counts", () => {
    assert.deepEqual(parseIngredientLine("400 g potatoes"), {
        original: "400 g potatoes", name: "potatoes", amount: 400, unit: "g", assumed: false
    });
    assert.deepEqual(parseIngredientLine("olive oil - 1 tbsp"), {
        original: "olive oil - 1 tbsp", name: "olive oil", amount: 1, unit: "tbsp", assumed: false
    });
    assert.deepEqual(parseIngredientLine("1 1/2 cups corn"), {
        original: "1 1/2 cups corn", name: "corn", amount: 1.5, unit: "cup", assumed: false
    });
    assert.deepEqual(parseIngredientLine("2 chicken breasts"), {
        original: "2 chicken breasts", name: "chicken breasts", amount: 2, unit: "item", assumed: true
    });
});

test("spoken ingredient lists split amounts without breaking food names", () => {
    const parsed = parseSpokenIngredientText("two eggs, one tablespoon olive oil, 100 grams avocado and two slices sourdough bread");
    assert.deepEqual(parsed.map(item => [item.name, item.amount, item.unit]), [
        ["eggs", 2, "item"],
        ["olive oil", 1, "tbsp"],
        ["avocado", 100, "g"],
        ["sourdough bread", 2, "slice"]
    ]);
    assert.equal(parseSpokenIngredientText("one serving macaroni and cheese")[0].name, "macaroni and cheese");
});

test("ingredient paste accepts bullets and semicolon-separated recipes", () => {
    const parsed = parseIngredientText("• 330 g chicken breast\n- 225 g mixed vegetables;100 g corn");
    assert.deepEqual(parsed.map(item => item.name), ["chicken breast", "mixed vegetables", "corn"]);
    assert.deepEqual(parsed.map(item => item.amount), [330, 225, 100]);
});

test("ingredient matching selects the closest named food", () => {
    const foods = [
        { name: "Chicken noodle soup", portions: [{ label: "100 g", grams: 100, nutrition: { calories: 50 } }] },
        { name: "Chicken breast, roasted", portions: [{ label: "100 g", grams: 100, nutrition: { calories: 165 } }] }
    ];
    assert.equal(chooseIngredientFood(parseIngredientLine("330 g chicken breast"), foods).name, "Chicken breast, roasted");
});

test("weight and liquid amounts scale against the matched serving", () => {
    const potatoes = { portions: [{ label: "100 g", grams: 100, nutrition: { calories: 77 } }] };
    const potatoSelection = ingredientPortionSelection(parseIngredientLine("400 g potatoes"), potatoes);
    assert.equal(potatoSelection.quantity, 4);

    const oil = { portions: [{ label: "1 tbsp (15 mL)", milliliters: 15, nutrition: { calories: 120 } }] };
    const oilSelection = ingredientPortionSelection(parseIngredientLine("2 tbsp olive oil"), oil);
    assert.equal(oilSelection.quantity, 2);
});

test("counted ingredients require a real item-sized serving", () => {
    const eggs = { portions: [{ label: "1 large egg (50 g)", grams: 50, nutrition: { calories: 72 } }] };
    const eggSelection = ingredientPortionSelection(parseIngredientLine("2 eggs"), eggs);
    assert.equal(eggSelection.quantity, 2);
    assert.equal(eggSelection.portion.label, "1 large egg (50 g)");

    const weightOnlyChicken = { portions: [{ label: "100 g", grams: 100, nutrition: { calories: 165 } }] };
    assert.equal(ingredientPortionSelection(parseIngredientLine("2 chicken breasts"), weightOnlyChicken), null);
});
