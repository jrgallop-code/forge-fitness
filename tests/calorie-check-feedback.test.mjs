import assert from "node:assert/strict";
import test from "node:test";
import { buildPendingCalorieCheckMessage } from "../js/nutrition/calorie-check-feedback.js";

test("labels a blocked check as provisional rather than recommending the current target", () => {
    const message = buildPendingCalorieCheckMessage({
        metrics: {
            status: "NEED MORE DATA",
            targetRateLbPerWeek: 0.25,
            toleranceLbPerWeek: 0.16,
            trend: { phaseDay: 24, previousEntries: 3, currentEntries: 4, minEntriesPerWindow: 4, checkDay: 21 }
        },
        visibleRate: 0.37
    });
    assert.equal(message, "No calorie recommendation yet · Add 1 more weigh-in in the previous 7-day block (3/4 previous · 4/4 current) · Provisional pace: +0.37 vs +0.25 lb/week");
});

test("states the phase day before the first calorie decision", () => {
    const message = buildPendingCalorieCheckMessage({
        metrics: { targetRateLbPerWeek: -0.5, toleranceLbPerWeek: 0.16, trend: { phaseDay: 10 } },
        visibleRate: -0.45
    });
    assert.match(message, /First calorie check on Day 14 · currently Day 10/);
});

test("asks for a new scheduled weigh-in when both comparison windows are complete", () => {
    const message = buildPendingCalorieCheckMessage({
        metrics: {
            status: "AWAITING WEIGH-IN",
            targetRateLbPerWeek: 0.25,
            toleranceLbPerWeek: 0.16,
            trend: { phaseDay: 23, checkDay: 21, previousEntries: 4, currentEntries: 4 }
        },
        visibleRate: 0.4
    });
    assert.match(message, /Log a new weigh-in for the Day 21 check/);
});

test("does not invent a zero trend when visible feedback is unavailable", () => {
    const message = buildPendingCalorieCheckMessage({
        metrics: { trend: { phaseDay: 18, previousEntries: 2, currentEntries: 4 } },
        visibleRate: null
    });
    assert.equal(message, "No calorie recommendation yet · Add 2 more weigh-ins in the previous 7-day block (2/4 previous · 4/4 current)");
});

test("caps completed-window progress instead of showing counts such as 7/4", () => {
    const message = buildPendingCalorieCheckMessage({
        metrics: {
            targetRateLbPerWeek: 0.25,
            toleranceLbPerWeek: 0.16,
            trend: { phaseDay: 24, previousEntries: 1, currentEntries: 7, minEntriesPerWindow: 4 }
        },
        visibleRate: 0.37
    });
    assert.equal(message, "No calorie recommendation yet · Add 3 more weigh-ins in the previous 7-day block (1/4 previous · 4/4 current) · Provisional pace: +0.37 vs +0.25 lb/week");
});
