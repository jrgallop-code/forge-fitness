import { initializeUnifiedGoalsCalories } from "./unified-goals-calories.js?v=nutrition-phase-1";
import { initializeNutritionPlanUI } from "./nutrition-plan-ui-v4.js?v=nutrition-phase-1";
import { initializeWeightProgressCompact } from "../progress/weight-progress-compact.js?v=weight-only-1";

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

function scheduleRefresh() {
    ensurePhaseStyles();
    window.setTimeout(() => { ensureNutritionPhaseUi(); ensureWeightOnlyUi(); }, 0);
    window.setTimeout(() => { ensureNutritionPhaseUi(); ensureWeightOnlyUi(); }, 120);
}

document.addEventListener("click", event => {
    const legacyWeightRedirect = event.target.closest("#unified-open-weight-goal");
    if (legacyWeightRedirect) {
        event.preventDefault();
        event.stopImmediatePropagation();
        ensureNutritionPhaseUi();
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
