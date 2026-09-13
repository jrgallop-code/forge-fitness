import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    RESTAURANT_DIRECTORY,
    restaurantBrandMatches,
    restaurantForId,
    restaurantMarket
} from "../js/nutrition/restaurant-directory.js";
import {
    COMPLETE_PRIORITY_RESTAURANT_CATALOGUE_COUNTS,
    PRIORITY_RESTAURANT_CATALOGUES
} from "../cloud/src/data/priority-restaurant-catalogues.js";
import { restaurantMatchesRequest } from "../cloud/src/index.js";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

const EXPANSION_IDS = [
    "the-chopped-leaf", "osmows", "edo-japan", "kfc-canada", "tacotime-canada",
    "jersey-mikes", "cava", "sweetgreen", "qdoba", "wingstop", "mucho-burrito",
    "quesada", "pita-pit-canada", "firehouse-subs-canada", "st-hubert", "white-spot",
    "triple-os", "thai-express", "mr-sub", "shake-shack", "whataburger", "ihop",
    "dennys", "buffalo-wild-wings", "applebees", "arbys", "culvers", "in-n-out",
    "papa-johns", "texas-roadhouse", "chilis", "raising-canes", "sonic"
];

test("restaurant directory contains every planned Canada and U.S. expansion chain", () => {
    assert.equal(new Set(RESTAURANT_DIRECTORY.map(item => item.id)).size, RESTAURANT_DIRECTORY.length);
    for (const id of EXPANSION_IDS) {
        const item = restaurantForId(id);
        assert.ok(item, `${id} should be present`);
        assert.ok(item.mark && item.description && item.brandAliases.length);
        assert.ok(item.markets.every(country => country === "CA" || country === "US"));
        assert.ok(item.nutritionSource?.url, `${id} should link to its official nutrition/menu reference`);
    }
    assert.equal(restaurantMarket(restaurantForId("kfc-canada"), "US"), "CA");
    assert.equal(restaurantMarket(restaurantForId("jersey-mikes"), "CA"), "US");
});

test("canonical aliases accept the selected chain without text cross-pollination", () => {
    const choppedLeaf = restaurantForId("the-chopped-leaf");
    const kfc = restaurantForId("kfc-canada");
    assert.equal(restaurantBrandMatches({ brand: "The Chopped Leaf Restaurants" }, choppedLeaf), true);
    assert.equal(restaurantBrandMatches({ brand: "A grocery chopped salad" }, choppedLeaf), false);
    assert.equal(restaurantBrandMatches({ brand: "Kentucky Fried Chicken" }, kfc), true);
    assert.equal(restaurantMatchesRequest({ brand: "KFC", countryCode: "CA" }, "KFC Canada", "kfc-canada", "CA"), true);
    assert.equal(restaurantMatchesRequest({ brand: "KFC", countryCode: "US" }, "KFC Canada", "kfc-canada", "CA"), false);
});

test("priority official catalogues include audited calories and macros", () => {
    assert.equal(PRIORITY_RESTAURANT_CATALOGUES.length, 841);
    assert.deepEqual(COMPLETE_PRIORITY_RESTAURANT_CATALOGUE_COUNTS, {
        "The Chopped Leaf": 83,
        "Osmow's": 118,
        "Edo Japan": 98,
        "KFC Canada": 92,
        "TacoTime Canada": 105
    });
    const kfc = PRIORITY_RESTAURANT_CATALOGUES.find(food => food.brand === "KFC Canada" && food.name === "Famous Chicken Sandwich");
    const edo = PRIORITY_RESTAURANT_CATALOGUES.find(food => food.brand === "Edo Japan" && food.name === "Teriyaki Chicken");
    const chopped = PRIORITY_RESTAURANT_CATALOGUES.find(food => food.brand === "The Chopped Leaf" && food.name === "Cobb" && food.menuSection === "Bowls");
    assert.deepEqual({ calories: kfc?.calories, protein: kfc?.protein }, { calories: 690, protein: 35 });
    assert.deepEqual({ calories: edo?.calories, protein: edo?.protein }, { calories: 469.1, protein: 32.4 });
    assert.deepEqual({ calories: chopped?.calories, protein: chopped?.protein }, { calories: 844, protein: 35.2 });
    assert.ok(PRIORITY_RESTAURANT_CATALOGUES.every(food => food.sourceUrl.startsWith("https://")));
});

test("onboarding offers an optional unit-aware goal weight and persists it into a nutrition phase", async () => {
    const [onboarding, phase, index, styles] = await Promise.all([
        read("js/onboarding/onboarding.js"),
        read("js/nutrition/nutrition-phase.js"),
        read("index.html"),
        read("css/onboarding.css")
    ]);
    assert.match(onboarding, /Goal weight \(kg\) <small>\(optional\)<\/small>/);
    assert.match(onboarding, /Goal weight \(lb\) <small>\(optional\)<\/small>/);
    assert.match(onboarding, /data-answer="goalWeightKg"/);
    assert.match(onboarding, /data-answer="goalWeightLb"/);
    assert.match(onboarding, /saveOnboardingGoalWeight\(goalWeightLb\)/);
    assert.match(onboarding, /saveNutritionPhase\(\{goalId,maintenanceCalories:plan\.maintenance,targetCalories:plan\.target,goalWeight:goalWeightLbFromAnswers\(\)\}\)/);
    assert.match(phase, /saveNutritionPhase\(\{ goalId, maintenanceCalories, targetCalories, goalWeight = undefined \}\)/);
    assert.match(phase, /goalWeightProvided/);
    assert.match(index, /onboarding\.js\?v=onboarding-goal-weight-1/);
    assert.match(index, /onboarding\.css\?v=onboarding-goal-weight-1/);
    assert.match(styles, /\.onboarding-goal-weight-field>em/);
});

test("nutrition phase stores, preserves and explicitly clears onboarding goal weight", async () => {
    const values = new Map();
    globalThis.localStorage = {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
    globalThis.window = { dispatchEvent() {} };
    globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };
    const { saveNutritionPhase } = await import(`../js/nutrition/nutrition-phase.js?goal-weight-test=${Date.now()}`);
    const started = saveNutritionPhase({ goalId: "bulk_conservative", maintenanceCalories: 2700, targetCalories: 2800, goalWeight: 175.2 });
    assert.equal(started.phase.goalWeight, 175.2);
    const preserved = saveNutritionPhase({ goalId: "bulk_conservative", maintenanceCalories: 2700, targetCalories: 2800 });
    assert.equal(preserved.phase.goalWeight, 175.2);
    const cleared = saveNutritionPhase({ goalId: "bulk_conservative", maintenanceCalories: 2700, targetCalories: 2800, goalWeight: null });
    assert.equal("goalWeight" in cleared.phase, false);
});

test("menu items use a recognizable utensils icon instead of the ambiguous plate target", async () => {
    const menu = await read("js/nutrition/restaurant-menu.js");
    assert.match(menu, /\$\{utensilsSvg\(\)\}/);
    assert.doesNotMatch(menu, /function plateSvg/);
});
