import {
    GOAL_PRESETS,
    calculateTdee,
    calculateGoalCalories
}
from "./tdee-calculator.js?v=active-target-1";

import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionPlan,
    saveNutritionPlan
}
from "./nutrition-storage.js?v=active-target-1";

const ACTIVE_TARGET_KEY = "level_up_active_calorie_target_source";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";
const SAVED_MANUAL_MAINTENANCE_KEY = "level_up_saved_manual_maintenance_calories";
const SAVED_CUSTOM_WEEKLY_RATE_KEY = "level_up_saved_custom_weekly_rate";

export function getActiveTargetSource() {
    return localStorage.getItem(ACTIVE_TARGET_KEY) === "manual"
        ? "manual"
        : "auto";
}

export function setActiveTargetSource(source) {
    const normalized = source === "manual" ? "manual" : "auto";
    localStorage.setItem(ACTIVE_TARGET_KEY, normalized);
    return normalized;
}

export function getAutoTarget() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();

    if (!isAdultProfile(profile) || !goal?.goalId) {
        return null;
    }

    const estimatedTdee = calculateTdee(profile).tdee;
    const recommendation = calculateGoalCalories(estimatedTdee, goal.goalId);

    if (!recommendation || !Number.isFinite(Number(recommendation.calories))) {
        return null;
    }

    return {
        source: "auto",
        calories: Math.round(Number(recommendation.calories)),
        maintenance: estimatedTdee,
        weeklyRate: getPresetWeeklyRate(goal.goalId)
    };
}

export function getManualTarget() {
    const profile = getNutritionProfile();
    const goal = getNutritionGoal();

    if (!isAdultProfile(profile) || !goal?.goalId) {
        return null;
    }

    const estimatedTdee = calculateTdee(profile).tdee;
    const manualMaintenance = readNumberFromEither(
        MANUAL_MAINTENANCE_KEY,
        SAVED_MANUAL_MAINTENANCE_KEY
    );
    const customRate = readNumberFromEither(
        CUSTOM_WEEKLY_RATE_KEY,
        SAVED_CUSTOM_WEEKLY_RATE_KEY
    );

    const maintenance =
        Number.isFinite(manualMaintenance) && manualMaintenance > 0
            ? manualMaintenance
            : estimatedTdee;

    const weeklyRate =
        Number.isFinite(customRate)
            ? customRate
            : getPresetWeeklyRate(goal.goalId);

    if (!Number.isFinite(maintenance) || !Number.isFinite(weeklyRate)) {
        return null;
    }

    return {
        source: "manual",
        calories: Math.round(maintenance + ((weeklyRate * 3500) / 7)),
        maintenance,
        weeklyRate
    };
}

export function getSelectedTarget() {
    return getActiveTargetSource() === "manual"
        ? getManualTarget()
        : getAutoTarget();
}

export function syncSelectedTargetToPlan() {
    const target = getSelectedTarget();

    if (!target || !Number.isFinite(target.calories) || target.calories <= 0) {
        return null;
    }

    const plan = getNutritionPlan();

    saveNutritionPlan({
        ...plan,
        calculatedCalories: target.calories,
        currentCalories: target.calories
    });

    return target;
}

function readNumberFromEither(activeKey, savedKey) {
    const active = localStorage.getItem(activeKey);
    const saved = localStorage.getItem(savedKey);
    const raw = active !== null && active !== "" ? active : saved;

    if (raw === null || raw === "") {
        return NaN;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : NaN;
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

    const adjustment = Number(preset.dailyCalorieAdjustment);
    return Number.isFinite(adjustment)
        ? (adjustment * 7) / 3500
        : NaN;
}

function isAdultProfile(profile) {
    return Boolean(
        profile &&
        Number.isFinite(Number(profile.age)) &&
        Number(profile.age) >= 18
    );
}
