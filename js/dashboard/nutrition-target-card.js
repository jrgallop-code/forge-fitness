import {
    getNutritionProfile,
    getNutritionGoal,
    getNutritionMacroPreference,
    getNutritionPlan
}
from "../nutrition/nutrition-storage.js?v=single-calorie-target-1";
import { getActiveNutritionPhase } from "../nutrition/nutrition-phase.js?v=phase-tolerance-1";

import {
    calculateMacroTargets,
    poundsToKg
}
from "../nutrition/tdee-calculator.js?v=single-calorie-target-1";

let listenersBound = false;

const CALORIE_ICON = `
    <svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.6 2.4c.3 2.4-.5 4.1-2 5.6-1.3 1.2-2.2 2.4-2.1 4.1 0 .9.4 1.6 1 2.2-.1-2.1 1.1-3.4 2.6-4.6.3 1.7 1.4 2.7 2.3 3.8.8 1 1.2 2 1.1 3.3-.1 2.7-2.1 4.8-4.9 4.8-3.3 0-5.7-2.4-5.7-5.8 0-3.4 1.9-5.5 4-7.6 1.9-1.8 3.2-3.3 3.7-5.8Z"/>
    </svg>
`;

const PROTEIN_ICON = `
    <svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.7 3.7c-2.6-.9-5.5-.1-7.4 1.9L5.4 8.5c-2.6 2.6-2.6 6.8 0 9.4 2.6 2.6 6.8 2.6 9.4 0l2.9-2.9c2-2 2.7-4.9 1.8-7.5-.5-1.5-1.5-2.7-3.8-3.8Zm-4.2 4.1a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z"/>
        <circle cx="11.5" cy="10.6" r="1.4" fill="#111115"/>
    </svg>
`;

export function initializeDashboardNutritionTargets() {
    renderDashboardNutritionTargets();
    if (listenersBound) return;
    listenersBound = true;
    window.addEventListener("levelup:nutrition-updated", renderDashboardNutritionTargets);
    window.addEventListener("levelup:nutrition-phase-updated", renderDashboardNutritionTargets);
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

function renderDashboardNutritionTargets() {
    const dashboard = document.querySelector(".dashboard");
    if (!dashboard) return;

    dashboard.querySelectorAll(".dashboard-nutrition-target-card").forEach(card => card.remove());

    const profile = getNutritionProfile();
    const goal = getNutritionGoal();
    const plan = getNutritionPlan();
    const phase = getActiveNutritionPhase();

    if (!profile || (!phase && !goal?.goalId) || Number(profile.age) < 18) return;

    const phaseCalories = Number(phase?.currentCalories ?? phase?.startCalories);
    const savedCalories = Number(plan.currentCalories ?? plan.calculatedCalories);
    const calories = Number.isFinite(phaseCalories) && phaseCalories > 0 ? phaseCalories : savedCalories;
    if (!Number.isFinite(calories) || calories <= 0) return;

    const macroPreference = getNutritionMacroPreference();
    const macros = getDashboardMacros({ calories, profile, preference: macroPreference });

    const calorieCard = `
        <div class="metric-card dashboard-nutrition-target-card">
            <div class="metric-icon">${CALORIE_ICON}</div>
            <div>
                <h3>Daily Calorie Target</h3>
                <p>${Math.round(calories)} kcal</p>
                <small>${phase ? "Active Phase Target" : "Saved Calorie Target"}</small>
            </div>
        </div>
    `;

    const proteinCard = macros
        ? `
            <div class="metric-card dashboard-nutrition-target-card">
                <div class="metric-icon">${PROTEIN_ICON}</div>
                <div>
                    <h3>Daily Protein Target</h3>
                    <p>${macros.protein} g</p>
                </div>
            </div>
        `
        : "";

    dashboard.insertAdjacentHTML("afterbegin", calorieCard + proteinCard);
}
