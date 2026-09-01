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

test("the actionable review stays out of Weight Progress and opens from its other surfaces", () => {
    const goals = readFileSync("js/nutrition/unified-goals-calories.js", "utf8");
    const display = readFileSync("js/nutrition/calories-full-adjustment-display.js", "utf8");
    const stats = readFileSync("js/nutrition/calorie-stats.js", "utf8");
    assert.match(goals, /Included automatically in your Weekly Calorie Review/);
    assert.doesNotMatch(display, /review\.dataset\.weeklyCalorieReview/);
    assert.doesNotMatch(display, /id="weight-weekly-review-apply"/);
    assert.match(display, /#weight-calorie-suggestion-card h3/);
    assert.match(display, /Your active nutrition target\./);
    assert.match(display, /levelup:open-weekly-calorie-review/);
    assert.match(display, /#weekly-modal-review-apply/);
    assert.match(display, /applyFullAdjustment\(applyEvent, \{ phase, metrics, recommendation \}\)/);
    assert.match(display, /saved = saveNutritionPhase/);
    assert.match(display, /The target did not save\. Please try again\./);
    assert.match(display, /apply\.textContent = "Updating…"/);
    assert.match(display, /isExplicitModalRecommendation/);
    assert.match(display, /!isExplicitModalRecommendation && \(getHandledCheck/);
    assert.match(display, /Weekly calorie target save failed/);
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

test("live calorie logic excludes future weigh-ins and Goals & Plan shows the saved target", () => {
    const phase = readFileSync("js/nutrition/nutrition-phase.js", "utf8");
    const goals = readFileSync("js/nutrition/unified-goals-calories.js", "utf8");
    assert.match(phase, /Live coaching and calorie decisions always stop at today/);
    assert.match(phase, /return localDate\(\);/);
    assert.match(goals, /useSavedActiveTarget/);
    assert.match(goals, /active\.currentCalories \?\? active\.startCalories/);
});

test("Goals & Calories no longer exposes weekly review testing controls", () => {
    const goals = readFileSync("js/nutrition/unified-goals-calories.js", "utf8");
    assert.doesNotMatch(goals, /id="unified-preview-review"/);
    assert.doesNotMatch(goals, /id="unified-replay-review"/);
    assert.doesNotMatch(goals, />Preview Weekly Calorie Review</);
    assert.doesNotMatch(goals, />Undo last update and replay review</);
});

test("a ready review is shared by Nutrition and Progress and applied targets refresh immediately", () => {
    const alert = readFileSync("js/nutrition/maintenance-check-in.js", "utf8");
    const display = readFileSync("js/nutrition/calories-full-adjustment-display.js", "utf8");
    assert.match(alert, /maintenance-nav-badge/);
    assert.match(alert, /background: #35d3b4/);
    assert.match(alert, /renderProgressReviewAlert\(checkIn, mode\)/);
    assert.match(alert, /progress-weekly-review-alert/);
    assert.match(alert, /Review target/);
    assert.match(alert, /levelup:open-weekly-calorie-review/);
    assert.match(display, /syncAppliedTargetAcrossSurfaces\(recommendation\.targetCalories\)/);
    assert.match(display, /levelup:calorie-target-applied/);
    assert.match(display, /Adjustment applied · reassess in 7 days/);
});

test("the Nutrition dot uses the exact actionable review state", () => {
    const alert = readFileSync("js/nutrition/maintenance-check-in.js", "utf8");
    const display = readFileSync("js/nutrition/calories-full-adjustment-display.js", "utf8");
    assert.match(display, /setWeeklyReviewReadyState\(reviewReady\)/);
    assert.match(display, /levelup:weekly-calorie-review-readiness/);
    assert.match(display, /setWeeklyReviewReadyState\(false\)/);
    assert.match(alert, /weeklyCalorieReviewReady === "true"/);
    assert.match(alert, /checkIn\.ready \|\| sharedReady/);
    assert.match(alert, /levelup:weekly-calorie-review-readiness/);
});

test("the internal review preview state still drives the Nutrition notification surface", () => {
    const alert = readFileSync("js/nutrition/maintenance-check-in.js", "utf8");
    assert.match(alert, /previewReady = sessionStorage\.getItem\(WEEKLY_REVIEW_PREVIEW_KEY\) === "1"/);
    assert.match(alert, /checkIn\.ready \|\| sharedReady \|\| previewReady/);
});
