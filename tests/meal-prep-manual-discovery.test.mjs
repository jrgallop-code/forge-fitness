import test from "node:test";
import assert from "node:assert/strict";
import {MPM_INDEX_RECIPES,MPM_INDEX_COUNT} from "../js/nutrition/meal-prep-manual-discovery.js";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {baseRecipes,matchesCatalog} from "../js/nutrition/meal-planner-catalog-ui.js";
test("public index contains hundreds of unique real titles without artificial variant names",()=>{
 assert.ok(MPM_INDEX_COUNT>=300);
 assert.equal(new Set(MPM_INDEX_RECIPES.map(x=>x.id)).size,MPM_INDEX_COUNT);
 assert.equal(new Set(MPM_INDEX_RECIPES.map(x=>x.name.toLowerCase())).size,MPM_INDEX_COUNT);
 assert.ok(!MPM_INDEX_RECIPES.some(x=>x.name.includes(" · Hearty")||x.name.includes(" · Extra protein")));
});
test("indexed recipes are discovery-only and cannot masquerade as nutritional data",()=>{
 assert.ok(MPM_INDEX_RECIPES.every(x=>x.indexOnly&&x.ingredients===null));
 assert.ok(MPM_INDEX_RECIPES.every(x=>x.verificationStatus==="title-index-only"&&!x.photo));
 assert.ok(MPM_INDEX_RECIPES.every(x=>x.sourceIndexUrl.startsWith("https://mealprepmanual.com/recipes/")));
});
test("catalog promotes detailed recipes, avoids source-index duplicates and supports search",()=>{
 const recipes=baseRecipes();
 assert.equal(recipes.length,MPM_INDEX_COUNT);
 assert.equal(new Set(recipes.map(x=>x.name.toLowerCase())).size,recipes.length);
 assert.ok(recipes.some(x=>x.id===FEATURED_RECIPES[0].id));
 assert.ok(recipes.some(x=>matchesCatalog(x,{search:"Tikka Masala"})));
 assert.ok(recipes.some(x=>matchesCatalog(x,{filter:"Detailed recipes"})));
 assert.ok(recipes.filter(x=>matchesCatalog(x,{filter:"Source index only"})).every(x=>x.indexOnly));
 assert.equal(recipes.filter(x=>matchesCatalog(x,{filter:"Detailed recipes"})).length,FEATURED_RECIPES.length);
});
