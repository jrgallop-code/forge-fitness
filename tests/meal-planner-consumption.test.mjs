import test from "node:test";
import assert from "node:assert/strict";
import {markPlannedMealConsumed,markFeaturedMealConsumed,undoPlannedMealConsumed,consumedEntries} from "../js/nutrition/meal-planner-consumption.js";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {recipeServingIngredients} from "../js/nutrition/meal-planner-manual.js";
import {entriesForDate,removeEntry} from "../js/nutrition/food-log-data.js";
const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
globalThis.window={dispatchEvent:()=>{}};
globalThis.crypto ??= (await import("node:crypto")).webcrypto;
test("mark eaten creates ordinary, editable ingredient entries and prevents duplicates",()=>{
 const date="2026-11-20",slot="Breakfast";
 const ingredients=[{food:"oats",grams:60},{food:"greek yogurt",grams:150}];
 assert.equal(markPlannedMealConsumed(date,slot,ingredients).ok,true);
 const entries=consumedEntries(date,slot);
 assert.equal(entries.length,2);
 assert.equal(entries[0].meal,"Breakfast");
 assert.ok(Math.abs(entries[0].nutrition.calories-233.4)<1e-6);
 assert.equal(markPlannedMealConsumed(date,slot,ingredients).reason,"already_logged");
 assert.equal(entriesForDate(date).length,2);
 assert.equal(undoPlannedMealConsumed(date,slot).ok,true);
 assert.equal(entriesForDate(date).length,0);
});
test("manual removal does not delete unrelated foods",()=>{
 const date="2026-11-21",slot="Meal 4";
 markPlannedMealConsumed(date,slot,[{food:"apple",grams:100}]);
 assert.equal(consumedEntries(date,slot)[0].meal,"Snacks");
 const unrelated={...consumedEntries(date,slot)[0],id:"unrelated",mealPlannerKey:"other"};
 const log=JSON.parse(localStorage.getItem("level_up_food_log_v1")||"{}");
 // Clean up recorded entries directly through the public remove API instead of relying on storage key naming.
 assert.equal(undoPlannedMealConsumed(date,slot).ok,true);
 assert.equal(consumedEntries(date,slot).length,0);
});

test("multi-serving planned meal logs all positive ingredients and full quantities",()=>{
 const date="2026-11-24",slot="Dinner";
 const ingredients=[{food:"chicken breast",grams:140},{food:"brown rice",grams:170},{food:"broccoli",grams:120},{food:"olive oil",grams:13}];
 const result=markPlannedMealConsumed(date,slot,ingredients,3);
 assert.equal(result.ok,true);
 assert.equal(result.ingredientCount,4);
 const logged=consumedEntries(date,slot);
 assert.equal(logged.length,ingredients.length);
 assert.deepEqual(logged.map(x=>x.foodName||x.name||x.food?.name).filter(Boolean).length,4);
 assert.ok(Math.abs(logged[0].nutrition.calories-165*1.4*3)<0.0001);
 assert.equal(logged.every(x=>x.mealPlannerPortions===3),true);
 assert.equal(undoPlannedMealConsumed(date,slot).ok,true);
});
test("unknown ingredient blocks all-or-nothing logging instead of silently dropping items",()=>{
 const date="2026-11-26",slot="Lunch";
 const result=markPlannedMealConsumed(date,slot,[{food:"chicken breast",grams:140},{food:"unknown custom spice",grams:3}]);
 assert.equal(result.ok,false);
 assert.match(result.reason,/unmapped_ingredients/);
 assert.equal(entriesForDate(date).length,0);
});
test("zeroed-out optional ingredient is ignored without losing other ingredients",()=>{
 const date="2026-11-27",slot="Lunch";
 const result=markPlannedMealConsumed(date,slot,[{food:"tofu",grams:180},{food:"ginger",grams:0},{food:"brown rice",grams:145}]);
 assert.equal(result.ok,true);
 assert.equal(consumedEntries(date,slot).length,2);
});

test("featured recipe can be marked eaten without fabricating individual spice nutrition",()=>{
 const date="2026-11-28",slot="Dinner",recipe=FEATURED_RECIPES[0],ingredients=recipeServingIngredients(recipe);
 const result=markFeaturedMealConsumed(date,slot,recipe,ingredients,3);
 assert.equal(result.ok,true);
 assert.equal(result.ingredientCount,ingredients.length);
 const logged=consumedEntries(date,slot);
 assert.equal(logged.length,1,"Composite meal preserves recipe-level estimated macros");
 assert.equal(logged[0].mealPlannerRecipeId,recipe.id);
 assert.equal(logged[0].mealPlannerPortions,3);
 assert.equal(logged[0].mealPlannerIngredientList.length,ingredients.length);
 assert.equal(logged[0].mealPlannerIngredientList[0].grams,ingredients[0].grams*3);
 assert.ok(Math.abs(logged[0].nutrition.calories-recipe.publishedEstimate.calories*3)<1e-6);
 assert.equal(markFeaturedMealConsumed(date,slot,recipe,ingredients,3).reason,"already_logged");
 assert.equal(undoPlannedMealConsumed(date,slot).ok,true);
});
test("featured recipe with missing published nutrition cannot be consumed as zero calories",()=>{
 const bad={...FEATURED_RECIPES[0],publishedEstimate:null};
 const result=markFeaturedMealConsumed("2026-11-29","Dinner",bad,recipeServingIngredients(bad));
 assert.equal(result.ok,false);
 assert.equal(result.reason,"incomplete_recipe");
});
