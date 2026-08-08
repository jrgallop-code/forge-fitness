import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionPlan,
    getNutritionMacroPreference,
    syncCalculatedCalories
}
from "../nutrition/nutrition-storage.js?v=adaptive-plan-1";

import {
    GOAL_PRESETS,
    calculateTdee,
    calculateGoalCalories,
    calculateMacroTargets,
    poundsToKg
}
from "../nutrition/tdee-calculator.js?v=adaptive-plan-1";

const CALCULATION_MODE_KEY = "level_up_goal_calculation_mode";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";

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

    const estimate = calculateTdee(profile);
    const mode = getCalculationMode();
    const calculatedTarget = getCalculatedTarget({
        mode,
        estimatedTdee: estimate.tdee,
        goalId: goal.goalId
    });

    if (!Number.isFinite(calculatedTarget) || calculatedTarget <= 0) {
        return;
    }

    syncCalculatedCalories(calculatedTarget);

    const plan = getNutritionPlan();
    const currentCalories =
        Number.isFinite(plan.currentCalories)
            ? plan.currentCalories
            : calculatedTarget;

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
                <p>${Math.round(currentCalories)} kcal</p>
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

function getCalculationMode() {
    const mode = localStorage.getItem(CALCULATION_MODE_KEY);
    return mode === "manual" ? "manual" : "auto";
}

function getCalculatedTarget({ mode, estimatedTdee, goalId }) {
    if (mode === "manual") {
        const maintenanceRaw = localStorage.getItem(MANUAL_MAINTENANCE_KEY);
        const rateRaw = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);

        const manualMaintenance =
            maintenanceRaw !== null && maintenanceRaw !== ""
                ? Number(maintenanceRaw)
                : NaN;

        const customRate =
            rateRaw !== null && rateRaw !== ""
                ? Number(rateRaw)
                : NaN;

        const workingMaintenance =
            Number.isFinite(manualMaintenance) && manualMaintenance > 0
                ? manualMaintenance
                : estimatedTdee;

        const weeklyRate =
            Number.isFinite(customRate)
                ? customRate
                : getPresetWeeklyRate(goalId);

        if (
            Number.isFinite(workingMaintenance) &&
            Number.isFinite(weeklyRate)
        ) {
            return Math.round(
                workingMaintenance + ((weeklyRate * 3500) / 7)
            );
        }
    }

    const recommendation =
        calculateGoalCalories(
            estimatedTdee,
            goalId
        );

    return recommendation?.calories ?? null;
}

function getPresetWeeklyRate(goalId) {
    const preset = GOAL_PRESETS[goalId];

    if (!preset) {
        return NaN;
    }

    const direct = Number(
        preset.weeklyWeightChangeLb ??
        preset.weeklyChangeLb
    );

    if (Number.isFinite(direct)) {
        return direct;
    }

    const adjustment = Number(
        preset.dailyCalorieAdjustment
    );

    return Number.isFinite(adjustment)
        ? (adjustment * 7) / 3500
        : NaN;
}
