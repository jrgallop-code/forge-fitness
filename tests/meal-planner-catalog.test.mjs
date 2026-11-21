import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {baseRecipes,matchesCatalog,photoMarkup,catalogMarkup,recipeDetailMarkup,CATALOG_SLOTS,CATALOG_FILTERS} from "../js/nutrition/meal-planner-catalog-ui.js";
import {recipePhoto,recipeBaseIndex} from "../js/nutrition/meal-planner-photos.js";
const ui=readFileSync(new URL("../js/nutrition/meal-planner-ui.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../css/meal-planner-catalog-polish.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("catalog has 40 distinct base recipes and four meal categories",()=>{
 const recipes=baseRecipes();
 assert.equal(recipes.length,40);
 assert.equal(new Set(recipes.map(r=>r.id)).size,40);
 assert.deepEqual(CATALOG_SLOTS,["All","Breakfast","Lunch","Dinner","Snacks"]);
 for(const slot of ["Breakfast","Lunch","Dinner","Meal 4"])assert.ok(recipes.some(r=>r.slot===slot));
});
test("catalog search and dietary/meal filters work",()=>{
 const list=baseRecipes();
 assert.ok(list.some(r=>matchesCatalog(r,{slot:"Lunch",search:"chicken"})));
 assert.ok(list.some(r=>matchesCatalog(r,{slot:"Snacks"})));
 assert.ok(list.every(r=>!matchesCatalog(r,{slot:"Dinner",filter:"Vegan"})||r.diet==="vegan"));
 assert.ok(CATALOG_FILTERS.includes("High protein"));
});
test("recipe photographs have local generated slots and representative fallbacks",()=>{
 const recipes=baseRecipes();
 for(const [i,recipe] of recipes.entries()){
  assert.equal(recipeBaseIndex(recipe),i);
  const info=recipePhoto(recipe);
  assert.equal(info.primary,"/assets/meal-photos/"+String(i+1).padStart(3,"0")+".webp");
  assert.match(info.fallback,/^https:\/\/images\.unsplash\.com\//);
  assert.match(photoMarkup(recipe),/data-photo-fallback/);
 }
});
test("catalog pages render recipe details, instructions and favorites",()=>{
 const catalog=catalogMarkup({slot:"Lunch",filter:"All recipes"});
 assert.match(catalog,/mp-catalog-search/);
 assert.match(catalog,/mp-catalog-grid/);
 assert.match(catalog,/data-mp-favorite/);
 const detail=recipeDetailMarkup(baseRecipes()[7],true);
 assert.match(detail,/Cooking instructions/);
 assert.match(detail,/data-mp-use-recipe/);
 assert.match(detail,/mp-recipe-hero/);
});
test("plan generator has visible app loader instead of freezing the questionnaire",()=>{
 assert.match(ui,/Plating your week/);
 assert.match(ui,/mp-loading-apple/);
 assert.match(ui,/plannerScreen="loading";render\(root\)/);
 assert.match(ui,/requestAnimationFrame/);
 assert.match(css,/@keyframes mp-orbit/);
 assert.match(css,/prefers-reduced-motion/);
});
test("Classic secondary button and plan cards use active theme colors",()=>{
 assert.ok(html.includes("css/meal-planner-catalog-polish.css"));
 assert.match(css,/\.mp-landing-secondary/);
 assert.match(css,/color:var\(--text\)!important/);
 assert.match(css,/\.mp-calendar \.lu-meal-day/);
 assert.match(css,/\.mp-calendar \.lu-meal-card/);
 assert.match(css,/\.mp-day-option\.active/);
});
