import test from "node:test";
import assert from "node:assert/strict";

import { findInheritedNewPhaseTargetRepair } from "../js/nutrition/legacy-new-phase-target-repair.js";

const estimate = { status: "established", liveMaintenanceCalories: 2448 };
const phases = [
    { goalId: "bulk_conservative", maintenanceCalories: 2775, currentCalories: 2900, endDate: "2026-09-16" },
    { goalId: "bulk_standard", maintenanceCalories: 2775, startCalories: 3025, currentCalories: 3025, endDate: null }
];

test("repairs a new phase that inherited the previous phase baseline", () => {
    assert.deepEqual(findInheritedNewPhaseTargetRepair(phases, estimate), {
        activeIndex: 1,
        expenditure: 2448,
        correctedTarget: 2700,
        currentTarget: 3025,
        goalId: "bulk_standard"
    });
});

test("does not rewrite a deliberate active target", () => {
    const deliberate = structuredClone(phases);
    deliberate[1].currentCalories = 2950;
    assert.equal(findInheritedNewPhaseTargetRepair(deliberate, estimate), null);
});

test("does not alter the current phase when its baseline was not inherited", () => {
    const independent = structuredClone(phases);
    independent[1].maintenanceCalories = 2600;
    independent[1].currentCalories = 2850;
    assert.equal(findInheritedNewPhaseTargetRepair(independent, estimate), null);
});
