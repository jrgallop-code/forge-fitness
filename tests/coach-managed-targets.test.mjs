import test from "node:test";
import assert from "node:assert/strict";
import { getCoachTargets, activateCoachTargets, stopCoachTargets, validateCoachTargets } from "../js/nutrition/coach-managed-targets.js";
import { getNutritionPlan, saveNutritionPlan, setCurrentCalories, syncCalculatedCalories } from "../js/nutrition/nutrition-storage.js";
import { getMaintenanceUpdateMode, buildAutomaticMaintenanceUpdate, queueMaintenanceReview } from "../js/nutrition/maintenance-check-in.js";

function storage(){
 const values=new Map();
 return {
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>values.set(String(key),String(value)),
  removeItem:key=>values.delete(key),
  clear:()=>values.clear(),
  snapshot:()=>Object.fromEntries(values)
 };
}
const originalStorage=globalThis.localStorage;
const originalWindow=globalThis.window;
const originalCustomEvent=globalThis.CustomEvent;
const fake=storage();
globalThis.localStorage=fake;
globalThis.CustomEvent=class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}};
globalThis.window={dispatchEvent(){}};
function login(id){fake.setItem("level_up_cloud_account",JSON.stringify({id}))}
const plan={id:"assignment-1",version:2,nutrition:{calorieTarget:3000,protein:180,carbs:390,fat:80},goals:{goalWeightLb:180}};
test("coach plan validates complete calorie and macro targets",()=>{
 assert.deepEqual(validateCoachTargets(plan),{calorieTarget:3000,protein:180,carbs:390,fat:80,goalWeightLb:180});
 assert.throws(()=>validateCoachTargets({...plan,nutrition:{...plan.nutrition,protein:null}}),/Complete/);
 assert.throws(()=>validateCoachTargets({...plan,nutrition:{...plan.nutrition,calorieTarget:3200}}),/match/);
});
test("coach overlay preserves history, personal settings, and account isolation",()=>{
 fake.clear();login("athlete-1");
 fake.setItem("level_up_nutrition_plan",JSON.stringify({calculatedCalories:2750,currentCalories:2750,adjustmentHistory:[{reason:"existing"}]}));
 fake.setItem("forge_weight_entries",JSON.stringify([{date:"2026-11-12",weight:170}]));
 fake.setItem("level_up_nutrition_macro",JSON.stringify({useManual:true,manualMacros:{protein:150,carbs:350,fat:83}}));
 const before={personal:fake.getItem("level_up_nutrition_plan"),weight:fake.getItem("forge_weight_entries"),macros:fake.getItem("level_up_nutrition_macro")};
 activateCoachTargets(plan);
 assert.equal(getCoachTargets().targets.goalWeightLb,180);
 assert.equal(getNutritionPlan().currentCalories,3000);
 assert.equal(getMaintenanceUpdateMode(),"track");
 assert.equal(queueMaintenanceReview({ready:true}),false);
 assert.equal(buildAutomaticMaintenanceUpdate({ready:true}),null);
 saveNutritionPlan({currentCalories:2200,calculatedCalories:2200});
 syncCalculatedCalories(2400);
 assert.equal(setCurrentCalories(2500).currentCalories,3000);
 for(const [key,value] of Object.entries({personal:"level_up_nutrition_plan",weight:"forge_weight_entries",macros:"level_up_nutrition_macro"}))assert.equal(fake.getItem(value),before[key]);
 login("athlete-2");
 assert.equal(getCoachTargets(),null);
 login("athlete-1");
 assert.equal(getNutritionPlan().currentCalories,3000);
 assert.equal(stopCoachTargets(),true);
 assert.equal(getCoachTargets(),null);
 assert.equal(getNutritionPlan().currentCalories,2750);
 assert.equal(fake.getItem("forge_weight_entries"),before.weight);
});
test.after(()=>{
 if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;
 if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
 if(originalCustomEvent===undefined)delete globalThis.CustomEvent;else globalThis.CustomEvent=originalCustomEvent;
});
