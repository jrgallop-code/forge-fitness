import { initializeUnifiedGoalsCalories } from "./unified-goals-calories.js?v=nutrition-phase-1";
import { initializeNutritionPlanUI } from "./nutrition-plan-ui-v4.js?v=phase-calorie-gap-1";
import { initializePhaseGoalControls } from "./phase-goal-controls.js?v=phase-goal-controls-1";
import { getActiveNutritionPhase, getActivePhaseMetrics } from "./nutrition-phase.js?v=phase-tolerance-1";
import { initializeWeightProgressCompact } from "../progress/weight-progress-compact.js?v=weight-only-1";
import "./phase-rate-display.js?v=phase-goal-rate-1";

const FULL_GAP_INCREMENT = 50;
const FIRST_STEP_INCREMENT = 25;
const RETIRED_TEST_KEYS = { backupWeights: "level_up_test_backup_weights", backupPhases: "level_up_test_backup_phases", active: "level_up_phase_test_active", mode: "level_up_phase_test_mode" };
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
let refreshScheduled = false;
let draftGoalId = null;
let draftStartDate = null;
let draftGoalWeight = null;
let saveRequested = false;

function parseArrayText(value) {
    if (value === null) return null;
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : null; }
    catch { return null; }
}

function cleanupRetiredPhaseTestData() {
    const backupWeights = parseArrayText(localStorage.getItem(RETIRED_TEST_KEYS.backupWeights));
    const backupPhases = parseArrayText(localStorage.getItem(RETIRED_TEST_KEYS.backupPhases));
    const currentWeights = parseArrayText(localStorage.getItem(WEIGHT_KEY)) || [];
    const testWasActive = localStorage.getItem(RETIRED_TEST_KEYS.active) === "1";
    const hasSyntheticWeights = currentWeights.some(entry => String(entry?.source || "").startsWith("phase-test-data"));
    const shouldRestore = testWasActive || hasSyntheticWeights;
    if (shouldRestore && backupWeights) localStorage.setItem(WEIGHT_KEY, JSON.stringify(backupWeights));
    else if (hasSyntheticWeights) localStorage.setItem(WEIGHT_KEY, JSON.stringify(currentWeights.filter(entry => !String(entry?.source || "").startsWith("phase-test-data"))));
    if (shouldRestore && backupPhases) localStorage.setItem(PHASES_KEY, JSON.stringify(backupPhases));
    Object.values(RETIRED_TEST_KEYS).forEach(key => localStorage.removeItem(key));
    document.getElementById("phase-test-data-box")?.remove();
}
cleanupRetiredPhaseTestData();

