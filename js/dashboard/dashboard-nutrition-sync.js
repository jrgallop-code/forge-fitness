import {
    getNutritionProfile,
    getNutritionMacroPreference,
    getNutritionPlan
}
from "../nutrition/nutrition-storage.js?v=dashboard-active-plan-1";

import {
    calculateMacroTargets,
    poundsToKg
}
from "../nutrition/tdee-calculator.js?v=dashboard-active-plan-1";

function syncDashboardNutrition() {
    const dashboard = document.querySelector(".dashboard");
    if (!dashboard) return;

    const plan = getNutritionPlan();
    const calories = Number(plan.currentCalories);
    const profile = getNutritionProfile();

    if (!Number.isFinite(calories) || calories <= 0) return;

    const calorieCard = Array.from(
        dashboard.querySelectorAll(".dashboard-nutrition-target-card")
    ).find(card => /Daily Calorie Target/i.test(card.textContent || ""));

    if (calorieCard) {
        const value = calorieCard.querySelector("p");
        if (value) value.textContent = `${Math.round(calories)} kcal`;
        const source = calorieCard.querySelector("small");
        if (source) source.textContent = "Saved Target";
    }

    if (!profile || !Number.isFinite(Number(profile.weightLb))) return;

    const macroPreset = getNutritionMacroPreference()?.macroPreset || "balanced";
    const macros = calculateMacroTargets({
        calories,
        weightKg: poundsToKg(Number(profile.weightLb)),
        macroPreset
    });

    if (!macros) return;

    const proteinCard = Array.from(
        dashboard.querySelectorAll(".dashboard-nutrition-target-card")
    ).find(card => /Daily Protein Target/i.test(card.textContent || ""));

    if (proteinCard) {
        const value = proteinCard.querySelector("p");
        if (value) value.textContent = `${macros.protein} g`;
    }
}

function scheduleSync() {
    requestAnimationFrame(() => requestAnimationFrame(syncDashboardNutrition));
}

document.addEventListener("click", scheduleSync);
window.addEventListener("levelup:nutrition-updated", scheduleSync);
window.addEventListener("pageshow", scheduleSync);
window.addEventListener("load", scheduleSync);

const content = document.getElementById("content");
if (content) {
    new MutationObserver(scheduleSync).observe(content, {
        childList: true,
        subtree: true
    });
}
