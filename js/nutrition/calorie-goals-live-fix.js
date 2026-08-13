import { initializeUnifiedGoalsCalories } from "./unified-goals-calories.js?v=nutrition-phase-1";
import { initializeNutritionPlanUI } from "./nutrition-plan-ui-v4.js?v=nutrition-phase-1";
import { initializePhaseGoalControls } from "./phase-goal-controls.js?v=phase-goal-controls-1";
import { initializeWeightProgressCompact } from "../progress/weight-progress-compact.js?v=weight-only-1";

let refreshScheduled = false;

function ensurePhaseStyles() {
    if (document.querySelector('link[data-nutrition-phase-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/unified-goals-calories.css?v=nutrition-phase-1";
    link.dataset.nutritionPhaseStyles = "1";
    document.head.appendChild(link);
}

function ensureNutritionPhaseUi() {
    const view = document.querySelector('[data-planner-view="goals"]');
    if (!view || view.dataset.nutritionPhaseFix === "1") return;
    document.getElementById("goal-check-in-card")?.remove();
    initializeUnifiedGoalsCalories();
    initializeNutritionPlanUI();
    view.dataset.nutritionPhaseFix = "1";
}

function ensureWeightOnlyUi() {
    if (!document.getElementById("weight-progress")) return;
    initializeWeightProgressCompact();
}

function refreshAllPhaseUi() {
    ensureNutritionPhaseUi();
    ensureWeightOnlyUi();
    initializePhaseGoalControls();
}

function scheduleRefresh() {
    if (refreshScheduled) return;
    refreshScheduled = true;
    ensurePhaseStyles();
    window.setTimeout(refreshAllPhaseUi, 0);
    window.setTimeout(() => {
        refreshAllPhaseUi();
        window.setTimeout(() => { refreshScheduled = false; }, 40);
    }, 120);
}

document.addEventListener("click", event => {
    const legacyWeightRedirect = event.target.closest("#unified-open-weight-goal");
    if (legacyWeightRedirect) {
        event.preventDefault();
        event.stopImmediatePropagation();
        refreshAllPhaseUi();
        return;
    }
    scheduleRefresh();
}, true);

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("load", scheduleRefresh);
scheduleRefresh();
