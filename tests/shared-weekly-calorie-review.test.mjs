import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("active phases cannot apply calculated TDEE before the shared weekly review", () => {
    const source = readFileSync("js/nutrition/unified-goals-calories.js", "utf8");
    assert.match(source, /waitingForSharedReview = Boolean\(active && !metrics\?\.recommendationReady\)/);
    assert.match(source, /estimate\.maintenanceCalories\) \|\| waitingForSharedReview/);
    assert.match(source, /active && !metrics\?\.recommendationReady/);
    assert.match(source, /No separate calorie change will be created/);
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
});

test("declining the shared review marks both recommendation systems handled", () => {
    const source = readFileSync("js/nutrition/calorie-authority-events.js", "utf8");
    assert.match(source, /lastHandledCheckDay: checkDay/);
    assert.match(source, /markMaintenanceCheckInReviewed/);
    assert.match(source, /kept-shared-weekly-review/);
});
