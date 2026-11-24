import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const read=p=>readFileSync(p,"utf8");
const ui=read("js/nutrition/meal-planner-ui.js");
const photos=read("js/nutrition/meal-planner-photos.js");
const catalog=read("js/nutrition/meal-planner-catalog-ui.js");
const polish=read("css/meal-planner-catalog-polish.css");
const drafts=read("js/nutrition/meal-planner-source-prep.js");

test("scheduled meals expose Swap and Remove actions on the dot menu",()=>{
 assert.match(ui,/data-meal-swap data-date/);
 assert.match(ui,/data-meal-remove data-date/);
 assert.match(ui,/data-mp-planned-detail/);
 assert.match(ui,/class="mp-meal-card-menu mp-week-menu"/);
 assert.match(ui,/querySelectorAll\("\[data-meal-swap\]"\)/);
 assert.match(ui,/querySelectorAll\("\[data-meal-remove\]"\)/);
 assert.ok(ui.includes('overlay.className="mp-swap-overlay"'));
 assert.match(ui,/scheduleRecipe\(read\(\),recipe,\{startDate:date,dayOffsets:\[0\],slots:\[slot\]/);
 assert.match(polish,/nth-of-type\(2\)/);
 assert.match(polish,/nth-of-type\(3\)/);
});
test("unreviewed source-index recipe cannot receive arbitrary atlas tile",()=>{
 assert.doesNotMatch(photos,/function illustrationTile/);
 assert.match(photos,/recipe\?\.indexOnly && recipe\?\.imageReviewed !== true/);
 assert.match(photos,/source:"photo-pending"/);
 assert.match(catalog,/if\(!photo\?\.primary\)/);
 assert.match(catalog,/Photo pending/);
});
test("first missing-recipe drafts are ingredient-grounded and flagged pending review",()=>{
 for(const title of ["Big Boy Korean BBQ Beef Bowls","Mediterranean Spiced Beef","Broccoli Cheddar Rice","Veggie Rice"]) assert.ok(drafts.includes(title));
 assert.match(drafts,/not kitchen-tested/);
 assert.ok(existsSync("docs/meal-recipe-photo-audit-300.csv"));
 const lines=read("docs/meal-recipe-photo-audit-300.csv").trim().split("\n");
 assert.equal(lines.length,301);
});
