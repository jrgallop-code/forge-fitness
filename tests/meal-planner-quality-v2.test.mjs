import test from "node:test";
import assert from "node:assert/strict";
import {auditRecipe,auditLegacyCatalog,scaleRecipe,groceryForRecipes} from "../js/nutrition/recipe-quality-v2.js";
import {CATALOG_V2_STAGING} from "../data/meal-planner/recipe-catalog-v2-staging.js";
import {MEAL_CATALOG} from "../js/nutrition/meal-planner-data.js";
const recipe=CATALOG_V2_STAGING[0];
test("V2 staging has complete ingredient components and distinct measured seasonings",()=>{
 const ingredients=scaleRecipe(recipe,4);
 assert.ok(ingredients.length>=15);
 assert.ok(ingredients.some(x=>x.component==="sauce"&&x.name.includes("Greek yogurt")));
 assert.ok(ingredients.some(x=>x.role==="oil"&&x.grams===20));
 assert.ok(ingredients.some(x=>x.role==="seasoning"&&x.name==="Smoked paprika"));
 assert.ok(ingredients.some(x=>x.state==="dry"&&x.name==="White rice"));
});
test("Three portions scales ingredients without confusing cooked and dry rice",()=>{
 const items=scaleRecipe(recipe,3);
 assert.equal(items.find(x=>x.name==="Boneless skinless chicken breast").grams,510);
 assert.equal(items.find(x=>x.name==="White rice").grams,180);
 assert.equal(items.find(x=>x.name==="Plain Greek yogurt (2%)").grams,150);
 assert.equal(items.find(x=>x.name==="Smoked paprika").grams,4.5);
});
test("Grocery list combines batches by canonical ingredient identity",()=>{
 const list=groceryForRecipes([{recipe,portions:3},{recipe,portions:1}]);
 assert.equal(list.find(x=>x.name==="White rice").grams,240);
 assert.equal(list.find(x=>x.name==="Smoked paprika").grams,6);
 assert.equal(list.filter(x=>x.name==="White rice").length,1);
 assert.equal(list.find(x=>x.name==="Water").grams,30);
});
test("Quality gate keeps unverified records away from production",()=>{
 const audit=auditRecipe(recipe);
 assert.equal(audit.errors.length,0,JSON.stringify(audit.errors));
 assert.equal(audit.canPublish,false);
 assert.ok(audit.warnings.some(x=>x.includes("nutrition")));
 assert.ok(audit.warnings.some(x=>x.includes("image")));
 assert.ok(audit.warnings.some(x=>x.includes("kitchen")));
});
test("Legacy variant count is not represented as unique recipes",()=>{
 const report=auditLegacyCatalog(MEAL_CATALOG);
 assert.ok(report.catalogEntries>report.estimatedUniqueBaseRecipes);
 assert.ok(report.noInstructions>0);
 assert.ok(report.noVerified>0);
});
