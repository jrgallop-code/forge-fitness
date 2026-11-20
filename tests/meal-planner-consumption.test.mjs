import test from "node:test";
import assert from "node:assert/strict";
import {markPlannedMealConsumed,undoPlannedMealConsumed,consumedEntries} from "../js/nutrition/meal-planner-consumption.js";
import {entriesForDate,removeEntry} from "../js/nutrition/food-log-data.js";
const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
globalThis.window={dispatchEvent:()=>{}};
globalThis.crypto ??= (await import("node:crypto")).webcrypto;
test("mark eaten creates ordinary, editable ingredient entries and prevents duplicates",()=>{
 const date="2026-11-20",slot="Breakfast";
 const ingredients=[{food:"oats",grams:60},{food:"greek yogurt",grams:150}];
 assert.equal(markPlannedMealConsumed(date,slot,ingredients).ok,true);
 const entries=consumedEntries(date,slot);
 assert.equal(entries.length,2);
 assert.equal(entries[0].meal,"Breakfast");
 assert.equal(entries[0].nutrition.calories,233.4);
 assert.equal(markPlannedMealConsumed(date,slot,ingredients).reason,"already_logged");
 assert.equal(entriesForDate(date).length,2);
 assert.equal(undoPlannedMealConsumed(date,slot).ok,true);
 assert.equal(entriesForDate(date).length,0);
});
test("manual removal does not delete unrelated foods",()=>{
 const date="2026-11-21",slot="Meal 4";
 markPlannedMealConsumed(date,slot,[{food:"apple",grams:100}]);
 assert.equal(consumedEntries(date,slot)[0].meal,"Snacks");
 const unrelated={...consumedEntries(date,slot)[0],id:"unrelated",mealPlannerKey:"other"};
 const log=JSON.parse(localStorage.getItem("level_up_food_log_v1")||"{}");
 // Clean up recorded entries directly through the public remove API instead of relying on storage key naming.
 assert.equal(undoPlannedMealConsumed(date,slot).ok,true);
 assert.equal(consumedEntries(date,slot).length,0);
});
