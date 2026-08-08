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
const ACTIVE_TARGET_SNAPSHOT_KEY = "level_up_active_calorie_target_snapshot";
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
    const source = getActiveTargetSource();
    const saved = readSavedTarget();

    if (saved && saved.source === source) {
        return saved;
    }

    return calculateSelectedTarget();
}

export function syncSelectedTargetToPlan() {
    const target = calculateSelectedTarget();

    if (!isValidTarget(target)) {
        return null;
    }

    saveTargetSnapshot(target);

    const plan = getNutritionPlan();

    saveNutritionPlan({
        ...plan,
        calculatedCalories: target.calories,
        currentCalories: target.calories
    });

    return target;
}

function calculateSelectedTarget() {
    return getActiveTargetSource() === "manual"
        ? getManualTarget()
        : getAutoTarget();
}

function saveTargetSnapshot(target) {
    localStorage.setItem(
        ACTIVE_TARGET_SNAPSHOT_KEY,
        JSON.stringify({
            source: target.source,
            calories: Math.round(Number(target.calories)),
            maintenance: Number(target.maintenance),
            weeklyRate: Number(target.weeklyRate),
            updatedAt: new Date().toISOString()
        })
    );
}

function readSavedTarget() {
    const stored = localStorage.getItem(ACTIVE_TARGET_SNAPSHOT_KEY);

    if (!stored) {
        return null;
    }

    try {
        const parsed = JSON.parse(stored);

        if (!isValidTarget(parsed)) {
            return null;
        }

        return {
            source: parsed.source === "manual" ? "manual" : "auto",
            calories: Math.round(Number(parsed.calories)),
            maintenance: Number(parsed.maintenance),
            weeklyRate: Number(parsed.weeklyRate)
        };
    }
    catch {
        return null;
    }
}

function isValidTarget(target) {
    return Boolean(
        target &&
        (target.source === "auto" || target.source === "manual") &&
        Number.isFinite(Number(target.calories)) &&
        Number(target.calories) > 0 &&
        Number.isFinite(Number(target.maintenance)) &&
        Number(target.maintenance) > 0 &&
        Number.isFinite(Number(target.weeklyRate))
    );
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
