import test from "node:test";
import assert from "node:assert/strict";
import {FEATURED_RECIPES,featuredIngredients,scaledFeaturedGrocery} from "../js/nutrition/meal-planner-featured-recipes.js";
const recipe=FEATURED_RECIPES[0];
test("Source-linked recipe is complete and explicitly unverified",()=>{
 assert.equal(recipe.servings,5);
 assert.equal(recipe.groups.length,3);
 assert.equal(recipe.imageStatus,"awaiting-unique-ingredient-accurate-image");
 assert.match(recipe.sourceUrl,/^https:\/\/mealprepmanual\.com\//);
 assert.match(recipe.reviewStatus,/awaiting/);
 assert.equal(recipe.publishedEstimate.calories,490);
 const all=featuredIngredients(recipe);
 assert.ok(all.some(x=>x.food==="Smoked paprika"));
 assert.ok(all.some(x=>x.food==="Garlic powder"));
 assert.ok(all.some(x=>x.food==="Cooking oil"));
 assert.ok(all.some(x=>x.food==="Plain Greek yogurt, 2% milk fat"));
});
test("Meal prep grocery list scales full recipe, including repeated oils and spices",()=>{
 const five=scaledFeaturedGrocery(recipe,5);
 const three=scaledFeaturedGrocery(recipe,3);
 const amount=(rows,name)=>rows.find(x=>x.food===name)?.grams;
 assert.equal(amount(five,"Chicken thighs, boneless skinless, raw"),908);
 assert.equal(amount(three,"Chicken thighs, boneless skinless, raw"),908*3/5);
 assert.equal(amount(five,"Cooking oil"),45);
 assert.equal(amount(three,"Cooking oil"),27);
 assert.equal(amount(three,"Garlic powder"),9*3/5);
 assert.equal(amount(three,"Lime juice"),45*3/5);
 assert.equal(five.filter(x=>x.food==="Cooking oil").length,1);
});
