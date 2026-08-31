import assert from "node:assert/strict";
import test from "node:test";
import { buildAutomaticMaintenanceUpdate, getMaintenanceCheckIn } from "../js/nutrition/maintenance-check-in.js";

const estimate = {
    maintenanceCalories: 2375,
    recentFoodDays: 5,
    recentWeighIns: 3
};

test("offers a weekly maintenance update when data and change are meaningful", () => {
    const result = getMaintenanceCheckIn({
        estimate,
        currentMaintenance: 2275,
        currentTarget: 2400,
        state: {},
        today: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.ready, true);
    assert.equal(result.change, 100);
    assert.equal(result.proposedTarget, 2500);
});

test("does not interrupt for a change below 50 calories", () => {
    const result = getMaintenanceCheckIn({
        estimate: { ...estimate, maintenanceCalories: 2300 },
        currentMaintenance: 2275,
        currentTarget: 2400,
        state: {},
        today: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.ready, false);
    assert.equal(result.meaningful, false);
});

test("requires four recent food days and one recent weigh-in", () => {
    const result = getMaintenanceCheckIn({
        estimate: { ...estimate, recentFoodDays: 3 },
        currentMaintenance: 2275,
        currentTarget: 2400,
        state: {},
        today: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.ready, false);
    assert.equal(result.enoughWeeklyData, false);
});

test("an active phase waits for its qualifying pace review before TDEE becomes actionable", () => {
    const result = getMaintenanceCheckIn({
        estimate,
        currentMaintenance: 2275,
        currentTarget: 2400,
        adaptiveMetrics: {
            recommendationReady: false,
            status: "AWAITING WEIGH-IN",
            actualRateLbPerWeek: 0.2,
            targetRateLbPerWeek: 0.25
        },
        state: {},
        today: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.adaptiveGateReady, false);
    assert.equal(result.ready, false);
});

test("the same TDEE change unlocks once the shared pace review is ready", () => {
    const result = getMaintenanceCheckIn({
        estimate,
        currentMaintenance: 2275,
        currentTarget: 2400,
        adaptiveMetrics: {
            recommendationReady: true,
            status: "NEEDS ATTENTION",
            actualRateLbPerWeek: 0.1,
            targetRateLbPerWeek: 0.25,
            trend: { checkDay: 14 }
        },
        state: {},
        today: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.adaptiveGateReady, true);
    assert.equal(result.ready, true);
});

test("waits seven days after the previous decision", () => {
    const result = getMaintenanceCheckIn({
        estimate,
        currentMaintenance: 2275,
        currentTarget: 2400,
        state: { reviewedAt: "2026-08-26" },
        today: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.ready, false);
    assert.equal(result.nextCheckInDays, 4);
});

test("does not offer a zero TDEE when the estimate is unavailable", () => {
    const result = getMaintenanceCheckIn({
        estimate: { maintenanceCalories: null, recentFoodDays: 5, recentWeighIns: 2 },
        currentMaintenance: 2275,
        currentTarget: 2400,
        state: {},
        today: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.ready, false);
    assert.equal(result.proposedMaintenance, null);
});

test("automatic updates preserve the goal adjustment and cap weekly movement", () => {
    const update = buildAutomaticMaintenanceUpdate({
        ready: true,
        change: 325,
        currentMaintenance: 2275,
        currentTarget: 2400
    });
    assert.equal(update.previousMaintenance, 2275);
    assert.equal(update.previousTarget, 2400);
    assert.equal(update.maintenanceCalories, 2425);
    assert.equal(update.targetCalories, 2550);
    assert.equal(update.appliedChange, 150);
});

test("automatic updates support a capped maintenance decrease", () => {
    const update = buildAutomaticMaintenanceUpdate({
        ready: true,
        change: -250,
        currentMaintenance: 2500,
        currentTarget: 2000
    });
    assert.equal(update.maintenanceCalories, 2350);
    assert.equal(update.targetCalories, 1850);
    assert.equal(update.appliedChange, -150);
});

test("a shared adjustment hold suppresses a second maintenance decision", () => {
    const result = getMaintenanceCheckIn({
        estimate,
        currentMaintenance: 2275,
        currentTarget: 2400,
        adjustmentHold: { daysRemaining: 5 },
        state: {},
        today: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.ready, false);
    assert.equal(result.nextCheckInDays, 5);
});

test("automatic maintenance and adaptive pace corrections become one capped target change", () => {
    const result = getMaintenanceCheckIn({
        estimate,
        currentMaintenance: 2275,
        currentTarget: 2400,
        adaptiveMetrics: {
            recommendationReady: true,
            actualRateLbPerWeek: 0.75,
            targetRateLbPerWeek: 0.25,
            trend: { checkDay: 21 }
        },
        state: {},
        today: new Date("2026-08-29T12:00:00")
    });
    const update = buildAutomaticMaintenanceUpdate(result);
    assert.equal(update.maintenanceChange, 100);
    assert.equal(update.requestedPaceCorrection, -250);
    assert.equal(update.targetChange, -150);
    assert.equal(update.targetCalories, 2250);
});
