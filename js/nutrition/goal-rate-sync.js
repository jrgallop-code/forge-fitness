import { GOAL_PRESETS } from "./tdee-calculator.js?v=manual-goals-1";
import { getNutritionGoal } from "./nutrition-storage.js?v=manual-goals-1";

const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";
const CUSTOM_WEEKLY_RATE_GOAL_KEY = "level_up_custom_weekly_rate_goal_id";
const LAST_GOAL_KEY = "level_up_last_goal_for_weekly_rate";

function getPresetRate(goalId) {
    const preset = goalId ? GOAL_PRESETS[goalId] : null;
    if (!preset) return null;

    const direct = Number(preset.weeklyWeightChangeLb ?? preset.weeklyChangeLb);
    if (Number.isFinite(direct)) return direct;

    const adjustment = Number(preset.dailyCalorieAdjustment);
    return Number.isFinite(adjustment) ? (adjustment * 7) / 3500 : null;
}

function syncWeeklyRateToGoal() {
    const goalId = getNutritionGoal()?.goalId || "";
    if (!goalId) return;

    const previousGoalId = localStorage.getItem(LAST_GOAL_KEY) || "";
    const customRaw = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);
    const customRate = customRaw === null || customRaw === "" ? null : Number(customRaw);
    const customGoalId = localStorage.getItem(CUSTOM_WEEKLY_RATE_GOAL_KEY) || "";
    const presetRate = getPresetRate(goalId);

    const goalChanged = Boolean(previousGoalId && previousGoalId !== goalId);
    const customBelongsToDifferentGoal = Boolean(customGoalId && customGoalId !== goalId);
    const legacyCustomOpposesGoal = !customGoalId && Number.isFinite(customRate) && Number.isFinite(presetRate) && Math.sign(customRate) !== 0 && Math.sign(presetRate) !== 0 && Math.sign(customRate) !== Math.sign(presetRate);

    if (goalChanged || customBelongsToDifferentGoal || legacyCustomOpposesGoal) {
        localStorage.removeItem(CUSTOM_WEEKLY_RATE_KEY);
        localStorage.removeItem(CUSTOM_WEEKLY_RATE_GOAL_KEY);
    }
    else if (Number.isFinite(customRate) && !customGoalId) {
        localStorage.setItem(CUSTOM_WEEKLY_RATE_GOAL_KEY, goalId);
    }

    localStorage.setItem(LAST_GOAL_KEY, goalId);
}

syncWeeklyRateToGoal();

window.addEventListener("levelup:nutrition-updated", () => {
    const before = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);
    syncWeeklyRateToGoal();
    const after = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);

    if (before !== after) {
        queueMicrotask(() => window.dispatchEvent(new CustomEvent("levelup:nutrition-rate-synced")));
    }
});
