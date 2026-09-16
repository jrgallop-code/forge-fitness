import assert from "node:assert/strict";
import test from "node:test";

import {
    calculateGoalCalories,
    calculateMacroTargets,
    roundCalorieTarget
} from "../js/nutrition/tdee-calculator.js";

test("calorie prescriptions round to practical 25-calorie increments", () => {
    assert.equal(roundCalorieTarget(2831), 2825);
    assert.equal(roundCalorieTarget(2845), 2850);
    assert.equal(calculateGoalCalories(2581, "bulk_standard")?.calories, 2825);
});

test("macro targets use the same normalized calorie prescription", () => {
    const macros = calculateMacroTargets({
        calories: 2831,
        weightKg: 72,
        macroPreset: "balanced"
    });

    assert.equal(macros?.calories, 2825);
});

test("stored plans and active phases repair older whole-calorie targets", async () => {
    const values = new Map([
        ["level_up_nutrition_plan", JSON.stringify({ calculatedCalories: 2831, currentCalories: 2831 })],
        ["level_up_nutrition_phases", JSON.stringify([{
            id: "phase-1",
            goalId: "bulk_standard",
            startDate: "2026-09-16",
            startCalories: 2831,
            currentCalories: 2831,
            maintenanceCalories: 2581,
            endDate: null
        }])]
    ]);

    globalThis.localStorage = {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };

    const storage = await import(`../js/nutrition/nutrition-storage.js?rounding-test=${Date.now()}`);
    const phases = await import(`../js/nutrition/nutrition-phase.js?rounding-test=${Date.now()}`);

    assert.equal(storage.getNutritionPlan().currentCalories, 2825);
    assert.equal(phases.getActiveNutritionPhase().currentCalories, 2825);
    assert.equal(JSON.parse(values.get("level_up_nutrition_plan")).currentCalories, 2825);
    assert.equal(JSON.parse(values.get("level_up_nutrition_phases"))[0].currentCalories, 2825);
});
