import { initializeUnifiedGoalsCalories } from "./unified-goals-calories.js?v=calorie-goal-presets-2";

function ensureCalorieGoalSelector() {
    const view = document.querySelector('[data-planner-view="goals"]');
    if (!view || view.dataset.calorieGoalPresetFix === "1") return;
    initializeUnifiedGoalsCalories();
    view.dataset.calorieGoalPresetFix = "1";
}

function scheduleRefresh() {
    window.setTimeout(ensureCalorieGoalSelector, 0);
    window.setTimeout(ensureCalorieGoalSelector, 120);
}

document.addEventListener("click", event => {
    const legacyWeightRedirect = event.target.closest("#unified-open-weight-goal");
    if (legacyWeightRedirect) {
        event.preventDefault();
        event.stopImmediatePropagation();
        ensureCalorieGoalSelector();
        return;
    }
    scheduleRefresh();
}, true);

window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("load", scheduleRefresh);
scheduleRefresh();
