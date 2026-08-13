import { initializeUnifiedGoalsCalories } from "./unified-goals-calories.js?v=calorie-goal-presets-2";
import { initializeWeightProgressCompact } from "../progress/weight-progress-compact.js?v=weight-only-1";

function ensureCalorieGoalSelector() {
    const view = document.querySelector('[data-planner-view="goals"]');
    if (!view || view.dataset.calorieGoalPresetFix === "1") return;
    initializeUnifiedGoalsCalories();
    view.dataset.calorieGoalPresetFix = "1";
}

function ensureWeightOnlyUi() {
    if (!document.getElementById("weight-progress")) return;
    initializeWeightProgressCompact();
}

function scheduleRefresh() {
    window.setTimeout(() => {
        ensureCalorieGoalSelector();
        ensureWeightOnlyUi();
    }, 0);
    window.setTimeout(() => {
        ensureCalorieGoalSelector();
        ensureWeightOnlyUi();
    }, 120);
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

const content = document.getElementById("content");
if (content) {
    new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
}

window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("load", scheduleRefresh);
scheduleRefresh();
