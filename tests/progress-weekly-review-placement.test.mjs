import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Weight keeps the calorie summary while the green weekly review alert moves to Nutrition Progress", () => {
    const source = readFileSync("js/progress/weight-progress-compact.js", "utf8");

    assert.doesNotMatch(source, /relocateCalorieSummaryToNutritionProgress/);
    assert.match(source, /relocateWeeklyReviewAlertToNutritionProgress/);
    assert.match(source, /document\.getElementById\("calorie-progress"\)/);
    assert.match(source, /document\.querySelector\("\.progress-weekly-review-alert"\)/);
    assert.match(source, /nutritionProgress\.insertBefore\(alert/);
    assert.match(source, /document\.getElementById\("nutrition-progress-tab"\)/);
});
