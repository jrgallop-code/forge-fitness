import test from "node:test";
import assert from "node:assert/strict";
import {mealPrepRecipes} from "../js/nutrition/meal-prep-recipes.js";
import {mealPhotoSprite} from "../js/nutrition/meal-prep-images.js";
import {initializeMealPrepBeta,sum} from "../js/nutrition/meal-prep-beta.js";

test("iOS recipe catalogue has unique complete draft recipes",()=>{
  assert.equal(mealPrepRecipes.length,12);
  assert.equal(new Set(mealPrepRecipes.map(r=>r.id)).size,mealPrepRecipes.length);
  for(const recipe of mealPrepRecipes){
    assert.ok(recipe.name);
    assert.ok(recipe.servings>=1);
    assert.ok(recipe.ingredients.length>=8,recipe.id);
    assert.ok(recipe.instructions.length>=5,recipe.id);
    assert.ok(recipe.ingredients.every(([name,qty,unit])=>name&&qty>0&&unit),recipe.id);
    assert.equal(recipe.verified,false);
  }
});

test("all 12 meals have an embedded generated preview sheet",()=>{
  assert.match(mealPhotoSprite,/^data:image\/avif;base64,/);
  assert.ok(mealPhotoSprite.length>5000);
  assert.equal(mealPrepRecipes.length,4*3);
});

test("PWA initialization never installs native meal planner UI",()=>{
  const previous=globalThis.Capacitor;
  try{
    globalThis.Capacitor={isNativePlatform:()=>false};
    assert.doesNotThrow(()=>initializeMealPrepBeta());
  }finally{globalThis.Capacitor=previous}
});

test("grocery calculations sum named recipe amounts without changing planned meals",()=>{
  const selected=mealPrepRecipes[1];
  const rows=sum([{recipeId:selected.id,portions:3}]);
  assert.equal(rows.find(r=>r.name===selected.ingredients[0][0]).amount,selected.ingredients[0][1]*3);
  assert.equal(rows.find(r=>r.name==="Sesame seeds").amount,15);
});
