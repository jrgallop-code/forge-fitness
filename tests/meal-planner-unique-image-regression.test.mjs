import test from "node:test";
import assert from "node:assert/strict";
import {baseRecipes} from "../js/nutrition/meal-planner-catalog-ui.js";
import {recipePhoto} from "../js/nutrition/meal-planner-photos.js";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {FEATURED_MEAL_PHOTOS} from "../js/nutrition/featured-unique-photos.js";
import {readFile} from "node:fs/promises";
test("iOS uses one Meal Plan entry point; duplicate top banner is removed",async()=>{
 const router=await readFile(new URL("../js/core/router.js",import.meta.url),"utf8");
 assert.doesNotMatch(router,/initializeMealPrepBeta|Meal prep beta/);
 const foodLog=await readFile(new URL("../js/nutrition/food-log.js",import.meta.url),"utf8");
 assert.match(foodLog,/>Meal Plan<\/button>/);
});
test("all distinct catalogue recipes have nonduplicating photo locations",()=>{
 const recipes=baseRecipes().filter(recipe=>!recipe.indexOnly && (!FEATURED_RECIPES.some(f=>f.id===recipe.id)||FEATURED_RECIPES.slice(0,8).some(f=>f.id===recipe.id)));
 const keys=recipes.map(recipe=>{
  const p=recipePhoto(recipe);
  assert.match(p.primary,/^(?:data:image\/(?:webp|avif);base64,|\/assets\/)/);
  assert.ok(p.backgroundSize);
  return p.primary.slice(0,40)+"|"+p.backgroundSize+"|"+p.tile;
 });
 assert.equal(recipes.length,51); // 48 originals/featured plus three newly schedulable indexed dishes
 assert.ok(baseRecipes().filter(r=>r.indexOnly).every(r=>r.photoStatus==="awaiting-licensed-image"||r.photoStatus==="not-created"));
 assert.equal(new Set(keys).size,keys.length,
   "Two different recipes may not point to the same image tile");
 assert.ok(FEATURED_RECIPES.length>=12);
});
test("eight generated featured images have correct binary header and assigned unique tiles",()=>{
 assert.match(FEATURED_MEAL_PHOTOS,/^data:image\/avif;base64,/);
 const bytes=Buffer.from(FEATURED_MEAL_PHOTOS.split(",")[1],"base64");
 assert.equal(bytes.toString("ascii",4,12),"ftypavif");
 const photos=FEATURED_RECIPES.slice(0,8).map(recipePhoto);
 const tiles=photos.filter(p=>p.primary.includes("/featured8-hq.avif")).map(p=>p.tile);
 assert.deepEqual([...tiles].sort((a,b)=>a-b),[1,3,4,5,6,7]);
 assert.equal(photos.filter(p=>p.primary.includes("/source-recreations/big-boy-korean-bbq-beef-bowls.webp")).length,1);
 assert.equal(photos.filter(p=>p.primary.includes("/source-recreations/creamy-cilantro-lime-chicken-bowls.webp")).length,1);
 assert.equal(new Set(photos.map(p=>p.primary+"|"+p.tile)).size,8);
});
