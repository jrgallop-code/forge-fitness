import test from "node:test";
import assert from "node:assert/strict";
import {applyCoachNutritionTargets} from "../js/more/coach-assigned-programs.js";
function storage(initial={}){const m=new Map(Object.entries(initial));return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
test("athlete can apply coach calories, macros and steps without losing food history",()=>{
 const store=storage({
  level_up_nutrition_plan:JSON.stringify({currentCalories:2200,calculatedCalories:2200}),
  level_up_nutrition_macro:JSON.stringify({useManual:false}),
  level_up_food_log_v1:JSON.stringify({"2026-11-16":[{nutrition:{calories:400}}]}),
  forge_weight_entries:JSON.stringify([{date:"2026-11-16",weight:170}])
 });
 const plan={id:"assignment-1",version:3,nutrition:{calorieTarget:2550,protein:165,carbs:300,fat:77},goals:{stepGoal:9000}};
 const result=applyCoachNutritionTargets(plan,store);
 assert.equal(result.calories,2550);assert.equal(result.stepGoal,9000);
 assert.equal(JSON.parse(store.getItem("level_up_coach_step_goal_v1")).target,9000);
 assert.equal(JSON.parse(store.getItem("level_up_nutrition_plan")).currentCalories,2550);
 assert.equal(JSON.parse(store.getItem("level_up_nutrition_macro")).manualMacros.protein,165);
 assert.equal(JSON.parse(store.getItem("level_up_food_log_v1"))["2026-11-16"][0].nutrition.calories,400);
 assert.equal(JSON.parse(store.getItem("forge_weight_entries"))[0].weight,170);
});
test("step-only coach goal is applicable without calorie target",()=>{
 const store=storage();const result=applyCoachNutritionTargets({id:"one",version:1,goals:{stepGoal:8000}},store);
 assert.equal(result.stepGoal,8000);assert.equal(JSON.parse(store.getItem("level_up_coach_step_goal_v1")).target,8000);
});
