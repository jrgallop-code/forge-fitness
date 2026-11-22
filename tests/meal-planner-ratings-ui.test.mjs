import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {baseRecipes,catalogMarkup,recipeDetailMarkup} from "../js/nutrition/meal-planner-catalog-ui.js";
import {getRecipeRating,setRecipeRating,readRecipeRatings} from "../js/nutrition/meal-planner-ratings.js";
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
test("recipes offer a single thumb up/down rating row, not review notes or review status",()=>{
 for(const recipe of [FEATURED_RECIPES[0],baseRecipes().find(x=>!x.groups)]){
  const html=recipeDetailMarkup(recipe);
  assert.equal((html.match(/data-mp-vote="up"/g)||[]).length,1);
  assert.equal((html.match(/data-mp-vote="down"/g)||[]).length,1);
  assert.ok(!html.includes("Review this recipe"));
  assert.ok(!html.includes("Review notes"));
 }
 const catalog=catalogMarkup();
 assert.ok(!catalog.includes("First 100 review"));
 assert.ok(!catalog.includes("Awaiting your review"));
});
test("thumbs ratings persist per recipe and can be toggled off",()=>{
 const id=FEATURED_RECIPES[0].id;
 assert.equal(getRecipeRating(id),null);
 assert.equal(setRecipeRating(id,"up"),true);
 assert.equal(getRecipeRating(id),"up");
 assert.equal(setRecipeRating(id,"down"),true);
 assert.equal(getRecipeRating(id),"down");
 assert.equal(setRecipeRating(id,null),true);
 assert.equal(getRecipeRating(id),null);
 assert.equal(Object.keys(readRecipeRatings()).length,0);
});
test("complete featured meals now expose Mark Eaten and use composite ingredient-preserving logging",async()=>{
 const s=await readFile(new URL("../js/nutrition/meal-planner-ui.js",import.meta.url),"utf8");
 assert.match(s,/markFeaturedMealConsumed\(date,slot,recipe,entry.ingredients,entry.servings\|\|1\)/);
 assert.match(s,/sourcePending=featured&&!recipe\?\.publishedEstimate/);
 assert.match(s,/data-meal-consume/);
 const css=await readFile(new URL("../css/meal-planner-catalog-polish.css",import.meta.url),"utf8");
 assert.match(css,/mp-scheduler \.mp-schedule-weekdays button\.active/);
 assert.match(css,/var\(--accent-contrast\)/);
});
