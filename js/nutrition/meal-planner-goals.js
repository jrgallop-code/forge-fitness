// Meal planner goal and satiety heuristics.
// IMPORTANT: This module never writes to the main user's nutrition goals.
// Holt et al. 1995 measured 38 *individual foods*, not these recipes.
// A fullness estimate is NOT a published Satiety Index measurement.
import {FOOD_VALUES,macrosForIngredients,MEAL_SLOTS} from "./meal-planner-data.js?v=3";
import {getNutritionGoal,getNutritionPlan,getNutritionProfile,getNutritionMacroPreference} from "./nutrition-storage.js?v=meal-goals-1";
import {getSelectedTarget} from "./active-calorie-target.js?v=meal-goals-1";
import {calculateMacroTargets} from "./tdee-calculator.js?v=meal-goals-1";

const measuredSource="Holt et al. (1995), European Journal of Clinical Nutrition 49:675–690; PMID:7498104";
export const MEASURED_FOOD_SATIETY=Object.freeze({
 "boiled potato":{score:323,source:measuredSource},
 "white bread":{score:100,source:measuredSource},
 "apple":{score:197,source:measuredSource},
 "porridge":{score:209,source:measuredSource},
 "orange":{score:202,source:measuredSource}
});
const FIBER_G_100G=Object.freeze({
 oats:10.6,berries:4,banana:2.6,apple:2.4,almonds:12.5,
 broccoli:2.6,spinach:2.2,"bell pepper":2.1,tomato:1.2,cucumber:.5,
 zucchini:1.0,avocado:6.7,quinoa:2.8,"brown rice":1.8,
 "whole wheat pasta":3.9,"whole wheat bread":6.9,potato:1.8,
 "sweet potato":3,"black beans":8.7,lentils:7.9,chickpeas:7.6,
 edamame:5.2,"peanut butter":6,"pumpkin seeds":6,"rice cakes":3.8,
 "olive oil":0,"greek yogurt":0,"cottage cheese":0,"egg":0,
 "tofu":.3,"mushrooms":1,salsa:1.7,"tortilla":3.3,"hummus":6
});
const clamp=(v,low,high)=>Math.min(high,Math.max(low,v));
const finitePositive=v=>Number.isFinite(Number(v))&&Number(v)>0;
export const isWeightLossGoal=id=>/^cut_|loss|lose|fat_loss|weight_loss/i.test(String(id||""));
export function currentMealPlannerGoal(){
 let active=null,plan=null,goal=null,profile=null,macroPreference=null;
 try{active=getSelectedTarget()}catch{}
 try{plan=getNutritionPlan()}catch{}
 try{goal=getNutritionGoal()}catch{}
 try{profile=getNutritionProfile()}catch{}
 try{macroPreference=getNutritionMacroPreference()}catch{}
 const daily=Number(active?.calories)||Number(plan?.calculatedCalories)||null;
 const goalId=String(goal?.goalId||"maintain");
 const weightKg=Number(profile?.weightKg)||Number(profile?.weightLb)*.45359237||null;
 const macros=finitePositive(daily)&&finitePositive(weightKg)
  ?calculateMacroTargets({calories:daily,weightKg,macroPreset:macroPreference?.preset||"balanced"})
  :null;
 return {goalId,dailyCalories:finitePositive(daily)?Math.round(daily):null,
  proteinGrams:macros?.protein??null,carbGrams:macros?.carbs??null,
  fatGrams:macros?.fat??null,source:finitePositive(daily)?"level-up":"unset"};
}
// Explicit reserve for unplanned meals/snacks; never silently allocate the
// user's *entire* calorie target to a single planned meal.
export function allocateMealCalories({dailyCalories,meals=MEAL_SLOTS,calorieCoverage}={}){
 const valid=Array.isArray(meals)?MEAL_SLOTS.filter(slot=>meals.includes(slot)):[];
 const total=Number(dailyCalories);
 if(!finitePositive(total)||!valid.length)return {dailyCalories:null,plannedCalories:0,reservedCalories:0,perMeal:{},fraction:0};
 const portions={Breakfast:.23,Lunch:.29,Dinner:.33,"Meal 4":.15};
 const fullShare=valid.reduce((sum,slot)=>sum+portions[slot],0);
 // If all meals selected, cover the daily target. For lunch/dinner-only,
 // those meals default to 62% (or more if user explicitly adjusts coverage).
 const fraction=finitePositive(calorieCoverage)?clamp(Number(calorieCoverage)/100,.15,1):fullShare;
 const planned=Math.round(total*fraction/25)*25;
 const perMeal={};
 let assigned=0;
 valid.forEach((slot,index)=>{
  const value=index===valid.length-1?planned-assigned:Math.round(planned*portions[slot]/fullShare/25)*25;
  perMeal[slot]=value;assigned+=value;
 });
 return {dailyCalories:total,plannedCalories:planned,reservedCalories:Math.max(0,total-planned),perMeal,fraction};
}
export function fullnessEstimate(ingredients){
 const foods=Array.isArray(ingredients)?ingredients:[];
 const grams=foods.reduce((s,x)=>s+Math.max(0,Number(x.grams)||0),0);
 const macros=macrosForIngredients(foods);
 const calories=Number(macros.calories)||0;
 if(!calories)return {score:0,level:"Unknown",basis:"heuristic-not-validated",protein:0,fiber:0,energyDensity:0,measuredFoods:[]};
 const fiber=foods.reduce((s,x)=>s+(FIBER_G_100G[x.food]||0)*Math.max(0,Number(x.grams)||0)/100,0);
 const protein=macros.protein;
 const density=calories/Math.max(1,grams)*100;
 // Heuristic, not the physiological satiety index.
 const score=Math.round(clamp(20+
  Math.min(22,protein/calories*180)+
  Math.min(20,fiber/calories*500)+
  Math.min(30,Math.max(0,260-density)*.12),0,100));
 const measuredFoods=foods.filter(x=>x.food==="apple"||x.food==="potato"||x.food==="oats").map(x=>({
  food:x.food,relation:x.food==="potato"?"boiled potato":x.food==="oats"?"porridge":"apple",
  source:measuredSource,
  // Never assign the measured score to a cooked recipe ingredient:
  exactPreparationMeasured:x.food==="apple"
 }));
 return {score,level:score>=75?"High":score>=55?"Moderate":"Lower",
  basis:"recipe-heuristic-not-clinically-validated",protein:Math.round(protein),
  fiber:Math.round(fiber*10)/10,energyDensity:Math.round(density),
  measuredFoods};
}
export function fitMealPortions(ingredients,targetCalories){
 const source=(ingredients||[]).map(x=>({...x}));
 const initial=macrosForIngredients(source).calories;
 const target=Number(targetCalories);
 if(!finitePositive(initial)||!finitePositive(target))return {ingredients:source,calories:initial,targetCalories:null,withinTarget:false,scale:1};
 const scale=clamp(target/initial,.6,2.6);
 const adjusted=source.map(x=>({...x,grams:Math.max(1,Math.round(Number(x.grams)*scale))}));
 const actual=macrosForIngredients(adjusted).calories;
 return {ingredients:adjusted,calories:actual,targetCalories:target,
  withinTarget:Math.abs(actual-target)<=Math.max(50,target*.12),
  scale:Math.round(scale*100)/100};
}
