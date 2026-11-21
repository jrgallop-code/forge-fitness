import test from "node:test";
import assert from "node:assert/strict";
import {allocateMealCalories,fullnessEstimate,fitMealPortions,MEASURED_FOOD_SATIETY} from "../js/nutrition/meal-planner-goals.js";
import {generateGoalAwarePlan,refitRecipeForSlot} from "../js/nutrition/meal-planner-planning.js";
import {MEAL_CATALOG,macrosForIngredients,groceryList} from "../js/nutrition/meal-planner-data.js";

test("Lunch and dinner allocation reserves flexible calories and has useful meal sizes",()=>{
 const a=allocateMealCalories({dailyCalories:2400,meals:["Lunch","Dinner"],calorieCoverage:75});
 assert.equal(a.plannedCalories,1800);
 assert.equal(a.reservedCalories,600);
 assert.ok(a.perMeal.Lunch>700&&a.perMeal.Dinner>800);
 assert.equal(a.perMeal.Lunch+a.perMeal.Dinner,a.plannedCalories);
});
test("All four meals default to covering daily goal; only dinner reserves remainder",()=>{
 assert.equal(allocateMealCalories({dailyCalories:2500}).plannedCalories,2500);
 assert.equal(allocateMealCalories({dailyCalories:2500,meals:["Dinner"]}).plannedCalories,825);
});
test("No invented daily target without existing goal or explicit custom target",()=>{
 assert.equal(allocateMealCalories({dailyCalories:null,meals:["Dinner"]}).dailyCalories,null);
});
test("Original individual-food Satiety Index and estimated recipe fullness are distinguished",()=>{
 assert.equal(MEASURED_FOOD_SATIETY["boiled potato"].score,323);
 const a=fullnessEstimate([{food:"potato",grams:250},{food:"chicken breast",grams:150},{food:"broccoli",grams:140}]);
 const b=fullnessEstimate([{food:"olive oil",grams:40},{food:"almonds",grams:80}]);
 assert.ok(a.score>b.score);
 assert.equal(a.basis,"recipe-heuristic-not-clinically-validated");
});
test("Weight-loss planner creates lunch and dinner close to selected goal and prioritizes fullness",()=>{
 const opts={goalMode:"custom",dailyCalories:2400,goalType:"cut_moderate",calorieCoverage:75,
  meals:["Lunch","Dinner"],days:7,diet:"balanced",cuisines:[],cooking:30,household:1};
 const plan=generateGoalAwarePlan(opts,"2026-11-20");
 assert.equal(plan.entries.length,14);
 assert.equal(plan.targetAllocation.plannedCalories,1800);
 assert.ok(plan.entries.every(e=>e.recipeId));
 for(const e of plan.entries){
  assert.ok(e.satiety?.score>0);
  assert.ok(e.targetCalories>=750);
  assert.ok(Math.abs(macrosForIngredients(e.ingredients).calories-e.targetCalories)<=Math.max(75,e.targetCalories*.14),
   "Meal "+e.recipeId+" at "+e.date+" should be within target");
 }
});
test("Family servings grow grocery list without multiplying personal macros",()=>{
 const opts={goalMode:"custom",dailyCalories:2300,goalType:"maintain",calorieCoverage:100,
  meals:["Lunch","Dinner"],days:1,cuisines:[],household:3,mealSizes:{Lunch:3,Dinner:3}};
 const p=generateGoalAwarePlan(opts,"2026-11-20");
 assert.ok(p.entries.every(e=>e.servings===3));
 assert.ok(groceryList(p).every(x=>x.grams>0));
 const recipe=refitRecipeForSlot(p.entries[0].recipeId,p.entries[0].targetCalories);
 assert.ok(recipe?.ingredients.length);
});
