import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionMacroPreference,
    getNutritionPlan
}
from "../nutrition/nutrition-storage.js?v=dashboard-food-summary-1";
import { getActiveNutritionPhase } from "../nutrition/nutrition-phase.js?v=phase-tolerance-1";
import {
    entriesForDate,
    localDateKey,
    summarizeEntries
}
from "../nutrition/food-log-data.js?v=food-log-meals-v2";
import {
    calculateMacroTargets,
    poundsToKg
}
from "../nutrition/tdee-calculator.js?v=dashboard-food-summary-1";

const DISPLAY_MODE_KEY = "level_up_dashboard_calorie_display_v1";
let listenersBound = false;

export function initializeDashboardNutritionTargets() {
    renderDashboardNutritionSummary();
    if (listenersBound) return;
    listenersBound = true;
    window.addEventListener("levelup:nutrition-updated", renderDashboardNutritionSummary);
    window.addEventListener("levelup:nutrition-phase-updated", renderDashboardNutritionSummary);
    window.addEventListener("levelup:food-log-updated", renderDashboardNutritionSummary);
}

function validManualMacros(preference) {
    const macros = preference?.manualMacros;
    return preference?.useManual === true &&
        [macros?.protein, macros?.carbs, macros?.fat]
            .every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
}

function getDashboardMacros({ calories, profile, preference }) {
    if (validManualMacros(preference)) {
        return {
            protein: Math.round(Number(preference.manualMacros.protein)),
            carbs: Math.round(Number(preference.manualMacros.carbs)),
            fat: Math.round(Number(preference.manualMacros.fat))
        };
    }

    return calculateMacroTargets({
        calories,
        weightKg: poundsToKg(Number(profile.weightLb)),
        macroPreset: preference?.macroPreset || "balanced"
    });
}

function getDisplayMode() {
    return localStorage.getItem(DISPLAY_MODE_KEY) === "remaining" ? "remaining" : "consumed";
}

function setDisplayMode(mode) {
    localStorage.setItem(DISPLAY_MODE_KEY, mode === "remaining" ? "remaining" : "consumed");
}

function roundMacro(value) {
    const rounded = Math.round((Number(value) || 0) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function clampProgress(value, target) {
    if (!(Number(target) > 0)) return 0;
    return Math.min(100, Math.max(0, (Number(value) / Number(target)) * 100));
}

function macroMarkup(label, value, target) {
    const safeTarget = Math.max(0, Math.round(Number(target) || 0));
    const progress = clampProgress(value, safeTarget);
    return `
        <div class="dashboard-macro-progress dashboard-macro-progress--${label.toLowerCase()}">
            <span>${label}</span>
            <strong>${roundMacro(value)} g <small>/ ${safeTarget} g</small></strong>
            <i aria-hidden="true"><b style="width:${progress}%"></b></i>
        </div>
    `;
}

function calorieCopy({ mode, consumed, target }) {
    const difference = Math.round(target - consumed);
    if (mode === "remaining") {
        return difference >= 0
            ? { value: difference, label: `remaining · ${Math.round(consumed).toLocaleString()} consumed` }
            : { value: Math.abs(difference), label: `over goal · ${Math.round(consumed).toLocaleString()} consumed` };
    }
    return {
        value: Math.round(consumed),
        label: `consumed of ${Math.round(target).toLocaleString()}`
    };
}

function renderDashboardNutritionSummary() {
    const dashboard = document.querySelector(".dashboard");
    if (!dashboard) return;

    dashboard.querySelectorAll(".dashboard-nutrition-target-card, .dashboard-food-summary-card").forEach(card => card.remove());

    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const plan = getNutritionPlan();
    const phase = getActiveNutritionPhase();

    if (!profile || (!phase && !goal?.goalId) || Number(profile.age) < 18) return;

    const phaseCalories = Number(phase?.currentCalories ?? phase?.startCalories);
    const savedCalories = Number(plan.currentCalories ?? plan.calculatedCalories);
    const calories = Number.isFinite(phaseCalories) && phaseCalories > 0 ? phaseCalories : savedCalories;
    if (!Number.isFinite(calories) || calories <= 0) return;

    const macros = getDashboardMacros({
        calories,
        profile,
        preference: getNutritionMacroPreference()
    });
    if (!macros) return;

    const totals = summarizeEntries(entriesForDate(localDateKey()));
    const mode = getDisplayMode();
    const calorie = calorieCopy({ mode, consumed: totals.calories, target: calories });
    const progress = clampProgress(totals.calories, calories);
    const overTarget = Math.max(0, Number(totals.calories) - calories);
    const overProgress = calories > 0
        ? Math.min(100, (overTarget / calories) * 100)
        : 0;
    const overDashOffset = 100 - overProgress;
    const card = document.createElement("article");
    card.className = "dashboard-food-summary-card";
    card.innerHTML = `
        <div class="dashboard-food-summary-heading">
            <div><span class="eyebrow">TODAY'S NUTRITION</span><h3>Calories &amp; Macros</h3></div>
            <button type="button" data-dashboard-open-food-log aria-label="Open Food Log">Open <span aria-hidden="true">›</span></button>
        </div>
        <button class="dashboard-calorie-summary" type="button" data-dashboard-calorie-toggle aria-label="Show ${mode === "consumed" ? "calories remaining" : "calories consumed"}">
            <span class="dashboard-calorie-toggle-icon" aria-hidden="true">⇄</span>
            <svg viewBox="0 0 240 100" role="img" aria-label="${Math.round(progress)} percent of calorie target consumed${overTarget > 0 ? `, ${Math.round(overTarget)} calories over target` : ""}">
                <defs>
                    <pattern id="dashboard-calorie-overflow-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="6" height="6" fill="#ff2638"></rect>
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#80131d" stroke-width="2"></line>
                    </pattern>
                </defs>
                <path class="dashboard-calorie-arc-track" pathLength="100" d="M38 92 A82 82 0 0 1 202 92"></path>
                <path class="dashboard-calorie-arc-value" pathLength="100" stroke-dasharray="${progress} 100" d="M38 92 A82 82 0 0 1 202 92"></path>
                ${overProgress > 0 ? `
                    <path class="dashboard-calorie-arc-overflow" pathLength="100"
                        stroke-dasharray="${overProgress} ${100 - overProgress}"
                        stroke-dashoffset="${overDashOffset}"
                        d="M38 92 A82 82 0 0 1 202 92"></path>
                ` : ""}
            </svg>
            <span class="dashboard-calorie-copy">
                <strong>${Math.round(calorie.value).toLocaleString()} <small>cal</small></strong>
                <span>${calorie.label}</span>
            </span>
        </button>
        <div class="dashboard-macro-summary">
            ${macroMarkup("Carbs", totals.carbs, macros.carbs)}
            ${macroMarkup("Fat", totals.fat, macros.fat)}
            ${macroMarkup("Protein", totals.protein, macros.protein)}
        </div>
    `;

    dashboard.insertAdjacentElement("afterbegin", card);
    card.querySelector("[data-dashboard-calorie-toggle]")?.addEventListener("click", () => {
        setDisplayMode(mode === "consumed" ? "remaining" : "consumed");
        renderDashboardNutritionSummary();
    });
    card.querySelector("[data-dashboard-open-food-log]")?.addEventListener("click", () => {
        document.querySelector('.nav-btn[data-page="energy"]')?.click();
    });
}
