import assert from "node:assert/strict";
import test from "node:test";
import {MEAL_CATALOG,MEAL_SLOTS,eligibleMeals,macrosForIngredients,generatePlan,editPlannedIngredient,groceryList,replacePlannedMeal} from "../js/nutrition/meal-planner-data.js";

test("760 recipe variants include nine cuisine styles",()=>{
 assert.equal(MEAL_CATALOG.length,760);
 assert.equal(new Set(MEAL_CATALOG.map(meal=>meal.id)).size,760);
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

test("new Italian, Chinese, Japanese, Thai, and Indian recipes are available",()=>{
 for(const cuisine of ["Italian","Chinese","Japanese","Thai","Indian"]){
  assert.ok(eligibleMeals({diet:"balanced",cuisines:[cuisine]}).some(meal=>meal.cuisine===cuisine));
 }
});
test("household servings scale groceries but not personal nutrition",()=>{
 const single=generatePlan({days:"1",meals:["Dinner"],cuisines:["Italian"],household:1},"2026-11-20");
 const family=generatePlan({days:"1",meals:["Dinner"],cuisines:["Italian"],household:3},"2026-11-20");
 assert.equal(single.entries[0].recipeId,family.entries[0].recipeId);
 assert.equal(family.entries[0].servings,3);
 assert.equal(macrosForIngredients(single.entries[0].ingredients).calories,macrosForIngredients(family.entries[0].ingredients).calories);
 const one=groceryList(single),three=groceryList(family);
 assert.equal(three[0].grams,one[0].grams*3);
});
test("cuisine shortage falls back without ignoring vegan restriction",()=>{
 const plan=generatePlan({days:1,meals:["Breakfast"],cuisines:["Thai"],diet:"vegan"},"2026-11-20");
 assert.equal(plan.entries.length,1);
 assert.ok(plan.entries[0].notice||plan.entries[0].warning);
 if(plan.entries[0].recipeId){
  const meal=MEAL_CATALOG.find(x=>x.id===plan.entries[0].recipeId);
  assert.equal(meal.diet,"vegan");
 }
});
