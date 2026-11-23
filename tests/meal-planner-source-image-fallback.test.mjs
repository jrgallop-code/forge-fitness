import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { recipePhoto } from "../js/nutrition/meal-planner-photos.js";

const catalogPath = new URL("../js/nutrition/meal-planner-catalog-ui.js", import.meta.url);
test("all source-index recipes receive a local illustrative image instead of a blank placeholder", () => {
 const source = readFileSync(catalogPath, "utf8");
 assert.doesNotMatch(source, /Recipe image awaiting generation and review/);
 for(const id of ["mpm-index-jj85ox", "mpm-index-test-2", "reference-new-dish"]) {
  const photo = recipePhoto({id,name:"Chicken and rice",indexOnly:id.startsWith("mpm-index")});
  assert.ok(photo.primary, id);
  assert.ok(Number.isFinite(photo.x) && Number.isFinite(photo.y), id);
  assert.equal(photo.exactMatch,false);
 }
});
