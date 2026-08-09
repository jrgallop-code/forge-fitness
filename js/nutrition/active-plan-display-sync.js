import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionMacroPreference,
    getNutritionPlan
}
from "./nutrition-storage.js?v=plan-source-1";

import {
    calculateMacroTargets,
    poundsToKg
}
from "./tdee-calculator.js?v=plan-source-1";

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function syncActivePlanDisplays() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const plan = getNutritionPlan();
    const calories = Number(plan.currentCalories);

    if (!profile || !goal?.goalId || !Number.isFinite(calories) || calories <= 0) {
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

window.addEventListener("load", () => {
    setTimeout(syncActivePlanDisplays, 0);
});
