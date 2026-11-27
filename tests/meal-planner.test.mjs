import assert from "node:assert/strict";
import test from "node:test";
import {MEAL_CATALOG,MEAL_SLOTS,eligibleMeals,macrosForIngredients,generatePlan,editPlannedIngredient,groceryList,replacePlannedMeal} from "../js/nutrition/meal-planner-data.js";

test("500 recipe variants have IDs and ingredients",()=>{
 assert.equal(MEAL_CATALOG.length,500);
 assert.equal(new Set(MEAL_CATALOG.map(meal=>meal.id)).size,500);
 for(const recipe of MEAL_CATALOG){
  assert.ok(MEAL_SLOTS.includes(recipe.slot));
  assert.ok(recipe.ingredients.every(x=>x.grams>0));
  assert.equal(recipe.nutritionStatus,"estimated-not-verified");
 }
});
test("allergy and diet filters exclude unsafe ingredients",()=>{
 const list=eligibleMeals({diet:"vegan",allergies:["peanuts"],cuisines:[]});
 assert.ok(list.length>0);
 assert.ok(list.every(meal=>meal.diet==="vegan"));
 assert.ok(list.every(meal=>!meal.ingredients.some(x=>x.food==="peanut butter")));
});
test("generated 7 day plan stays separate from consumed records",()=>{
 const plan=generatePlan({days:"7",meals:MEAL_SLOTS,diet:"balanced",cuisines:["Mediterranean","North American","Mexican"],cooking:"30"},"2026-11-20");
 assert.equal(plan.entries.length,28);
 assert.equal(plan.consumed,false);
 assert.equal(plan.entries[0].date,"2026-11-20");
 assert.equal(plan.entries.at(-1).date,"2026-11-26");
 assert.ok(plan.entries.some(x=>x.recipeId));
});
test("edit ingredients updates planned macro sums without altering original",()=>{
 const plan=generatePlan({days:1,meals:["Breakfast"]},"2026-11-20");
 const first=plan.entries[0];
 const before=macrosForIngredients(first.ingredients);
 const edited=editPlannedIngredient(plan,first.date,first.slot,0,first.ingredients[0].grams+40);
 const after=macrosForIngredients(edited.entries[0].ingredients);
 assert.notDeepEqual(after,before);
 assert.equal(plan.entries[0].ingredients[0].grams,first.ingredients[0].grams);
});
test("swap recipe and grocery totals",()=>{
 const plan=generatePlan({days:1,meals:["Dinner"]},"2026-11-20");
 const alt=MEAL_CATALOG.find(x=>x.slot==="Dinner"&&x.id!==plan.entries[0].recipeId);
 const swapped=replacePlannedMeal(plan,"2026-11-20","Dinner",alt.id);
 assert.equal(swapped.entries[0].recipeId,alt.id);
 assert.ok(groceryList(swapped).length>0);
});
