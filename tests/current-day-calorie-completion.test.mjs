import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const weightCalories = readFileSync("js/progress/weight-calorie-context.js", "utf8");
const calorieStats = readFileSync("js/nutrition/calorie-stats.js", "utf8");

test("Weight and Calories excludes today's calories until tracking is complete", () => {
    assert.match(weightCalories, /FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1"/);
    assert.match(weightCalories, /const includeCalories = date !== today \|\| completedDays\?\.\[date\] === true/);
    assert.match(weightCalories, /includeCalories && entries\.length/);
    assert.match(weightCalories, /Today appears after calorie tracking is marked complete/);
});

test("Nutrition Progress calorie averages exclude incomplete today", () => {
    assert.match(calorieStats, /FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1"/);
    assert.match(calorieStats, /complete: completedDays\?\.\[date\] === true/);
    assert.match(calorieStats, /day\.logged && \(day\.date !== today \|\| day\.complete\)/);
    assert.match(calorieStats, /const calorieAverageState = calorieAverage\(days\)/);
    assert.match(calorieStats, /const calorieAverageState = calorieAverage\(recent\)/);
});

test("Macro averages continue to use logged days independently", () => {
    assert.match(calorieStats, /function average\(days, key\)/);
    assert.match(calorieStats, /const value = average\(days, key\)/);
});
