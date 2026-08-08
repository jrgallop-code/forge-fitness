import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionMacroPreference
}
from "../nutrition/nutrition-storage.js?v=active-target-2";

import {
    calculateMacroTargets,
    poundsToKg
}
from "../nutrition/tdee-calculator.js?v=active-target-2";

import {
    getSelectedTarget,
    syncSelectedTargetToPlan
}
from "../nutrition/active-calorie-target.js?v=active-target-2";

export function initializeDashboardNutritionTargets() {
    const dashboard = document.querySelector(".dashboard");

    if (!dashboard) {
        return;
    }

    const profile = getNutritionProfile();
    const goal = getNutritionGoal();

    if (
        !profile ||
        !goal?.goalId ||
        Number(profile.age) < 18
    ) {
        return;
    }

    const target =
        syncSelectedTargetToPlan() ||
        getSelectedTarget();

    if (!target || !Number.isFinite(target.calories) || target.calories <= 0) {
        return;
    }

    const currentCalories = target.calories;

    const macroPreset =
        getNutritionMacroPreference()?.macroPreset ||
        "balanced";

    const macros = calculateMacroTargets({
        calories: currentCalories,
        weightKg: poundsToKg(Number(profile.weightLb)),
        macroPreset
    });

    const sourceLabel =
        target.source === "manual"
            ? "Manual Target"
            : "Auto Target";

    const calorieCard = `
        <div class="metric-card dashboard-nutrition-target-card">
            <div class="metric-icon">🔥</div>
            <div>
                <h3>Daily Calorie Target</h3>
                <p>${Math.round(currentCalories)} kcal</p>
                <small>${sourceLabel}</small>
            </div>
        </div>
    `;

    const proteinCard = macros
        ? `
            <div class="metric-card dashboard-nutrition-target-card">
                <div class="metric-icon">🥩</div>
                <div>
                    <h3>Daily Protein Target</h3>
                    <p>${macros.protein} g</p>
                </div>
            </div>
        `
        : "";

    dashboard.insertAdjacentHTML(
        "afterbegin",
        calorieCard + proteinCard
    );
}
