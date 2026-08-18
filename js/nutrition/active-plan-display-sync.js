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

function isManualMacroEditorActive() {
    const select = document.getElementById("nutrition-macro-select");
    return select?.value === "manual"
        || Boolean(document.querySelector("[data-manual-macro]"));
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

    const macroPreference = getNutritionMacroPreference();
    const macroPreset = macroPreference?.macroPreset || "balanced";
    const manualMacroEditorActive = isManualMacroEditorActive();
    const macros = calculateMacroTargets({
        calories,
        weightKg: poundsToKg(Number(profile.weightLb)),
        macroPreset
    });

    setText("planner-summary-calories", `${Math.round(calories).toLocaleString()} kcal`);
    setText("calculated-calorie-target", `${Math.round(calories).toLocaleString()} kcal/day`);
    setText("coach-current-calories", `${Math.round(calories).toLocaleString()} kcal/day`);

    // The manual macro UI mounts number inputs inside these output elements.
    // Replacing their text while the editor is active destroys the focused input
    // (especially noticeable on iPhone) and makes the editor appear to freeze.
    if (manualMacroEditorActive) return;

    setText("nutrition-macro-calories", `${Math.round(calories).toLocaleString()} kcal/day`);

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
