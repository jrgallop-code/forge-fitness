import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const phase = readFileSync("js/nutrition/nutrition-phase.js", "utf8");
const authority = readFileSync("js/nutrition/nutrition-authority-sync.js", "utf8");
const startup = readFileSync("js/core/pwa-startup-safeguard.js", "utf8");

test("nutrition phase consumes the same visible Trend Weight rate as Progress", () => {
    assert.match(phase, /calculateVisibleWeightTrend/);
    assert.match(phase, /rateDays:\s*20/);
    assert.match(phase, /weeklyChange:\s*Number\(visibleTrend\.weeklyChange\)/);
});

test("nutrition phase presents one live expenditure and a separate weekly plan baseline", () => {
    assert.match(authority, /liveMaintenanceCalories/);
    assert.match(authority, /Current Expenditure/);
    assert.match(authority, /Weekly Plan Baseline/);
    assert.match(authority, /same daily expenditure shown in Progress/);
});

test("weekly calorie review snapshots the same current expenditure before calculating a target", () => {
    assert.match(authority, /weeklyCalorieReviewReady/);
    assert.match(authority, /maintenanceCalories:\s*rounded/);
    assert.match(authority, /Current expenditure used for review/);
});

test("nutrition authority loads at PWA startup", () => {
    assert.match(startup, /installNutritionAuthoritySync/);
    assert.match(startup, /nutrition-authority-sync\.js/);
});
