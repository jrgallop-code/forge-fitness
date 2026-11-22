import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {baseRecipes,recipeCard,recipeDetailMarkup,recipeNutritionEstimate} from "../js/nutrition/meal-planner-catalog-ui.js";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {removeScheduledMeal,scheduleRecipe} from "../js/nutrition/meal-planner-manual.js";
test("all 40 complete base recipes show per-portion macros on their catalogue cards",()=>{
 const base=baseRecipes().filter(x=>!x.groups&&!x.indexOnly);
 assert.equal(base.length,40);
 for(const recipe of base){
  const m=recipeNutritionEstimate(recipe),html=recipeCard(recipe);
  assert.ok(m && Number.isFinite(m.calories),recipe.name);
  for(const token of [Math.round(m.calories)+" kcal","P "+Math.round(m.protein)+"g","C "+Math.round(m.carbs)+"g","F "+Math.round(m.fat)+"g"])assert.ok(html.includes(token),recipe.name+": "+token);
  assert.ok(recipeDetailMarkup(recipe).includes("Nutrition per portion"));
 }
});
test("all 8 featured recipe cards use same published estimate as detail page",()=>{
 assert.equal(FEATURED_RECIPES.length,8);
 for(const recipe of FEATURED_RECIPES){
  const m=recipeNutritionEstimate(recipe),html=recipeCard(recipe);
  assert.match(html,new RegExp(Math.round(m.calories)+" kcal"));
  assert.ok(html.includes("P "+Math.round(m.protein)+"g"));
  assert.ok(recipeDetailMarkup(recipe).includes("Nutrition per portion"));
 }
});
test("My Week has visible remove button and three-dot menu that share a safe handler",async()=>{
 const s=await readFile(new URL("../js/nutrition/meal-planner-ui.js",import.meta.url),"utf8");
 assert.match(s,/class="mp-meal-remove-visible"/);
 assert.match(s,/class="mp-meal-card-menu"/);
 assert.match(s,/root\.querySelectorAll\("\[data-meal-remove\]"\)/);
 assert.match(s,/removeScheduledMeal\(current,date,slot\)/);
 assert.match(s,/Your week is empty/);
});
test("removing one of three scheduled dinners leaves other two and original plan unchanged",()=>{
 const recipe=baseRecipes().find(x=>!x.groups&&!x.indexOnly);
 const plan=scheduleRecipe(null,recipe,{startDate:"2026-11-23",dayOffsets:[0,1,2],slots:["Dinner"],portionsPerDay:1});
 const next=removeScheduledMeal(plan,"2026-11-24","Dinner");
 assert.equal(next.entries.length,2);
 assert.equal(plan.entries.length,3);
 assert.deepEqual(next.entries.map(x=>x.date),["2026-11-23","2026-11-25"]);
 const empty=next.entries.reduce((p,e)=>removeScheduledMeal(p,e.date,e.slot),next);
 assert.equal(empty.entries.length,0);
});
