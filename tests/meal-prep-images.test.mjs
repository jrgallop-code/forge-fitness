import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { mealPrepRecipes } from "../js/nutrition/meal-prep-recipes.js";

test("every bundled meal-prep recipe has a distinct local image", () => {
  const imagePaths = new Set();
  assert.ok(mealPrepRecipes.length >= 12);
  for (const recipe of mealPrepRecipes) {
    assert.ok(recipe.image.startsWith('/assets/meal-prep/') && recipe.image.endsWith('.svg'), recipe.name);
    assert.ok(existsSync(new URL(".." + recipe.image, import.meta.url)), recipe.name);
    assert.ok(!imagePaths.has(recipe.image), "Repeated image: " + recipe.name);
    imagePaths.add(recipe.image);
    assert.ok(recipe.ingredients?.length, "Missing ingredients: " + recipe.name);
    assert.ok(recipe.instructions?.length, "Missing instructions: " + recipe.name);
  }
});

test("meal-prep recipe cards and details use image fields", () => {
  const ui = readFileSync(new URL("../js/nutrition/meal-prep-beta.js", import.meta.url), "utf8");
  assert.ok(ui.includes("escapeHTML(r.image||'')"));
  assert.ok(ui.includes('class="lump-detail-photo"><img'));
  assert.doesNotMatch(ui, /Food photo pending|Food photograph pending/);
});
