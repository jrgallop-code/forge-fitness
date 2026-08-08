import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionPlan,
    getNutritionMacroPreference,
    syncCalculatedCalories
}
from "../nutrition/nutrition-storage.js?v=adaptive-plan-1";

import {
    calculateTdee,
    calculateGoalCalories,
    calculateMacroTargets,
    poundsToKg
}
from "../nutrition/tdee-calculator.js?v=adaptive-plan-1";


export function initializeDashboardNutritionTargets() {
    const dashboard =
        document.querySelector(".dashboard");

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

    const estimate = calculateTdee(profile);
    const recommendation =
        calculateGoalCalories(
            estimate.tdee,
            goal.goalId
        );

    if (!recommendation) {
        return;
    }

    syncCalculatedCalories(
        recommendation.calories
    );

    const plan = getNutritionPlan();
    const currentCalories =
        Number.isFinite(plan.currentCalories)
            ? plan.currentCalories
            : recommendation.calories;

    const macroPreset =
        getNutritionMacroPreference()?.macroPreset ||
        "balanced";

    const macros = calculateMacroTargets({
        calories: currentCalories,
        weightKg: poundsToKg(Number(profile.weightLb)),
        macroPreset
    });

    const calorieCard = `
        <div class="metric-card dashboard-nutrition-target-card">
            <div class="metric-icon">🔥</div>
            <div>
                <h3>Daily Calorie Target</h3>
                <p>${currentCalories} kcal</p>
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
