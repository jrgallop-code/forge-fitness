import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionMacroPreference,
    getNutritionPlan
}
from "./nutrition-storage.js?v=single-calorie-target-1";
import { getActiveNutritionPhase } from "./nutrition-phase.js?v=phase-tolerance-1";

import {
    calculateMacroTargets,
    poundsToKg
}
from "./tdee-calculator.js?v=single-calorie-target-1";

function setText(id, value) {
    const el = document.getElementById(id);
    if (el && el.textContent !== value) el.textContent = value;
}

function syncActivePlanDisplays() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const plan = getNutritionPlan();
    const phase = getActiveNutritionPhase();
    const phaseCalories = Number(phase?.currentCalories ?? phase?.startCalories);
    const savedCalories = Number(plan.calculatedCalories);
    const calories = Number.isFinite(phaseCalories) && phaseCalories > 0 ? phaseCalories : savedCalories;

    if (!profile || (!phase && !goal?.goalId) || !Number.isFinite(calories) || calories <= 0) {
        return;
    }

    const macroPreset = getNutritionMacroPreference()?.macroPreset || "balanced";
    const macros = calculateMacroTargets({
        calories,
        weightKg: poundsToKg(Number(profile.weightLb)),
        macroPreset
    });

    setText("planner-summary-calories", `${Math.round(calories).toLocaleString()} kcal`);
    setText("nutrition-macro-calories", `${Math.round(calories).toLocaleString()} kcal/day`);
    setText("calculated-calorie-target", `${Math.round(calories).toLocaleString()} kcal/day`);
    setText("coach-current-calories", `${Math.round(calories).toLocaleString()} kcal/day`);

    if (macros) {
        setText("planner-summary-protein", `${macros.protein} g`);
        setText("nutrition-protein-target", `${macros.protein} g/day`);
        setText("nutrition-carb-target", `${macros.carbs} g/day`);
        setText("nutrition-fat-target", `${macros.fat} g/day`);
    }
}

document.addEventListener("click", () => {
    setTimeout(syncActivePlanDisplays, 0);
});

window.addEventListener("levelup:nutrition-updated", () => {
    setTimeout(syncActivePlanDisplays, 0);
});

window.addEventListener("levelup:nutrition-phase-updated", () => {
    setTimeout(syncActivePlanDisplays, 0);
});

window.addEventListener("load", () => {
    setTimeout(syncActivePlanDisplays, 0);
});