function ensurePhaseStyles() {
    if (!document.querySelector('link[data-nutrition-phase-styles]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "css/unified-goals-calories.css?v=nutrition-phase-1";
        link.dataset.nutritionPhaseStyles = "1";
        document.head.appendChild(link);
    }
    if (document.getElementById("phase-calorie-card-styles")) return;
    const style = document.createElement("style");
    style.id = "phase-calorie-card-styles";
    style.textContent = `
        #nutrition-current-phase{padding:10px;gap:6px}
        #nutrition-current-phase .nutrition-current-phase-grid{gap:6px}
        #nutrition-current-phase .nutrition-current-phase-grid>div{padding:6px 7px;gap:2px}
        #nutrition-current-phase .nutrition-current-phase-grid span{font-size:9px}
        #nutrition-current-phase .nutrition-current-phase-grid strong{font-size:12px;line-height:1.2}
        #nutrition-current-phase .nutrition-current-phase-grid small{color:var(--muted,#a1a1aa);font-size:9px;line-height:1.25}
        #nutrition-current-phase .nutrition-current-phase-head strong{font-size:13px}
        #nutrition-current-phase .nutrition-current-phase-head b{font-size:9px;padding:4px 6px}
        #nutrition-current-phase .phase-calorie-suggestion-card{grid-column:1/-1}
        #weight-progress .weight-summary{gap:7px}
        #weight-progress .weight-summary .metric-card{min-height:76px;padding:10px}
        #weight-progress .weight-summary .metric-card h3{font-size:10px;line-height:1.2}
        #weight-progress .weight-summary .metric-card p{font-size:16px;line-height:1.12;margin-top:5px}
        #weight-progress #weight-current-phase{font-size:13px;line-height:1.18}
        #weight-progress .weight-calorie-suggestion-card{grid-column:1/-1;min-height:68px}
        #weight-progress .weight-calorie-suggestion-card small{display:block;margin-top:3px;color:var(--muted,#a1a1aa);font-size:10px;line-height:1.25}
        #weight-progress .weight-calorie-suggestion-card p{font-size:16px}
        @media(max-width:390px){
            #nutrition-current-phase .nutrition-current-phase-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
            #nutrition-current-phase .nutrition-current-phase-grid strong{font-size:11px}
            #weight-progress .weight-summary .metric-card{padding:9px;min-height:72px}
            #weight-progress .weight-summary .metric-card p{font-size:15px}
            #weight-progress #weight-current-phase{font-size:12px}
        }
    `;
    document.head.appendChild(style);
}

function ensureNutritionPhaseUi() {
    const view = document.querySelector('[data-planner-view="goals"]');
    if (!view || view.dataset.nutritionPhaseFix === "1") return;
    document.getElementById("goal-check-in-card")?.remove();
    initializeUnifiedGoalsCalories();
    initializeNutritionPlanUI();
    view.dataset.nutritionPhaseFix = "1";
}
function ensureWeightOnlyUi() { if (document.getElementById("weight-progress")) initializeWeightProgressCompact(); }
function applyPhaseDraft() {
    const selected = document.getElementById("unified-goal-select")?.value;
    if (!selected || selected !== draftGoalId) return;
    const startInput = document.getElementById("nutrition-phase-start-date");
    const goalWeightInput = document.getElementById("nutrition-phase-goal-weight");
    if (startInput && draftStartDate) startInput.value = draftStartDate;
    if (goalWeightInput && draftGoalWeight !== null) goalWeightInput.value = draftGoalWeight;
}
function getCalorieSuggestion() {
    const phase = getActiveNutritionPhase();
    if (!phase) return { primary: "No active phase", secondary: "" };
    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);
    const metrics = getActivePhaseMetrics(phase);
    if (!Number.isFinite(currentCalories)) return { primary: "No calorie target", secondary: "" };
    if (["ON TRACK", "MAINTAINING"].includes(metrics.status)) return { primary: `${Math.round(currentCalories)} kcal/day`, secondary: "On track · keep current" };
    if (metrics.status === "NEED MORE PHASE DATA") return { primary: `${Math.round(currentCalories)} kcal/day`, secondary: "Need more phase data before adjusting" };
    if (metrics.status === "PRELIMINARY" || !metrics.recommendationReady) return { primary: `${Math.round(currentCalories)} kcal/day`, secondary: "Wait for the full 21-day trend" };
    const actual = Number(metrics.actualRateLbPerWeek);
    const target = Number(metrics.targetRateLbPerWeek);
    if (!Number.isFinite(actual) || !Number.isFinite(target)) return { primary: `${Math.round(currentCalories)} kcal/day`, secondary: "Need more phase data before adjusting" };
    const rawGap = (target - actual) * 500;
    let fullGap = Math.round(rawGap / FULL_GAP_INCREMENT) * FULL_GAP_INCREMENT;
    if (fullGap === 0 && Math.abs(rawGap) > 0.001) fullGap = Math.sign(rawGap) * FULL_GAP_INCREMENT;
    const estimatedTarget = Math.max(1, Math.round(currentCalories + fullGap));
    let firstStep = Math.round((fullGap * 0.5) / FIRST_STEP_INCREMENT) * FIRST_STEP_INCREMENT;
    if (firstStep === 0 && fullGap !== 0) firstStep = Math.sign(fullGap) * FIRST_STEP_INCREMENT;
    const firstStepTarget = Math.max(1, Math.round(currentCalories + firstStep));
    return { primary: `${estimatedTarget} kcal/day`, secondary: `Estimated gap ${formatSignedCalories(fullGap)} · First step ${formatSignedCalories(firstStep)} → ${firstStepTarget} kcal/day` };
}
function formatSignedCalories(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (Math.abs(number) < 0.5) return "0";
    return `${number > 0 ? "+" : "−"}${Math.abs(Math.round(number))}`;
}
function setNodeText(node, value) { if (node && node.textContent !== value) node.textContent = value; }
function refreshCalorieSuggestionCards() {
    const suggestion = getCalorieSuggestion();
    const phaseGrid = document.querySelector("#nutrition-current-phase .nutrition-current-phase-grid");
    if (phaseGrid) {
        let card = phaseGrid.querySelector("[data-phase-calorie-suggestion]");
        if (!card) {
            card = document.createElement("div");
            card.dataset.phaseCalorieSuggestion = "1";
            card.className = "phase-calorie-suggestion-card";
            card.innerHTML = "<span>Suggested Calories</span><strong></strong><small></small>";
            phaseGrid.appendChild(card);
        }
        const currentCaloriesCell = [...phaseGrid.children].find(cell => cell.querySelector("span")?.textContent?.trim() === "Current Calories");
        if (currentCaloriesCell && currentCaloriesCell.nextElementSibling !== card) currentCaloriesCell.insertAdjacentElement("afterend", card);
        setNodeText(card.querySelector("strong"), suggestion.primary);
        setNodeText(card.querySelector("small"), suggestion.secondary);
    }
    const summary = document.querySelector("#weight-progress .weight-summary");
    if (summary) {
        let card = document.getElementById("weight-calorie-suggestion-card");
        if (!card) {
            card = document.createElement("div");
            card.id = "weight-calorie-suggestion-card";
            card.className = "metric-card weight-calorie-suggestion-card";
            card.innerHTML = `<div><h3>Suggested Calories</h3><p id="weight-calorie-suggestion"></p><small id="weight-calorie-suggestion-total"></small></div>`;
            summary.appendChild(card);
        }
        setNodeText(document.getElementById("weight-calorie-suggestion"), suggestion.primary);
        setNodeText(document.getElementById("weight-calorie-suggestion-total"), suggestion.secondary);
    }
}
function refreshAllPhaseUi() {
    ensureNutritionPhaseUi();
    ensureWeightOnlyUi();
    initializePhaseGoalControls();
    applyPhaseDraft();
    refreshCalorieSuggestionCards();
}
function scheduleRefresh() {
    if (window.__levelUpPhaseInlineEditing === true) return;
    if (refreshScheduled) return;
    refreshScheduled = true;
    ensurePhaseStyles();
    window.setTimeout(refreshAllPhaseUi, 0);
    window.setTimeout(() => { refreshAllPhaseUi(); window.setTimeout(() => { refreshScheduled = false; }, 40); }, 120);
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
    if (event.target?.closest?.("#edit-current-phase-details, #cancel-phase-details-edit, #save-phase-details-edit, #phase-inline-start-date, #phase-inline-goal-weight")) return;
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
