import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { mealPrepRecipes } from "../js/nutrition/meal-prep-recipes.js";

test("every bundled meal-prep recipe has a distinct local AI-photo tile and accessible illustration fallback", () => {
 const tileKeys=new Set();
 assert.ok(mealPrepRecipes.length>=12);
 for(const recipe of mealPrepRecipes){
  assert.ok(recipe.image.startsWith("/assets/meal-photos/"),recipe.name);
  assert.ok(existsSync(new URL(".."+recipe.image,import.meta.url)),recipe.name);
  assert.ok(recipe.imageFallback?.endsWith(".svg"),recipe.name);
  assert.ok(existsSync(new URL(".."+recipe.imageFallback,import.meta.url)),recipe.name);
  assert.ok(Number.isInteger(recipe.imageTile)&&recipe.imageTile>=0,recipe.name);
  assert.ok(recipe.imageTile<recipe.imageColumns*recipe.imageRows,recipe.name);
  const key=recipe.image+"#"+recipe.imageTile;
  assert.ok(!tileKeys.has(key),"Duplicate photo tile for "+recipe.name);
  tileKeys.add(key);
  assert.ok(recipe.ingredients?.length,"Missing ingredients: "+recipe.name);
  assert.ok(recipe.instructions?.length,"Missing instructions: "+recipe.name);
 }
});

test("meal-prep recipe cards and details render the corresponding atlas crop",()=>{
 const ui=readFileSync(new URL("../js/nutrition/meal-prep-beta.js",import.meta.url),"utf8");
 assert.match(ui,/recipePhotoMarkup/);
 assert.match(ui,/background-size:/);
 assert.match(ui,/lump-detail-photo/);
 assert.doesNotMatch(ui,/Food photo pending|Food photograph pending/);
});
