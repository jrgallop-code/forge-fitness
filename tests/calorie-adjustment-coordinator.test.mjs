import assert from "node:assert/strict";
import test from "node:test";
import { buildAdaptivePaceCorrection, buildCoordinatedWeeklyUpdate } from "../js/nutrition/calorie-adjustment-coordinator.js";

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

test("a weekly recommendation caps the behavioral change from actual intake", () => {
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
    assert.equal(update.fullRequestedTarget, 2750);
    assert.equal(update.adjustmentBaseline, 2500);
    assert.equal(update.behavioralChange, 150);
    assert.equal(update.targetCalories, 2650);
    assert.equal(update.targetChange, 250);
    assert.equal(update.capped, true);
});
