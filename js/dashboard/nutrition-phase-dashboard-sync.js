import { getActiveNutritionPhase } from "../nutrition/nutrition-phase.js?v=phase-tolerance-1";
import { getNutritionMacroPreference } from "../nutrition/nutrition-storage.js?v=dashboard-manual-protein-1";

let refreshQueued = false;

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function findTargetCard(title) {
    return [...document.querySelectorAll(".dashboard-nutrition-target-card")]
        .find(node => node.querySelector("h3")?.textContent?.trim() === title);
}

function refreshDashboardTargets() {
    const phase = getActiveNutritionPhase();
    const calories = Number(phase?.currentCalories ?? phase?.startCalories);

    if (Number.isFinite(calories) && calories > 0) {
        const calorieCard = findTargetCard("Daily Calorie Target");
        if (calorieCard) {
            setText(calorieCard.querySelector("p"), `${Math.round(calories)} kcal`);
            setText(calorieCard.querySelector("small"), "Active Phase Target");
        }
    }

    const preference = getNutritionMacroPreference();
    const manualProtein = Number(preference?.manualMacros?.protein);
    if (preference?.useManual !== true || !Number.isFinite(manualProtein) || manualProtein < 0) {
        return;
    }

    const proteinCard = findTargetCard("Daily Protein Target");
    if (proteinCard) {
        setText(proteinCard.querySelector("p"), `${Math.round(manualProtein)} g`);
    }
}

function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
        refreshQueued = false;
        refreshDashboardTargets();
    });
}

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("load", scheduleRefresh);
document.addEventListener("click", scheduleRefresh, true);
scheduleRefresh();
