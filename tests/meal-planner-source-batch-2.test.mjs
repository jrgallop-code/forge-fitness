import test from "node:test";
import assert from "node:assert/strict";
import {FEATURED_RECIPES,featuredIngredients,scaledFeaturedGrocery} from "../js/nutrition/meal-planner-featured-recipes.js";
import {MPM_INDEX_RECIPES} from "../js/nutrition/meal-prep-manual-discovery.js";
import {baseRecipes,matchesCatalog} from "../js/nutrition/meal-planner-catalog-ui.js";
import {scheduleRecipe} from "../js/nutrition/meal-planner-manual.js";
import {groceryList} from "../js/nutrition/meal-planner-data.js";
test("eight source-linked reviewed ingredient inventories promote unique indexed dishes",()=>{
 assert.equal(FEATURED_RECIPES.length,8);
 assert.equal(baseRecipes().length,MPM_INDEX_RECIPES.length);
 assert.equal(baseRecipes().filter(x=>matchesCatalog(x,{filter:"Detailed recipes"})).length,8);
 for(const recipe of FEATURED_RECIPES){
  assert.ok(recipe.groups.length>=2);
  assert.ok(recipe.steps.length>=4);
  assert.ok(recipe.sourceUrl.startsWith("https://mealprepmanual.com/"));
  assert.match(recipe.reviewStatus,/awaiting/);
  assert.ok(!recipe.nutritionVerified);
  assert.ok(featuredIngredients(recipe).some(x=>/oil|powder|pepper|sauce|honey|curry|cumin|gochujang|sriracha/i.test(x.food)));
 }
});
test("batch scaling respects mixed g and mL and never claims source nutrition verified",()=>{
 const wraps=FEATURED_RECIPES.find(x=>x.name==="Mediterranean Chicken Wraps");
 const items=scaledFeaturedGrocery(wraps,3);
 const oil=items.filter(x=>x.food==="Olive oil");
 assert.equal(oil.length,2);
 assert.equal(oil.find(x=>x.unit==="mL").grams,3.5);
 assert.equal(oil.find(x=>x.unit==="g").grams,3.5);
 const plan=scheduleRecipe(null,wraps,{startDate:"2026-11-23",dayOffsets:[0,1,2],slots:["Dinner"],portionsPerDay:1});
 assert.equal(plan.entries.length,3);
 assert.ok(plan.entries.every(x=>!x.nutritionVerified));
 const shopping=groceryList(plan);
 assert.ok(shopping.find(x=>x.food==="Lemon juice"&&x.unit==="mL"));
 assert.equal(shopping.find(x=>x.food==="Lemon juice"&&x.unit==="mL").grams,15);
 assert.ok(shopping.some(x=>x.food==="Olive oil"&&x.unit==="mL"));
 assert.ok(shopping.some(x=>x.food==="Olive oil"&&x.unit==="g"));
});
