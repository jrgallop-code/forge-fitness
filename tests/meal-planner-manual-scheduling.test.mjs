import test from "node:test";
import assert from "node:assert/strict";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {dateForOffset,recipeServingIngredients,scheduleRecipe,batchPortionCount,removeScheduledMeal} from "../js/nutrition/meal-planner-manual.js";
const source=FEATURED_RECIPES[0];
test("manual plan schedules three dinners for one batch",()=>{
 const plan=scheduleRecipe(null,source,{startDate:"2026-11-23",dayOffsets:[0,1,2],slots:["Dinner"],portionsPerDay:1});
 assert.deepEqual(plan.entries.map(x=>x.date),["2026-11-23","2026-11-24","2026-11-25"]);
 assert.deepEqual([...new Set(plan.entries.map(x=>x.batchId))].length,1);
 assert.equal(batchPortionCount(plan.entries,plan.entries[0].batchId),3);
 assert.equal(plan.entries[0].slot,"Dinner");
 assert.equal(plan.entries[0].nutritionVerified,false);
 assert.ok(plan.entries[0].ingredients.some(x=>x.food==="Smoked paprika"));
 assert.ok(plan.entries[0].ingredients.some(x=>x.food==="Cooking oil"));
});
test("multiple slots produce separate entries while scaling individual portions",()=>{
 const plan=scheduleRecipe(null,source,{startDate:"2026-11-23",dayOffsets:[0,2],slots:["Lunch","Dinner"],portionsPerDay:2});
 assert.equal(plan.entries.length,4);
 assert.equal(batchPortionCount(plan.entries,plan.entries[0].batchId),8);
 assert.equal(plan.entries[0].ingredients.find(x=>x.food==="Chicken thighs, boneless skinless, raw").grams,908/5);
});
test("replacing an unconsumed slot does not duplicate groceries",()=>{
 const one=scheduleRecipe(null,source,{startDate:"2026-11-23",dayOffsets:[0,1,2],slots:["Dinner"],portionsPerDay:1});
 const two=scheduleRecipe(one,source,{startDate:"2026-11-23",dayOffsets:[0,1,2],slots:["Dinner"],portionsPerDay:1});
 assert.equal(two.entries.length,3);
});
test("reject invalid date, day and quantity",()=>{
 assert.throws(()=>scheduleRecipe(null,source,{startDate:"2026-11-23",dayOffsets:[],slots:["Dinner"]}));
 assert.throws(()=>scheduleRecipe(null,source,{startDate:"2026-11-23",dayOffsets:[7],slots:["Dinner"]}));
 assert.throws(()=>scheduleRecipe(null,source,{startDate:"2026-11-23",dayOffsets:[0],slots:["Dinner"],portionsPerDay:0}));
 assert.equal(dateForOffset("2026-11-30",2),"2026-12-02");
});

test("My Week removes exactly one scheduled slot and preserves other planned meals",()=>{
 const plan=scheduleRecipe(null,source,{startDate:"2026-11-23",dayOffsets:[0,1,2],slots:["Dinner"],portionsPerDay:1});
 const updated=removeScheduledMeal(plan,"2026-11-24","Dinner");
 assert.equal(updated.entries.length,2);
 assert.deepEqual(updated.entries.map(x=>x.date),["2026-11-23","2026-11-25"]);
 assert.equal(plan.entries.length,3);
 assert.equal(removeScheduledMeal(updated,"2026-11-24","Dinner"),updated);
});
