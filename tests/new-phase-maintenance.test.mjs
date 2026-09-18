import test from "node:test";
import assert from "node:assert/strict";

import { resolvePhaseMaintenance } from "../js/nutrition/new-phase-maintenance.js";
import { GOAL_PRESETS, roundCalorieTarget } from "../js/nutrition/tdee-calculator.js";

const highConfidenceEstimate = {
    status: "established",
    maintenanceCalories: 2520,
    liveMaintenanceCalories: 2448,
    profileEstimate: 2775
};

test("a different phase starts from high-confidence current expenditure", () => {
    const maintenance = resolvePhaseMaintenance({
        selectedGoalId: "bulk_standard",
        activeGoalId: "bulk_conservative",
        enteredMaintenance: 2775,
        estimate: highConfidenceEstimate
    });
    const target = roundCalorieTarget(maintenance + GOAL_PRESETS.bulk_standard.dailyCalorieAdjustment);

    assert.equal(maintenance, 2448);
    assert.equal(target, 2700);
});

test("the active phase keeps its accepted baseline between reviews", () => {
    assert.equal(resolvePhaseMaintenance({
        selectedGoalId: "bulk_conservative",
        activeGoalId: "bulk_conservative",
        enteredMaintenance: 2775,
        estimate: highConfidenceEstimate
    }), 2775);
});

test("a lower-confidence estimate does not silently replace the accepted baseline", () => {
    assert.equal(resolvePhaseMaintenance({
        selectedGoalId: "bulk_standard",
        activeGoalId: "bulk_conservative",
        enteredMaintenance: 2775,
        estimate: { ...highConfidenceEstimate, status: "preliminary" }
    }), 2775);
});
