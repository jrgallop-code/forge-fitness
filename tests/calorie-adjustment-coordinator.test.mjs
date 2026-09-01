import assert from "node:assert/strict";
import test from "node:test";
import { buildAdaptivePaceCorrection, buildCoordinatedWeeklyUpdate, buildReviewedCaloriePair } from "../js/nutrition/calorie-adjustment-coordinator.js";

test("pace correction converts the weekly rate gap into calories", () => {
    assert.equal(buildAdaptivePaceCorrection({ actualRate: 0.75, targetRate: 0.25 }), -250);
    assert.equal(buildAdaptivePaceCorrection({ actualRate: -0.1, targetRate: -0.5 }), -200);
});

test("maintenance is applied first and the combined target change is capped", () => {
    const update = buildCoordinatedWeeklyUpdate({
        currentMaintenance: 2275,
        proposedMaintenance: 2375,
        currentTarget: 2400,
        actualRate: 0.75,
        targetRate: 0.25,
        adaptiveReady: true
    });
    assert.deepEqual(update, {
        previousMaintenance: 2275,
        previousTarget: 2400,
        maintenanceCalories: 2375,
        targetCalories: 2250,
        maintenanceChange: 100,
        paceCorrection: -250,
        targetChange: -150,
        requestedMaintenanceChange: 100,
        requestedPaceCorrection: -250,
        capped: false
    });
});

test("an on-target phase preserves the adaptive offset when maintenance changes", () => {
    const update = buildCoordinatedWeeklyUpdate({
        currentMaintenance: 2275,
        proposedMaintenance: 2325,
        currentTarget: 2300,
        actualRate: 0.25,
        targetRate: 0.25,
        adaptiveReady: true
    });
    assert.equal(update.maintenanceCalories, 2325);
    assert.equal(update.targetCalories, 2350);
    assert.equal(update.paceCorrection, 0);
});

test("a weekly recommendation applies the rate gap once to actual intake", () => {
    const update = buildCoordinatedWeeklyUpdate({
        currentMaintenance: 2275,
        proposedMaintenance: 2400,
        currentTarget: 2400,
        actualIntakeCalories: 2500,
        actualRate: -0.2,
        targetRate: 0.25,
        adaptiveReady: true
    });
    assert.equal(update.requestedPaceCorrection, 225);
    assert.equal(update.fullRequestedTarget, 2725);
    assert.equal(update.adjustmentBaseline, 2500);
    assert.equal(update.behavioralChange, 225);
    assert.equal(update.targetCalories, 2725);
    assert.equal(update.targetChange, 325);
    assert.equal(update.paceCorrection, 225);
    assert.equal(update.capped, false);
    assert.equal(update.usedObservedPaceBaseline, true);
    assert.equal(update.reviewedMaintenanceCalories, 2600);
    assert.equal(update.plannedDailyAdjustment, 125);
});

test("2620 calories at minus 0.20 lb per week targets plus 0.25 without double counting", () => {
    const update = buildCoordinatedWeeklyUpdate({
        currentMaintenance: 2400,
        proposedMaintenance: 2400,
        currentTarget: 2400,
        actualIntakeCalories: 2620,
        actualRate: -0.2,
        targetRate: 0.25,
        adaptiveReady: true
    });
    assert.equal(update.requestedPaceCorrection, 225);
    assert.equal(update.fullRequestedTarget, 2845);
    assert.equal(update.targetCalories, 2850);
    assert.equal(update.targetChange, 450);
    assert.equal(update.paceCorrection, 225);
    assert.equal(update.capped, false);
    assert.equal(update.reviewedMaintenanceCalories, 2725);
    assert.equal(update.plannedDailyAdjustment, 125);
});

test("an accepted 2800 target at plus 0.25 synchronizes maintenance to 2675", () => {
    assert.deepEqual(buildReviewedCaloriePair({ targetCalories: 2800, targetRate: 0.25 }), {
        maintenanceCalories: 2675,
        targetCalories: 2800,
        plannedDailyAdjustment: 125
    });
});
