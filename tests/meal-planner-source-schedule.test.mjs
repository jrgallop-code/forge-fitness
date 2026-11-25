import test from "node:test";
import assert from "node:assert/strict";
import { baseRecipes,recipeDetailMarkup } from "../js/nutrition/meal-planner-catalog-ui.js";
import { recipeServingIngredients,scheduleRecipe } from "../js/nutrition/meal-planner-manual.js";
import { estimateIngredientBatchGrams } from "../js/nutrition/meal-planner-source-schedulable.js";
import {readFileSync} from "node:fs";
const names=["Big Boy Korean BBQ Beef Bowls","Mediterranean Spiced Beef","Broccoli Cheddar Rice","Veggie Rice","Creamy Cilantro Lime Chicken Bowls"];
test("all five photographed source meals use the existing recipe view and allow scheduling",()=>{
 const recipes=baseRecipes();
 for(const name of names){
  const recipe=recipes.find(x=>x.name===name);
  assert.ok(recipe,name);
  assert.equal(recipe.indexOnly,false,name);
  assert.equal(recipe.canSchedule,true,name);
  assert.ok(recipe.groups.some(g=>g.ingredients?.length),name);
  const html=recipeDetailMarkup(recipe,false,3);
  assert.match(html,/data-mp-schedule=/);
  assert.match(html,/Original recipe batch amounts/);
  assert.match(html,/3 planned meals/);
  const entry=scheduleRecipe(null,recipe,{startDate:"2026-11-23",dayOffsets:[0,2,4],slots:["Lunch","Dinner"],portionsPerDay:2});
  assert.equal(entry.entries.length,6);
  assert.ok(entry.entries.every(x=>x.servings===2&&x.ingredients.length>0));
  assert.ok(recipeServingIngredients(recipe).every(x=>x.grams>0));
 }
});
test("source conversion uses sensible approximate kitchen quantities",()=>{
 assert.ok(Math.abs(estimateIngredientBatchGrams("2 lbs ground beef")-907.184)<1);
 assert.ok(Math.abs(estimateIngredientBatchGrams(".75 lb frozen broccoli florets")-340.194)<1);
 assert.ok(estimateIngredientBatchGrams("1.75 cups rice (uncooked)")>300);
 assert.equal(estimateIngredientBatchGrams("salt and pepper to taste"),null);
});
test("shared day and portions controls resolve promoted catalogue recipes",()=>{
 const ui=readFileSync("js/nutrition/meal-planner-ui.js","utf8");
 assert.match(ui,/data-mp-schedule-day/);
 assert.match(ui,/data-mp-schedule-portions/);
 assert.match(ui,/baseRecipes\(\)\.find\(x=>x\.id===recipeId\)/);
 assert.match(ui,/baseRecipes\(\)\.find\(x=>x\.id===catalogRecipeId\)/);
});
