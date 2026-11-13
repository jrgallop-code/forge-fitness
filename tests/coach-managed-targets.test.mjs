import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync("js/nutrition/coach-managed-targets.js","utf8");
const storageSource=readFileSync("js/nutrition/nutrition-storage.js","utf8");
const maintenance=readFileSync("js/nutrition/maintenance-check-in.js","utf8");
test("coach nutrition is account scoped and does not replace saved personal history",()=>{
 assert.match(source,/PREFIX\+id/);
 assert.match(source,/accountId:accountId\(\)/);
 assert.match(source,/localStorage\.removeItem\(k\)/);
 assert.doesNotMatch(source,/level_up_nutrition_plan/);
 assert.doesNotMatch(source,/forge_weight_entries/);
 assert.match(storageSource,/if \(coach\) return \{ calculatedCalories: coach\.targets\.calorieTarget/);
});
test("coach targets require complete, consistent prescriptions",()=>{
 for(const field of ["calorieTarget","protein","carbs","fat"])assert.match(source,new RegExp(field));
 assert.match(source,/Math\.abs\(calorieTarget-\(protein\*4\+carbs\*4\+fat\*9\)\)>25/);
});
test("coach-managed mode prevents automatic maintenance updates",()=>{
 assert.match(maintenance,/if \(getCoachTargets\(\)\) return "track"/);
});
