import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {formatIngredientMeasure} from "../js/nutrition/meal-planner-measurements.js";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {macrosForIngredients} from "../js/nutrition/meal-planner-data.js";

test("spices are shown in everyday cooking measures with original grams",()=>{
 assert.match(formatIngredientMeasure("Smoked paprika",6,"g"),/tsp · 6 g/);
 assert.match(formatIngredientMeasure("Garlic powder",3.1,"g"),/≈ 1 tsp · 3.1 g/);
 assert.match(formatIngredientMeasure("Cooking oil",13.65,"g"),/≈ 1 tbsp · 13.7 g/);
 assert.match(formatIngredientMeasure("Plain Greek yogurt",120,"g"),/≈ ½ cup · 120 g/);
});
test("not all grams are convertible to meaningful spoons",()=>{
 assert.equal(formatIngredientMeasure("Chicken thighs",908,"g"),"908 g");
 assert.equal(formatIngredientMeasure("Broccoli",227,"g"),"227 g");
 assert.equal(formatIngredientMeasure("Broccoli",0,"g"),"0 g");
 assert.match(formatIngredientMeasure("Salt",1,"g"),/tsp/);
});
test("measurements change presentation only, never source grams or macro math",()=>{
 const recipe=FEATURED_RECIPES[0],source=recipe.groups[0].ingredients[1];
 const before=JSON.stringify(recipe.groups);
 formatIngredientMeasure(source.food,source.grams,source.unit);
 assert.equal(JSON.stringify(recipe.groups),before);
 const items=[{food:"chicken breast",grams:140},{food:"olive oil",grams:5}];
 const first=macrosForIngredients(items);
 formatIngredientMeasure(items[1].food,items[1].grams,"g");
 assert.deepEqual(macrosForIngredients(items),first);
});
test("Nutrition always enters Food Log instead of persisting Meal Plan screen",async()=>{
 const src=await readFile(new URL("../js/nutrition/food-log.js",import.meta.url),"utf8");
 assert.match(src,/showTab\("log"\);/);
 assert.match(src,/if \(safeTab === "meals"\) initializeMealPlanner\(\)/);
 assert.doesNotMatch(src,/bindHubTabs\(hub\);\s*initializeMealPlanner\(\)/);
 assert.doesNotMatch(src,/showTab\(localStorage\.getItem\(CALORIES_TAB_KEY\)\)/);
 assert.match(src,/data-calories-tab="log">Food Log/);
 assert.match(src,/data-calories-tab="meals">Meal Plan/);
});
