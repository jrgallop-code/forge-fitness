import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const index=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../css/meal-planner-appearance-fix.css",import.meta.url),"utf8");
const ui=readFileSync(new URL("../js/nutrition/meal-planner-ui.js",import.meta.url),"utf8");
const art=readFileSync(new URL("../js/nutrition/meal-planner-food-art.js",import.meta.url),"utf8");
test("meal planner CSS is loaded globally after shared theme tokens",()=>{
 assert.ok(index.includes("css/meal-planner-appearance-fix.css"));
 assert.ok(index.indexOf("css/meal-planner-appearance-fix.css")>index.indexOf("css/appearance-themes.css"));
});
test("standalone onboarding and navigation use semantic appearance tokens",()=>{
 for(const token of ["var(--bg)","var(--card)","var(--input-bg)","var(--accent)","var(--line)"]){
  assert.ok(css.includes(token),token);
 }
 assert.ok(css.includes(".mp-onboarding .mp-photo-grid"));
 assert.ok(css.includes(".mp-onboarding .mp-pill"));
 assert.ok(css.includes(".bottom-nav"));
 assert.ok(css.includes("visibility:hidden!important"));
 assert.ok(ui.includes('lu-meal-planner mp-onboarding mp-standalone'));
});
test("questionnaire uses ten ordered, distinct steps and readable two-column food cards",()=>{
 const indices=[...ui.matchAll(/data-mp-step="(\d+)"/g)].map(x=>Number(x[1]));
 assert.deepEqual(indices,[0,1,2,3,4,5,6,7,8,9]);
 assert.ok(css.includes("mp-produce-grid"));
 assert.ok(css.includes("repeat(2,minmax(0,1fr))"));
 assert.ok(ui.includes("data-mp-review"));
});
test("food and diet art is food-specific, never repeated by category",()=>{
 for(const name of ["Broccoli","Blueberries","Apple","Avocado","Sweet potato"]){
  assert.ok(art.includes(name));
 }
 for(const diet of ["pescatarian","vegan","high-protein","vegetarian"]){
  assert.ok(art.includes(diet));
 }
 assert.ok(ui.includes("ingredientIllustration(x)"));
 assert.ok(ui.includes("photoMarkup(MEAL_CATALOG[dietRecipeBaseIndex(id)*20])"));
 assert.ok(ui.includes("photoMarkup(recipe)"));
});
