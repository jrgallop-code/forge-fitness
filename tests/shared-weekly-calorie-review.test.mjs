import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("active phases cannot apply calculated TDEE before the shared weekly review", () => {
    const source = readFileSync("js/nutrition/unified-goals-calories.js", "utf8");
    assert.match(source, /waitingForSharedReview = Boolean\(active && !metrics\?\.recommendationReady\)/);
    assert.match(source, /button\.hidden = Boolean\(active\)/);
    assert.match(source, /active && !metrics\?\.recommendationReady/);
    assert.match(source, /No separate calorie change will be created/);
});

test("the only active-phase action is the compact Weight Progress review", () => {
    const goals = readFileSync("js/nutrition/unified-goals-calories.js", "utf8");
    const display = readFileSync("js/nutrition/calories-full-adjustment-display.js", "utf8");
    const stats = readFileSync("js/nutrition/calorie-stats.js", "utf8");
    assert.match(goals, /Included automatically in your Weekly Calorie Review/);
    assert.match(display, /data-weekly-calorie-review/);
    assert.match(display, /Maintenance update/);
    assert.match(display, /Goal progress/);
    assert.match(display, /New daily target/);
    assert.match(display, /#weight-weekly-review-apply/);
    assert.match(display, /levelup:open-weekly-calorie-review/);
    assert.match(display, /#weekly-modal-review-apply/);
    assert.match(display, /applyFullAdjustment\(event, \{ phase, metrics, recommendation \}\)/);
    assert.match(display, /const saved = saveNutritionPhase/);
    assert.match(display, /The target did not save\. Please try again\./);
    assert.match(display, /apply\.textContent = "Updating…"/);
    assert.match(display, /role="dialog" aria-modal="true"/);
    assert.match(display, /Logged weekly average/);
    assert.match(display, /Current weight trend/);
    assert.match(display, /Goal weight trend/);
    assert.match(display, /Calories needed for goal pace/);
    assert.match(display, /Calculated target/);
    assert.match(display, /Recommended target now/);
    assert.match(display, /weeklyAverageCalories: baseline\.useLoggedAverage/);
    assert.match(display, /update\.fullRequestedTarget/);
    assert.match(display, /The saved target changes by/);
    assert.match(display, /Level Up will reassess next week/);
    assert.match(stats, /Review one recommended daily target/);
    assert.match(stats, /levelup:open-weekly-calorie-review/);
    assert.doesNotMatch(stats, /data-maintenance-keep/);
});

test("the actionable coach review combines TDEE and pace into one capped update", () => {
    const source = readFileSync("js/nutrition/calories-full-adjustment-display.js", "utf8");
    assert.match(source, /buildCoordinatedWeeklyUpdate\(/);
    assert.match(source, /maximumChange: WEEKLY_ADJUSTMENT_CAP/);
    assert.match(source, /maintenanceCalories: recommendation\.maintenanceCalories/);
    assert.match(source, /targetCalories: recommendation\.targetCalories/);
    assert.match(source, /markMaintenanceCheckInReviewed/);
    assert.match(source, /markCheckHandled\(phase, checkDay, "coordinated-weekly-review"\)/);
    assert.match(source, /startAdjustmentHold\(/);
    assert.match(source, /const endDate = previousDateKey\(localDateKey\(\)\)/);
    assert.match(source, /for \(let day = 1; day < 7; day \+= 1\)/);
    assert.doesNotMatch(source, /endDate === localDateKey\(\)/);
});

test("declining the shared review marks both recommendation systems handled", () => {
    const source = readFileSync("js/nutrition/calorie-authority-events.js", "utf8");
    assert.match(source, /lastHandledCheckDay: checkDay/);
    assert.match(source, /markMaintenanceCheckInReviewed/);
    assert.match(source, /kept-shared-weekly-review/);
});
