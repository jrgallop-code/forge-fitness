import { calculateMacroTargets, poundsToKg } from "./tdee-calculator.js?v=current-goal-1";
import { getNutritionProfile, getNutritionMacroPreference, getNutritionPlan, setCurrentCalories } from "./nutrition-storage.js?v=current-goal-1";
import { getCurrentGoal, getCurrentGoalMetrics } from "../core/current-goal.js?v=current-goal-1";

const MIN_ADJUSTMENT_KCAL = 100;
const MAX_ADJUSTMENT_KCAL = 200;

export function initializeNutritionPlanUI() {
    removeLegacyPlanUI();
    ensureGoalCheckInUI();
    refreshNutritionPlanUI();

    window.addEventListener("levelup:nutrition-updated", refreshNutritionPlanUI);
    window.addEventListener("levelup:current-goal-updated", refreshNutritionPlanUI);
    document.getElementById("save-nutrition-profile-btn")?.addEventListener("click", () => window.setTimeout(refreshNutritionPlanUI, 30));
}

function removeLegacyPlanUI() {
    document.getElementById("active-calorie-target-card")?.remove();
    document.querySelector('[data-nutrition-view="coach"]')?.remove();
    document.querySelector('[data-planner-view="coach"]')?.remove();
}

function ensureGoalCheckInUI() {
    const goalsView = document.querySelector('[data-planner-view="goals"]');
    if (!goalsView || document.getElementById("goal-check-in-card")) return;
    goalsView.insertAdjacentHTML("beforeend", `
        <article id="goal-check-in-card" class="goal-box nutrition-goal-card goal-check-in-card">
            <span class="eyebrow">GOAL CHECK-IN</span>
            <div class="goal-check-in-heading">
                <h3 id="goal-check-in-status">CALIBRATING</h3>
                <small id="goal-check-in-confidence"></small>
            </div>
            <p id="goal-check-in-message" class="nutrition-message">Set a Current Goal and log weight consistently to begin.</p>
            <strong id="goal-check-in-suggested"></strong>
            <div class="nutrition-target-actions">
                <button id="goal-check-in-apply" class="primary-btn" type="button" hidden>Apply Suggested Target</button>
                <button id="goal-check-in-keep" class="secondary-btn" type="button">Keep Current Target</button>
            </div>
        </article>
    `);
    document.getElementById("goal-check-in-keep")?.addEventListener("click", () => {
        const plan = getNutritionPlan();
        setText("goal-check-in-message", Number.isFinite(plan.currentCalories) ? `Keep calories at ${plan.currentCalories} kcal/day.` : "No calorie target is saved yet.");
        hideApply();
    });
}

function refreshNutritionPlanUI() {
    removeLegacyPlanUI();
    ensureGoalCheckInUI();
    const profile = getNutritionProfile();
    const plan = getNutritionPlan();
    refreshMacrosFromCurrentTarget(profile, plan);
    refreshGoalCheckIn(plan);
}

function refreshMacrosFromCurrentTarget(profile, plan) {
    if (!isAdultProfile(profile) || !Number.isFinite(plan.currentCalories)) return;
    const macroPreference = getNutritionMacroPreference()?.macroPreset || "balanced";
    const weightLb = Number(profile.weightLb);
    if (!Number.isFinite(weightLb) || weightLb <= 0) return;
    const macros = calculateMacroTargets({
        calories: plan.currentCalories,
        weightKg: poundsToKg(weightLb),
        macroPreset: macroPreference
    });
    if (!macros) return;
    setText("nutrition-protein-target", `${macros.protein} g/day`);
    setText("nutrition-carb-target", `${macros.carbs} g/day`);
    setText("nutrition-fat-target", `${macros.fat} g/day`);
    setText("nutrition-macro-calories", `${macros.calories} kcal/day`);
    setText("planner-summary-calories", `${plan.currentCalories} kcal`);
    setText("planner-summary-protein", `${macros.protein} g`);
}

