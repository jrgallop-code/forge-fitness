import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {mealPlannerShortcutMarkup} from "../js/nutrition/meal-planner-home.js";
import {recipeDetailMarkup,baseRecipes} from "../js/nutrition/meal-planner-catalog-ui.js";
import {recipePhoto} from "../js/nutrition/meal-planner-photos.js";
import {featuredIngredients,FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {formatIngredientMeasure} from "../js/nutrition/meal-planner-measurements.js";
import {scheduleRecipe} from "../js/nutrition/meal-planner-manual.js";
const fromFile=path=>readFile(new URL(path,import.meta.url));
test("SVG shortcuts remain available on every iOS recipe/planner screen",async()=>{
 const nav=mealPlannerShortcutMarkup("catalog");
 for(const page of ["calendar","groceries","catalog","favorites"])assert.match(nav,new RegExp('data-mp-open="'+page+'"'));
 assert.equal((nav.match(/<svg/g)||[]).length,4);
 assert.match(nav,/aria-current="page"/);
 const source=(await fromFile("../js/nutrition/meal-planner-ui.js")).toString();
 assert.match(source,/page!=="home"/);
 assert.match(source,/insertAdjacentHTML\("afterend",mealPlannerShortcutMarkup\(page\)\)/);
});
test("one, three and six planned meals have correctly scaled base recipe ingredients",()=>{
 const recipe=baseRecipes().find(x=>!x.groups&&x.ingredients?.length);
 assert.ok(recipe);
 const ingredient=recipe.ingredients[0];
 for(const n of [1,3,6]){
  const html=recipeDetailMarkup(recipe,false,n);
  assert.ok(html.includes(formatIngredientMeasure(ingredient.food,ingredient.grams*n,"g")),n);
  assert.ok(html.includes(n+" planned meal"),n);
 }
});
test("featured recipes scale from the original multi-serving batch to selected meal count",()=>{
 const recipe=FEATURED_RECIPES[0],first=featuredIngredients(recipe)[0];
 assert.ok(recipe.servings>1);
 const html=recipeDetailMarkup(recipe,false,3);
 assert.ok(html.includes(formatIngredientMeasure(first.food,first.grams*3/recipe.servings,first.unit||"g")));
});
test("three selected days create exactly three unconsumed portions and matching batch grocery totals",()=>{
 const recipe=baseRecipes().find(x=>!x.groups&&x.ingredients?.length);
 const plan=scheduleRecipe(null,recipe,{startDate:"2026-11-23",dayOffsets:[0,2,4],slots:["Dinner"],portionsPerDay:1});
 assert.equal(plan.entries.length,3);
 assert.equal(plan.entries.reduce((n,e)=>n+e.servings,0),3);
 assert.ok(plan.entries.every(e=>!e.consumed&&e.manuallyScheduled));
 const qty=plan.entries.reduce((n,e)=>n+e.ingredients[0].grams*e.servings,0);
 assert.equal(qty,recipe.ingredients[0].grams*3);
});
test("featured and ten later recipes use non-duplicated higher-resolution photo assets",async()=>{
 const recipes=baseRecipes();
 const featured=FEATURED_RECIPES.slice(0,8);
 assert.equal(featured.length,8);
 const f=featured.map(recipePhoto);
 assert.equal(new Set(f.map(p=>p.tile)).size,8);
 assert.ok(f.every(p=>p.primary.includes("/assets/meal-photos/featured8-hq.avif")));
 const later=recipes.filter(x=>x.id?.startsWith("lu-meal-")&&Number(x.id.replace("lu-meal-",""))>=401&&Number(x.id.replace("lu-meal-",""))<=581);
 assert.equal(later.length,10);
 assert.ok(later.every(r=>recipePhoto(r).primary.includes("base20-29-hq.avif")));
 const bytes=await Promise.all(["../assets/meal-photos/featured8-hq.avif","../assets/meal-photos/base20-29-hq.avif"].map(fromFile));
 for(const b of bytes){assert.ok(b.length>100000);assert.equal(b.toString("ascii",4,12),"ftypavif");}
});
