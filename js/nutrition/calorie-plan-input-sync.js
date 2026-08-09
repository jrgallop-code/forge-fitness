import {
    GOAL_PRESETS,
    calculateTdee
}
from "./tdee-calculator.js?v=manual-goals-1";

import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionPlan,
    saveNutritionPlan
}
from "./nutrition-storage.js?v=manual-goals-1";

const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";

function getPresetRate(goalId) {
    const preset = goalId ? GOAL_PRESETS[goalId] : null;
    if (!preset) return null;

    const direct = Number(
        preset.weeklyWeightChangeLb ??
        preset.weeklyChangeLb
    );

    if (Number.isFinite(direct)) {
        return direct;
    }

    const adjustment = Number(preset.dailyCalorieAdjustment);
    return Number.isFinite(adjustment)
        ? (adjustment * 7) / 3500
        : null;
}

function getSavedManualMaintenance() {
    const raw = localStorage.getItem(MANUAL_MAINTENANCE_KEY);
    if (raw === null || raw === "") return null;

    const value = Number(raw);
    return Number.isFinite(value) && value > 0
        ? value
        : null;
}

function getSavedCustomRate() {
    const raw = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);
    if (raw === null || raw === "") return null;

    const value = Number(raw);
    return Number.isFinite(value)
        ? value
        : null;
}

function getCurrentInputs({ preferTyped = false } = {}) {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();

    if (!profile || !goal?.goalId || !GOAL_PRESETS[goal.goalId]) {
        return null;
    }

    const estimatedTdee = calculateTdee(profile)?.tdee;
    if (!Number.isFinite(estimatedTdee)) return null;

    const maintenanceInput = document.getElementById("manual-maintenance-calories");
    const rateInput = document.getElementById("custom-weekly-rate");

    const typedMaintenance = Number(maintenanceInput?.value);
    const typedRate = Number(rateInput?.value);

    const savedMaintenance = getSavedManualMaintenance();
    const savedRate = getSavedCustomRate();

    const maintenance =
        preferTyped && maintenanceInput?.value !== "" && Number.isFinite(typedMaintenance) && typedMaintenance > 0
            ? typedMaintenance
            : savedMaintenance ?? estimatedTdee;

    const weeklyRate =
        preferTyped && rateInput?.value !== "" && Number.isFinite(typedRate)
            ? typedRate
            : savedRate ?? getPresetRate(goal.goalId);

    if (!Number.isFinite(maintenance) || !Number.isFinite(weeklyRate)) {
        return null;
    }

    return {
        estimatedTdee,
        maintenance,
        weeklyRate,
        calculatedCalories: Math.round(
            maintenance + ((weeklyRate * 3500) / 7)
        ),
        manualMaintenance:
            preferTyped && maintenanceInput?.value !== ""
                ? true
                : savedMaintenance !== null,
        customRate:
            preferTyped && rateInput?.value !== ""
                ? true
                : savedRate !== null
    };
}

function formatRate(value) {
    return `${value > 0 ? "+" : ""}${Number(value).toFixed(2)} lb/wk`;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function previewFromInputs() {
    const values = getCurrentInputs({ preferTyped: true });
    if (!values) return;

    setText("override-estimated-tdee", `${values.estimatedTdee} kcal/day`);
    setText(
        "override-working-maintenance",
        `${Math.round(values.maintenance)} kcal/day${values.manualMaintenance ? " · manual" : ""}`
    );
    setText(
        "override-effective-rate",
        `${formatRate(values.weeklyRate)}${values.customRate ? " · custom" : ""}`
    );
    setText("calculated-calorie-target", `${values.calculatedCalories} kcal/day`);
    setText("current-calorie-target", `${values.calculatedCalories} kcal/day`);
}

function commitSavedInputsToPlan() {
    const values = getCurrentInputs();
    if (!values) return;

    const plan = getNutritionPlan();

    saveNutritionPlan({
        ...plan,
        calculatedCalories: values.calculatedCalories,
        currentCalories: values.calculatedCalories
    });

    window.dispatchEvent(
        new CustomEvent("levelup:nutrition-updated")
    );
}

document.addEventListener("input", event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (
        target.id === "manual-maintenance-calories" ||
        target.id === "custom-weekly-rate"
    ) {
        previewFromInputs();
    }
});

document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (
        target.closest("#save-manual-maintenance") ||
        target.closest("#save-custom-weekly-rate") ||
        target.closest("#reset-manual-maintenance") ||
        target.closest("#reset-custom-weekly-rate")
    ) {
        queueMicrotask(commitSavedInputsToPlan);
    }
});

window.addEventListener("levelup:nutrition-updated", () => {
    queueMicrotask(previewFromInputs);
});