function refreshGoalCheckIn(plan) {
    const goal = getCurrentGoal();
    if (!goal) {
        setText("goal-check-in-status", "NO CURRENT GOAL");
        setText("goal-check-in-confidence", "");
        setText("goal-check-in-message", "Set your bodyweight goal in Progress → Weight first.");
        setText("goal-check-in-suggested", "");
        hideApply();
        return;
    }

    const metrics = getCurrentGoalMetrics(goal);
    const trend = metrics.phaseTrend;
    setText("goal-check-in-status", metrics.status);

    const confidence = trend?.status === "actual"
        ? `Established · ${trend.windowEntries} weigh-ins / ${trend.windowDays} days`
        : trend?.status === "preliminary"
            ? `Preliminary · ${trend.windowEntries} weigh-ins / ${trend.windowDays} days`
            : "Collecting current-goal data";
    setText("goal-check-in-confidence", confidence);

    if (metrics.goalReached) {
        setText("goal-check-in-message", "Goal reached. Start a new goal or maintain this weight from Progress → Weight.");
        setText("goal-check-in-suggested", "");
        hideApply();
        return;
    }

    if (trend?.status !== "actual" || !Number.isFinite(metrics.actualRatePctPerWeek)) {
        const preliminary = Number.isFinite(metrics.actualRatePctPerWeek)
            ? ` Your preliminary trend is ${formatPct(metrics.actualRatePctPerWeek)}.`
            : "";
        setText("goal-check-in-message", `Level Up waits for an established current-goal trend before suggesting a calorie change.${preliminary}`);
        setText("goal-check-in-suggested", "");
        hideApply();
        return;
    }

    const targetPct = Number(metrics.targetRatePctPerWeek);
    const actualPct = Number(metrics.actualRatePctPerWeek);
    const currentCalories = Number(plan.currentCalories);
    const targetLabel = goal.type === "maintenance" ? "a stable target" : formatPct(targetPct);

    if (["ON TRACK", "MAINTAINING"].includes(metrics.status)) {
        setText("goal-check-in-message", `Your weight trend is ${formatPct(actualPct)} against ${targetLabel}. ${Number.isFinite(currentCalories) ? `Keep calories at ${currentCalories} kcal/day.` : "Save a calorie target when you're ready."}`);
        setText("goal-check-in-suggested", "");
        hideApply();
        return;
    }

    if (!Number.isFinite(currentCalories)) {
        setText("goal-check-in-message", `Your weight trend is ${formatPct(actualPct)} against ${targetLabel}. Save a calorie target first so Level Up can suggest a measured adjustment if needed.`);
        setText("goal-check-in-suggested", "");
        hideApply();
        return;
    }

    const actualLb = Number(metrics.actualRateLbPerWeek);
    const targetLb = Number(metrics.targetRateLbPerWeek);
    if (!Number.isFinite(actualLb) || !Number.isFinite(targetLb)) {
        hideApply();
        return;
    }

    const difference = actualLb - targetLb;
    const direction = difference > 0 ? -1 : 1;
    const adjustment = calculateSuggestedAdjustment(difference);
    const suggested = Math.max(1, Math.round(currentCalories + (direction * adjustment)));
    const paceWord = describePace(metrics.status);

    setText("goal-check-in-message", `Your weight trend is ${formatPct(actualPct)} against ${targetLabel}${paceWord ? ` and is ${paceWord}` : ""}. Level Up does not react to individual weigh-ins and does not use catch-up logic.`);
    setText("goal-check-in-suggested", `Suggested calorie target: ${suggested} kcal/day`);

    const apply = document.getElementById("goal-check-in-apply");
    if (apply) {
        apply.hidden = false;
        apply.textContent = `Apply ${suggested}`;
        apply.onclick = () => {
            setCurrentCalories(suggested, "Current Goal check-in recommendation");
            setText("goal-check-in-message", `Applied. Your calorie target is now ${suggested} kcal/day.`);
            setText("goal-check-in-suggested", "");
            hideApply();
        };
    }
}

function calculateSuggestedAdjustment(diffLbPerWeek) {
    const implied = Math.abs(Number(diffLbPerWeek)) * 3500 / 7;
    const rounded = Math.round(implied / 50) * 50;
    return Math.min(MAX_ADJUSTMENT_KCAL, Math.max(MIN_ADJUSTMENT_KCAL, rounded || MIN_ADJUSTMENT_KCAL));
}

function describePace(status) {
    if (status === "SLIGHTLY SLOWER THAN TARGET") return "slightly slower than planned";
    if (status === "SLIGHTLY FASTER THAN TARGET") return "slightly faster than planned";
    if (status === "TRENDING ABOVE TARGET") return "above the maintenance target";
    if (status === "TRENDING BELOW TARGET") return "below the maintenance target";
    if (status === "TREND NEEDS ATTENTION") return "far enough from target to review";
    return "";
}

function formatPct(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (Math.abs(number) < 0.005) return "0.00% / week";
    return `${number > 0 ? "+" : "−"}${Math.abs(number).toFixed(2)}% / week`;
}

function hideApply() {
    const button = document.getElementById("goal-check-in-apply");
    if (button) {
        button.hidden = true;
        button.onclick = null;
    }
}

function isAdultProfile(profile) {
    return Boolean(profile && Number.isFinite(Number(profile.age)) && Number(profile.age) >= 18);
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}
