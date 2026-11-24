import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
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
 assert.match(ui,/swapTarget=\{date,slot\}/);
 assert.match(ui,/plannerScreen="catalog";render\(root\)/);
 assert.match(ui,/data-mp-swap-choose/);
 assert.match(ui,/class="mp-week-menu-panel"/);
 assert.match(ui,/scheduleRecipe\(plan,recipe,\{startDate:date,dayOffsets:\[0\],slots:\[slot\]/);
 assert.match(polish,/\.mp-week-menu-panel/);
 assert.match(ui,/<svg viewBox=/);
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

test("source entries show categorized quantity rows and only ingredient-grounded images",()=>{
 assert.match(catalog,/function sourceIngredientSections/);
 assert.match(catalog,/function splitSourceStatement/);
 assert.match(catalog,/function ingredientIllustrationMarkup/);
 assert.match(catalog,/Array\.isArray\(recipe\?\.ingredientStatements\)/);
 assert.match(catalog,/groupIngredientRows\(ingredients\)/);
 assert.match(polish,/\.mp-ingredient-group li/);
 assert.match(polish,/\.mp-ingredient-illustration svg/);
});

test("publisher ingredient quantities preserve units without inventing weights",()=>{
 const start=catalog.indexOf("function splitSourceStatement(");
 const end=catalog.indexOf("function sourceIngredientSections(",start);
 assert.ok(start>=0&&end>start);
 const split=vm.runInNewContext(catalog.slice(start,end)+"\n splitSourceStatement");
 const beef=split({description:"2 lbs ground beef (85/15)"});
 assert.equal(beef.quantity,"2 lbs");
 assert.equal(beef.name,"ground beef (85/15)");
 const rice=split({description:"1.75 cups rice (uncooked)"});
 assert.equal(rice.quantity,"1.75 cups");
 const broccoli=split({description:".75 lb frozen broccoli florets"});
 assert.equal(broccoli.quantity,".75 lb");
 const ambiguous=split({description:"salt and pepper to taste"});
 assert.equal(ambiguous.quantity,"—");
});
test("image audit only marks sourced recipes as ingredient-grounded",()=>{
 const rows=read("docs/meal-recipe-photo-audit-300.csv").trim().split("\n").slice(1);
 assert.equal(rows.filter(row=>row.includes("Ingredient-grounded generated SVG illustration")).length,45);
 assert.equal(rows.filter(row=>row.includes("Photo pending: no ingredient list")).length,255);
});
