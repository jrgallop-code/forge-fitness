import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MEAL_CATALOG} from "../js/nutrition/meal-planner-data.js";
import {
 baseRecipes,matchesCatalog,photoMarkup,catalogMarkup,recipeDetailMarkup,
 CATALOG_SLOTS,CATALOG_FILTERS,RECIPE_STYLE_CHOICES,RECIPE_STYLE_SETTINGS_KEY,
 selectedRecipeStyles,saveRecipeStyles,matchesRecipeStyles,isCompleteRecipe,recipeStyle
} from "../js/nutrition/meal-planner-catalog-ui.js";
import {recipePhoto} from "../js/nutrition/meal-planner-photos.js";
const ui=readFileSync(new URL("../js/nutrition/meal-planner-ui.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../css/meal-planner-catalog-polish.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const values=new Map();
globalThis.localStorage={
 getItem:key=>values.get(key)??null,
 setItem:(key,value)=>values.set(key,String(value)),
 removeItem:key=>values.delete(key)
};
test("catalog includes 300 genuine source listings plus preserved finished Level Up recipes",()=>{
 const recipes=baseRecipes();
 assert.ok(recipes.length>=300);
 assert.equal(new Set(recipes.map(r=>r.name.toLowerCase())).size,recipes.length);
 assert.equal(recipes.filter(r=>matchesCatalog(r,{filter:"Meal Prep Manual (300)",styles:[]})).length,300);
 assert.ok(recipes.filter(r=>matchesCatalog(r,{filter:"Ready to plan",styles:[]})).every(isCompleteRecipe));
 assert.deepEqual(CATALOG_SLOTS,["All","Breakfast","Lunch","Dinner","Snacks"]);
 assert.ok(CATALOG_FILTERS.includes("Meal Prep Manual (300)"));
 assert.ok(CATALOG_FILTERS.includes("Ready to plan"));
 for(const slot of ["Breakfast","Lunch","Dinner","Meal 4"])assert.ok(recipes.some(r=>r.slot===slot));
});
test("meal time, food type and ingredient search are independent",()=>{
 const list=baseRecipes();
 assert.ok(list.some(r=>matchesCatalog(r,{slot:"Lunch",search:"chicken",styles:[]})));
 assert.ok(list.some(r=>matchesCatalog(r,{slot:"Snacks",styles:[]})));
 assert.ok(list.some(r=>matchesCatalog(r,{foodType:"Fish & seafood",styles:[]})));
 assert.ok(!list.some(r=>matchesCatalog(r,{search:"nonexistentfoodstuff",styles:[]})));
});
test("food preferences save, allow multiple styles and exclude incompatible recipes",()=>{
 assert.equal(RECIPE_STYLE_CHOICES.length,4);
 assert.deepEqual(selectedRecipeStyles(),[]);
 saveRecipeStyles(["Vegetarian","Vegan"]);
 assert.deepEqual(selectedRecipeStyles(),["Vegetarian","Vegan"]);
 const recipes=baseRecipes().filter(r=>matchesRecipeStyles(r,selectedRecipeStyles()));
 assert.ok(recipes.length>0);
 assert.ok(recipes.every(r=>["Vegetarian","Vegan"].includes(recipeStyle(r))));
 assert.equal(matchesRecipeStyles({diet:"omnivore",ingredients:[{food:"chicken breast"}]},selectedRecipeStyles()),false);
 assert.equal(matchesRecipeStyles({diet:"pescatarian",ingredients:[{food:"salmon"}]},selectedRecipeStyles()),false);
 saveRecipeStyles(["Meat & poultry","Fish & seafood"]);
 const meat=baseRecipes().filter(r=>matchesRecipeStyles(r,selectedRecipeStyles()));
 assert.ok(meat.some(r=>recipeStyle(r)==="Meat & poultry"));
 assert.ok(meat.some(r=>recipeStyle(r)==="Fish & seafood"));
 saveRecipeStyles([]);
 assert.equal(values.get(RECIPE_STYLE_SETTINGS_KEY),"[]");
});
test("food preferences, meal photos and complete recipes appear in catalogue",()=>{
 const out=catalogMarkup({filter:"Ready to plan"});
 assert.match(out,/mp-catalog-search/);
 assert.match(out,/data-mp-style-settings/);
 assert.match(out,/data-mp-style-choice/);
 assert.match(out,/data-mp-food-type/);
 assert.match(out,/data-mp-favorite/);
 assert.match(out,/mp-catalog-grid/);
 assert.doesNotMatch(out,/mealprepmanual\.com|View the original recipe|source-indexed recipes/i);
 assert.match(ui,/data-mp-style-done/);
 const detail=recipeDetailMarkup(baseRecipes().find(r=>Array.isArray(r.ingredients)));
 assert.match(detail,/Cooking instructions/);
 assert.match(detail,/mp-ingredient-group/);
 assert.match(detail,/data-mp-schedule/);
 assert.doesNotMatch(detail,/<a href=|mealprepmanual\.com/i);
});
test("in-app base recipes retain local imagery and estimated nutrition",()=>{
 const classic=MEAL_CATALOG.filter(r=>!r.name.includes(" · "));
 assert.equal(classic.length,40);
 for(const recipe of classic){
  const photo=recipePhoto(recipe);
  if(photo.primary){assert.ok(photo.tile>=0&&photo.tile<40);assert.match(photoMarkup(recipe),/mp-ai-photo/);}
  else {assert.equal(photo.source,"photo-pending");assert.match(photoMarkup(recipe),/Photo pending/);}
 }
 const available=classic.map(recipePhoto).filter(p=>p.primary);
 assert.equal(available.length,30);
 assert.equal(new Set(available.map(p=>p.primary+"|"+p.tile)).size,available.length);
 const detail=recipeDetailMarkup(classic[3]);
 assert.match(detail,/Cooking instructions/);
 assert.match(detail,/mp-ingredient-group/);
});
test("plan generator keeps visible loading and theme styling",()=>{
 assert.match(ui,/Plating your week/);
 assert.match(ui,/mp-loading-apple/);
 assert.match(ui,/plannerScreen="loading";render\(root\)/);
 assert.match(ui,/requestAnimationFrame/);
 assert.match(css,/@keyframes mp-orbit/);
 assert.match(css,/prefers-reduced-motion/);
 assert.ok(html.includes("css/meal-planner-catalog-polish.css"));
 assert.ok(html.includes("css/ios-nutrition-polish.css"));
});
