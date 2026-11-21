import test from "node:test";
import assert from "node:assert/strict";
import {REVIEW_RECORDS,REVIEW_IDS,REVIEW_IMPORT_META,reviewIdForRecipe,getReviewDecision,saveReviewDecision,reviewSummary,REVIEW_STORE_KEY} from "../js/nutrition/mpm-review-first-100.js";
import {MPM_REVIEW_100_IMPORTED} from "../js/nutrition/mpm-review-first-100-generated.js";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {baseRecipes,matchesCatalog,recipeDetailMarkup,catalogMarkup} from "../js/nutrition/meal-planner-catalog-ui.js";
const backing=new Map();
globalThis.localStorage={getItem:key=>backing.get(key)??null,setItem:(key,value)=>backing.set(key,String(value)),removeItem:key=>backing.delete(key)};
test("first hundred entries are distinct real indexed titles, never invented variants",()=>{
 assert.equal(REVIEW_RECORDS.length,100);
 assert.equal(REVIEW_IDS.size,100);
 assert.equal(MPM_REVIEW_100_IMPORTED.length,100);
 assert.equal(new Set(REVIEW_RECORDS.map(r=>r.name.toLowerCase())).size,100);
 assert.equal(baseRecipes().filter(r=>matchesCatalog(r,{filter:"Review first 100"})).length,100);
 assert.equal(baseRecipes().filter(r=>matchesCatalog(r,{filter:"Needs my review"})).length,100);
});
test("publisher records never auto-approve nutritional or safety data",()=>{
 for(const r of REVIEW_RECORDS){
   assert.equal(r.canSchedule,false);
   assert.equal(r.nutritionVerified,false);
   assert.equal(r.indexOnly,true);
   assert.ok(r.sourceIndexUrl.startsWith("https://mealprepmanual.com/recipes/"));
   assert.ok(!r.ingredientStatements||Array.isArray(r.ingredientStatements));
   if(r.sourceUrl)assert.ok(r.sourceUrl.startsWith("https://mealprepmanual.com/"));
 }
});
test("published full recipes participate in reviewer feedback without duplicating catalogue",()=>{
 const item=FEATURED_RECIPES.find(x=>reviewIdForRecipe(x));
 assert.ok(item);
 assert.equal(baseRecipes().length,389);
 const html=recipeDetailMarkup(item);
 assert.ok(html.includes("Review notes"));
 assert.ok(html.includes("data-mp-review-decision"));
});
test("review decisions save locally and never turn a source-only record into food-log entries",()=>{
 const id=REVIEW_RECORDS[0].id;
 assert.equal(getReviewDecision(id).decision,"unreviewed");
 assert.equal(saveReviewDecision(id,{decision:"needs-changes",notes:"Add the spice blend"}),true);
 assert.equal(getReviewDecision(id).decision,"needs-changes");
 assert.equal(reviewSummary().needsChanges,1);
 assert.equal(baseRecipes().filter(r=>matchesCatalog(r,{filter:"Needs my review"})).length,99);
 assert.equal(saveReviewDecision(id,{decision:"looks-good",notes:"Reviewed ingredients"}),true);
 assert.equal(reviewSummary().reviewed,1);
 assert.equal(saveReviewDecision(id,{decision:"approved-for-food-logging"}),false);
 assert.equal(REVIEW_RECORDS[0].canSchedule,false);
});
