import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {recipeDetailMarkup,baseRecipes} from "../js/nutrition/meal-planner-catalog-ui.js";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
const source=async path=>readFile(new URL(path,import.meta.url),"utf8");

test("both base and featured recipe detail show four per-portion nutrition metrics",()=>{
 for(const recipe of [baseRecipes().find(x=>!x.groups&&!x.indexOnly),FEATURED_RECIPES[0]]){
  const html=recipeDetailMarkup(recipe,false,3);
  assert.match(html,/Nutrition per portion/);
  assert.match(html,/mp-macro-calories/);
  for(const label of ["Cal","Protein","Fat","Carbs"])assert.ok(html.includes(label),label);
  assert.match(html,/3 planned meals/);
 }
});
test("day selection restores the replaced fixed panel scroll instead of window alone",async()=>{
 const ui=await source("../js/nutrition/meal-planner-ui.js");
 assert.match(ui,/const oldPanel=root\.querySelector\("\.mp-standalone"\)/);
 assert.match(ui,/const panelTop=oldPanel\?\.scrollTop/);
 assert.match(ui,/newPanel\.scrollTop=panelTop/);
 assert.match(ui,/renderWithoutScrollJump\(root\)/);
});
test("My Week renders a three-dot remove menu and keeps Food Log ingredients",async()=>{
 const ui=await source("../js/nutrition/meal-planner-ui.js");
 assert.match(ui,/mp-meal-card-menu/);
 assert.match(ui,/data-meal-remove/);
 assert.match(ui,/removeScheduledMeal\(current,date,slot\)/);
 assert.match(ui,/already logged in Food Log will be kept/);
 assert.match(ui,/markPlannedMealConsumed\(date,slot,ingredients,servings\)/);
 assert.match(ui,/consumptionActions\(entry,recipe\)/);
 assert.ok(ui.indexOf('root.querySelectorAll("[data-meal-consume]")')<ui.indexOf('if(page!=="calendar")return;'));
});
