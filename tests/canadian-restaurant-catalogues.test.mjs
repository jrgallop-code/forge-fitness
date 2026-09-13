import test from "node:test";
import assert from "node:assert/strict";

import {
    CANADIAN_RESTAURANT_CATALOGUES,
    CANADIAN_RESTAURANT_CATALOGUE_COUNTS,
    CANADIAN_RESTAURANT_CATALOGUE_SOURCES,
    CANADIAN_RESTAURANT_FATSECRET_SUPPLEMENT_SOURCES,
    COMPLETE_CANADIAN_RESTAURANT_CATALOGUE_COUNTS
} from "../cloud/src/data/canadian-restaurant-catalogues.js";
import { isCompleteVerifiedRestaurantCatalogue } from "../cloud/src/index.js";

const foods = CANADIAN_RESTAURANT_CATALOGUES;
const findFood = (brand, name) => foods.find(food => food.brand === brand && food.name === name);

test("Canadian restaurant catalogues compile first-party menus with macros and sections", () => {
    assert.equal(foods.length, 1419);
    assert.deepEqual(CANADIAN_RESTAURANT_CATALOGUE_COUNTS, {
        "Booster Juice": 93,
        Cora: 285,
        "East Side Mario's": 266,
        "Five Guys": 49,
        Freshii: 132,
        Kelseys: 233,
        "Little Caesars": 42,
        "Montana's": 168,
        "The Keg": 151
    });

    assert.deepEqual(
        pick(findFood("Booster Juice", "Bananas-A-Whey — Regular")),
        { calories: 470, protein: 28, carbs: 88, fat: 3.5, fiber: 2, menuSection: "Smoothies — High Protein" }
    );
    assert.deepEqual(
        pick(findFood("Freshii", "Protein Power Bowl")),
        { calories: 630, protein: 57, carbs: 67, fat: 15, fiber: 7, menuSection: "Lifestyle Bowls" }
    );
    assert.deepEqual(
        pick(findFood("East Side Mario's", "Mozzarella Sticks")),
        { calories: 800, protein: 25, carbs: 65, fat: 49, fiber: 3, menuSection: "Starters" }
    );
    assert.deepEqual(
        pick(findFood("Kelseys", "Loaded Nachos Half Pan")),
        { calories: 1230, protein: 59, carbs: 112, fat: 62, fiber: 11, menuSection: "On-Ramp Appies" }
    );
    assert.deepEqual(
        pick(findFood("Montana's", "Double Dusted Chicken Wings with Blue Cheese Dressing - 8 pieces")),
        { calories: 1490, protein: 74, carbs: 63, fat: 104, fiber: 3, menuSection: "Classic Kick-Starters" }
    );
});

test("whole pizzas and exact component sums retain honest serving context", () => {
    const pizza = findFood("Little Caesars", "Pepperoni — 12-inch medium");
    assert.equal(pizza.label, "1 whole 12-inch medium pizza (8 slices)");
    assert.deepEqual(pick(pizza), {
        calories: 1590,
        protein: 75,
        carbs: 182,
        fat: 63,
        fiber: 7,
        menuSection: "Pizza"
    });

    const hamburger = findFood("Five Guys", "Hamburger — Plain");
    assert.deepEqual(pick(hamburger), {
        calories: 844,
        protein: 39,
        carbs: 39,
        fat: 43,
        fiber: 2,
        menuSection: "Burgers & Hot Dogs"
    });
    assert.equal(hamburger.calculationMethod, "component_sum");
    assert.match(hamburger.sourceNote, /Toppings are not included/);
});

test("catalogue rows reject uncertain identities and implausible macro transcriptions", () => {
    assert.equal(new Set(foods.map(food => food.id)).size, foods.length);
    for (const food of foods) {
        assert.ok(food.name && !/^\d+$/.test(food.name), food.id);
        assert.ok(food.menuSection, food.id);
        assert.ok(food.calories >= 0, food.id);
        assert.ok(food.protein >= 0 && food.carbs >= 0 && food.fat >= 0 && food.fiber >= 0, food.id);
        assert.match(food.sourceUrl, /^https:\/\//);
        if (food.calories > 20) {
            assert.ok(food.protein > 0 || food.carbs > 0 || food.fat > 0, `${food.id} has calories without published macros`);
        }
        const macroCalories = (food.protein * 4) + (food.carbs * 4) + (food.fat * 9);
        const alcoholic = /alcohol|beer|wine|cocktail|mimosa|daiquiri|caesar|sangria|martini|margarita|vodka|gin|bellini|spritz|liqueur|rum|tequila|whisk/i.test(food.name);
        if (!alcoholic && food.calories >= 50) {
            assert.ok(macroCalories <= food.calories * 1.55, `${food.id} has an implausible macro transcription`);
        }
    }
});

test("only current full first-party catalogues suppress FatSecret supplementation", () => {
    assert.deepEqual(Object.keys(COMPLETE_CANADIAN_RESTAURANT_CATALOGUE_COUNTS).sort(), [
        "Booster Juice",
        "Cora",
        "East Side Mario's",
        "Freshii",
        "Kelseys",
        "Montana's"
    ].sort());

    for (const [brand, count] of Object.entries(COMPLETE_CANADIAN_RESTAURANT_CATALOGUE_COUNTS)) {
        const matching = foods.filter(food => food.brand === brand);
        assert.equal(matching.length, count);
        assert.equal(isCompleteVerifiedRestaurantCatalogue(brand, matching), true);
    }

    for (const partialBrand of ["Five Guys", "Little Caesars", "The Keg", "Tim Hortons", "Mary Brown's", "Pizza Pizza", "New York Fries"]) {
        assert.equal(isCompleteVerifiedRestaurantCatalogue(partialBrand, foods), false);
    }
});

test("every compiled chain points back to its official online nutrition source", () => {
    assert.deepEqual(Object.keys(CANADIAN_RESTAURANT_CATALOGUE_SOURCES).sort(), Object.keys(CANADIAN_RESTAURANT_CATALOGUE_COUNTS).sort());
    for (const [brand, source] of Object.entries(CANADIAN_RESTAURANT_CATALOGUE_SOURCES)) {
        assert.match(source.sourceName, /nutrition/i, brand);
        assert.match(source.sourceUrl, /^https:\/\//, brand);
        assert.match(source.menuUrl, /^https:\/\//, brand);
        assert.ok(foods.some(food => food.brand === brand && food.sourceUrl === source.sourceUrl), brand);
    }
});

test("dynamic or incomplete official menus stay traceable without receiving invented macros", () => {
    assert.deepEqual(Object.keys(CANADIAN_RESTAURANT_FATSECRET_SUPPLEMENT_SOURCES).sort(), [
        "Tim Hortons",
        "Mary Brown's",
        "Pizza Pizza",
        "New York Fries"
    ].sort());
    for (const [brand, source] of Object.entries(CANADIAN_RESTAURANT_FATSECRET_SUPPLEMENT_SOURCES)) {
        assert.match(source.menuUrl, /^https:\/\//, brand);
        assert.match(source.nutritionUrl, /^https:\/\//, brand);
        assert.match(source.note, /FatSecret|does not invent|reliably enough/, brand);
    }
});

function pick(food) {
    assert.ok(food, "expected catalogue item to exist");
    return {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        menuSection: food.menuSection
    };
}
