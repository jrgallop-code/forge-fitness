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
const COACH_TOLERANCE_LB_PER_WEEK = 0.20;
const MIN_ADJUSTMENT_KCAL = 100;
const MAX_ADJUSTMENT_KCAL = 200;

function refreshAdaptiveTrend() {
    const coach = document.querySelector('[data-planner-view="coach"]');
    if (!coach || coach.hidden) return;

    ensureDemoControls(coach);
    if (getActivePhase()) return;

    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const plan = getNutritionPlan();
    const preset = goal?.goalId ? GOAL_PRESETS[goal.goalId] : null;
    const trend = calculateWeightTrend(getWeightEntries());

    if (!isAdultProfile(profile) || !preset) return;

    const goalRate = getEffectiveWeeklyRate(goal.goalId);
    renderCoachState({
        trend,
        goalRate,
        currentCalories: plan.currentCalories,
        isDemo: false
    });
}

function renderCoachState({ trend, goalRate, currentCalories, isDemo }) {
    const actualRate = trend.weeklyChange;
    const actualElement = document.getElementById("coach-actual-rate");
    const actualHeading = actualElement?.closest(".metric-card")?.querySelector("h3");
    const confidence = document.getElementById("coach-confidence");
    const recommendation = document.getElementById("coach-recommendation");
    const suggestedText = document.getElementById("coach-suggested-calories");
    const applyButton = document.getElementById("apply-coach-recommendation");
    const goalElement = document.getElementById("coach-goal-rate");

    if (goalElement && Number.isFinite(goalRate)) goalElement.textContent = formatRate(goalRate);
    if (actualHeading) actualHeading.textContent = trend.label;
    if (actualElement) actualElement.textContent = Number.isFinite(actualRate) ? formatRate(actualRate) : "--";
    if (confidence) {
        const status = trend.status === "actual" ? "Established" : trend.status === "preliminary" ? "Preliminary" : "Insufficient";
        const suffix = isDemo ? " · DEMO" : "";
        confidence.textContent = `${status} · ${trend.windowEntries} weigh-ins / ${trend.windowDays} days${suffix}`;
    }

    if (trend.status !== "actual" || !Number.isFinite(actualRate)) {
        if (recommendation) recommendation.textContent = trend.status === "preliminary"
            ? `Your preliminary regression trend is ${formatRate(actualRate)}. Level Up shows the rate now, but waits for at least 14 calendar days and 7 valid weigh-ins before suggesting a calorie change.`
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
    if (Math.abs(difference) <= COACH_TOLERANCE_LB_PER_WEEK) {
        if (recommendation) recommendation.textContent = `On target. Your recent regression trend is ${formatRate(actualRate)} versus a goal of ${formatRate(goalRate)}. The difference is within the ±${COACH_TOLERANCE_LB_PER_WEEK.toFixed(2)} lb/week tolerance, so no calorie adjustment is suggested.`;
        if (suggestedText) suggestedText.textContent = "";
        hideApply(applyButton);
        return;
    }

    if (!Number.isFinite(currentCalories)) {
        if (recommendation) recommendation.textContent = "Your weight trend is established, but Level Up needs a current calorie target before it can calculate a practical adjustment.";
        if (suggestedText) suggestedText.textContent = "";
        hideApply(applyButton);
        return;
    }

    const direction = difference > 0 ? -1 : 1;
    const adjustment = calculateSuggestedAdjustment(difference);
    const suggested = Math.round(currentCalories + direction * adjustment);
    const actionText = direction < 0
        ? `reduce the current target by about ${adjustment} kcal/day`
        : `increase the current target by about ${adjustment} kcal/day`;

    if (recommendation) recommendation.textContent = `Your established trend is ${Math.abs(difference).toFixed(2)} lb/week away from your target. Based on that rate difference, consider whether you want to ${actionText}. Level Up limits each review to a practical 100–200 kcal/day change rather than making a large automatic correction.`;
    if (suggestedText) suggestedText.textContent = `Suggested target: ${suggested} kcal/day`;

    if (applyButton) {
        if (isDemo) {
            applyButton.hidden = true;
            applyButton.onclick = null;
        }
        else {
            applyButton.hidden = false;
            applyButton.onclick = () => {
                setCurrentCalories(suggested, "Adaptive Coach regression recommendation");
                window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
                if (recommendation) recommendation.textContent = "Recommendation applied. Your current calorie target has been updated.";
                hideApply(applyButton);
            };
        }
    }
}

function calculateSuggestedAdjustment(rateDifference) {
    const impliedDailyCalories = Math.abs(Number(rateDifference)) * 3500 / 7;
    const rounded = Math.round(impliedDailyCalories / 50) * 50;
    return Math.min(MAX_ADJUSTMENT_KCAL, Math.max(MIN_ADJUSTMENT_KCAL, rounded));
}

function ensureDemoControls(coach) {
    if (document.getElementById("adaptive-coach-demo-controls")) return;

    const recommendationCard = document.getElementById("coach-recommendation")?.closest(".goal-box");
    if (!recommendationCard) return;

    const controls = document.createElement("div");
    controls.id = "adaptive-coach-demo-controls";
    controls.className = "nutrition-target-actions";
    controls.innerHTML = `
        <button class="secondary-btn" type="button" data-coach-demo="on-target">Preview On Target</button>
        <button class="secondary-btn" type="button" data-coach-demo="too-slow">Preview Needs Change</button>
        <button class="secondary-btn" type="button" data-coach-demo="preliminary">Preview Preliminary</button>
        <button class="secondary-btn" type="button" data-coach-demo="live" hidden>Return to Live</button>
    `;
    recommendationCard.appendChild(controls);

    controls.addEventListener("click", event => {
        const button = event.target.closest("[data-coach-demo]");
        if (!button) return;
        const mode = button.dataset.coachDemo;
        if (mode === "live") {
            controls.querySelector('[data-coach-demo="live"]').hidden = true;
            window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
            refreshSoon();
            return;
        }

        controls.querySelector('[data-coach-demo="live"]').hidden = false;
        renderDemoScenario(mode);
    });
}

function renderDemoScenario(mode) {
    const currentCalories = Number(getNutritionPlan().currentCalories) || 2000;
    const goalRate = -1.00;

    const demos = {
        "on-target": {
            status: "actual",
            label: "Actual Weekly Change",
            weeklyChange: -0.92,
            windowEntries: 18,
            windowDays: 21
        },
        "too-slow": {
            status: "actual",
            label: "Actual Weekly Change",
            weeklyChange: -0.63,
            windowEntries: 18,
            windowDays: 21
        },
        preliminary: {
            status: "preliminary",
            label: "Preliminary Weekly Trend",
            weeklyChange: -0.74,
            windowEntries: 8,
            windowDays: 9
        }
    };

    renderCoachState({
        trend: demos[mode] || demos["on-target"],
        goalRate,
        currentCalories,
        isDemo: true
    });
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
