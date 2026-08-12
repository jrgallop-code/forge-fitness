import { calculateWeightTrend } from "../core/weight-trend.js?v=weight-trend-regression-1";
import { GOAL_PRESETS } from "./tdee-calculator.js?v=manual-goals-1";
import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionPlan,
    setCurrentCalories
} from "./nutrition-storage.js?v=manual-goals-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";

function refreshAdaptiveTrend() {
    const coach = document.querySelector('[data-planner-view="coach"]');
    if (!coach || coach.hidden || getActivePhase()) return;

    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const plan = getNutritionPlan();
    const preset = goal?.goalId ? GOAL_PRESETS[goal.goalId] : null;
    const trend = calculateWeightTrend(getWeightEntries());

    if (!isAdultProfile(profile) || !preset) return;

    const goalRate = getEffectiveWeeklyRate(goal.goalId);
    const actualRate = trend.weeklyChange;
    const actualElement = document.getElementById("coach-actual-rate");
    const actualHeading = actualElement?.closest(".metric-card")?.querySelector("h3");
    const confidence = document.getElementById("coach-confidence");
    const recommendation = document.getElementById("coach-recommendation");
    const suggestedText = document.getElementById("coach-suggested-calories");
    const applyButton = document.getElementById("apply-coach-recommendation");

    if (actualHeading) actualHeading.textContent = trend.label;
    if (actualElement) actualElement.textContent = Number.isFinite(actualRate) ? formatRate(actualRate) : "--";
    if (confidence) {
        const status = trend.status === "actual" ? "Established" : trend.status === "preliminary" ? "Preliminary" : "Insufficient";
        confidence.textContent = `${status} · ${trend.windowEntries} weigh-ins / ${trend.windowDays} days`;
    }

    if (trend.status !== "actual" || !Number.isFinite(actualRate)) {
        if (recommendation) recommendation.textContent = trend.status === "preliminary"
            ? "Your weekly rate is still preliminary. Level Up waits for at least 14 calendar days and 7 valid weigh-ins before using the trend to suggest a calorie change."
            : "Keep collecting consistent weight data. A preliminary weekly rate can appear after 7 days; 14 calendar days and 7 valid weigh-ins are required for coaching.";
        if (suggestedText) suggestedText.textContent = "";
        hideApply(applyButton);
        return;
    }

    if (!Number.isFinite(goalRate)) {
        hideApply(applyButton);
        return;
    }

    const difference = actualRate - goalRate;
    if (Math.abs(difference) <= 0.2) {
        if (recommendation) recommendation.textContent = `On target. Your recent regression trend is ${formatRate(actualRate)} versus a goal of ${formatRate(goalRate)}. The difference is within the ±0.20 lb/week tolerance, so no calorie adjustment is suggested.`;
        if (suggestedText) suggestedText.textContent = "";
        hideApply(applyButton);
        return;
    }

    if (!Number.isFinite(plan.currentCalories)) {
        hideApply(applyButton);
        return;
    }

    const direction = difference > 0 ? -1 : 1;
    const adjustment = Math.abs(difference) >= 0.4 ? 150 : 100;
    const suggested = Math.round(plan.currentCalories + direction * adjustment);
    const actionText = direction < 0
        ? `reduce the current target by about ${adjustment} kcal/day`
        : `increase the current target by about ${adjustment} kcal/day`;

    if (recommendation) recommendation.textContent = `Your regression trend is ${Math.abs(difference).toFixed(2)} lb/week away from your active target. Consider whether you want to ${actionText}. This is an adult-use coaching suggestion, not an automatic change.`;
    if (suggestedText) suggestedText.textContent = `Suggested target: ${suggested} kcal/day`;

    if (applyButton) {
        applyButton.hidden = false;
        applyButton.onclick = () => {
            setCurrentCalories(suggested, "Adaptive Coach regression recommendation");
            window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
            if (recommendation) recommendation.textContent = "Recommendation applied. Your current calorie target has been updated.";
            hideApply(applyButton);
        };
    }
}

function getWeightEntries() {
    try {
        const parsed = JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}

function getActivePhase() {
    try {
        const phases = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
        return Array.isArray(phases) ? phases.find(phase => !phase?.endDate) || null : null;
    }
    catch {
        return null;
    }
}

function getEffectiveWeeklyRate(goalId) {
    const customRaw = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);
    const custom = customRaw === null || customRaw === "" ? null : Number(customRaw);
    if (Number.isFinite(custom)) return custom;

    const preset = GOAL_PRESETS[goalId];
    if (!preset) return NaN;
    const direct = Number(preset.weeklyWeightChangeLb ?? preset.weeklyChangeLb);
    if (Number.isFinite(direct)) return direct;
    const adjustment = Number(preset.dailyCalorieAdjustment);
    return Number.isFinite(adjustment) ? (adjustment * 7) / 3500 : NaN;
}

function isAdultProfile(profile) {
    return Boolean(profile && Number.isFinite(Number(profile.age)) && Number(profile.age) >= 18);
}

function formatRate(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number > 0 ? "+" : ""}${number.toFixed(2)} lb/wk` : "--";
}

function hideApply(button) {
    if (!button) return;
    button.hidden = true;
    button.onclick = null;
}

function refreshSoon() {
    requestAnimationFrame(() => {
        refreshAdaptiveTrend();
        setTimeout(refreshAdaptiveTrend, 120);
    });
}

document.addEventListener("click", event => {
    if (event.target.closest('[data-nutrition-view="coach"], #save-weight-btn, .remove-weight-entry, #save-custom-weekly-rate, #reset-custom-weekly-rate')) {
        refreshSoon();
    }
});
window.addEventListener("levelup:nutrition-updated", refreshSoon);
