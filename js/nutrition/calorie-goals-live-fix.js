import { initializeUnifiedGoalsCalories } from "./unified-goals-calories.js?v=nutrition-phase-1";
import { initializeNutritionPlanUI } from "./nutrition-plan-ui-v4.js?v=phase-tolerance-1";
import { initializePhaseGoalControls } from "./phase-goal-controls.js?v=phase-goal-controls-1";
import { getActiveNutritionPhase } from "./nutrition-phase.js?v=phase-tolerance-1";
import { initializeWeightProgressCompact } from "../progress/weight-progress-compact.js?v=weight-only-1";
import "./phase-rate-display.js?v=phase-goal-rate-1";
import "./phase-test-data.js?v=phase-test-scenarios-1";

let refreshScheduled = false;
let draftGoalId = null;
let draftStartDate = null;
let draftGoalWeight = null;
let saveRequested = false;

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

function applyPhaseDraft() {
    const selected = document.getElementById("unified-goal-select")?.value;
    if (!selected || selected !== draftGoalId) return;
    const startInput = document.getElementById("nutrition-phase-start-date");
    const goalWeightInput = document.getElementById("nutrition-phase-goal-weight");
    if (startInput && draftStartDate) startInput.value = draftStartDate;
    if (goalWeightInput && draftGoalWeight !== null) goalWeightInput.value = draftGoalWeight;
}

function refreshAllPhaseUi() {
    ensureNutritionPhaseUi();
    ensureWeightOnlyUi();
    initializePhaseGoalControls();
    applyPhaseDraft();
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

document.addEventListener("change", event => {
    if (event.target?.id === "unified-goal-select") {
        const active = getActiveNutritionPhase();
        draftGoalId = event.target.value;
        draftStartDate = draftGoalId === active?.goalId ? active.startDate : today();
        window.setTimeout(applyPhaseDraft, 0);
    } else if (event.target?.id === "nutrition-phase-start-date") {
        draftGoalId = document.getElementById("unified-goal-select")?.value || draftGoalId;
        draftStartDate = event.target.value;
    }
}, true);

document.addEventListener("input", event => {
    if (event.target?.id === "nutrition-phase-start-date") {
        draftGoalId = document.getElementById("unified-goal-select")?.value || draftGoalId;
        draftStartDate = event.target.value;
    } else if (event.target?.id === "nutrition-phase-goal-weight") {
        draftGoalId = document.getElementById("unified-goal-select")?.value || draftGoalId;
        draftGoalWeight = event.target.value;
    }
}, true);

document.addEventListener("click", event => {
    const legacyWeightRedirect = event.target.closest("#unified-open-weight-goal");
    if (legacyWeightRedirect) {
        event.preventDefault();
        event.stopImmediatePropagation();
        refreshAllPhaseUi();
        return;
    }
    if (event.target.closest("#unified-save-plan")) saveRequested = true;
    scheduleRefresh();
}, true);

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", () => {
    if (saveRequested) {
        draftGoalId = null;
        draftStartDate = null;
        draftGoalWeight = null;
        saveRequested = false;
    }
    scheduleRefresh();
});
window.addEventListener("load", scheduleRefresh);
scheduleRefresh();

function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
