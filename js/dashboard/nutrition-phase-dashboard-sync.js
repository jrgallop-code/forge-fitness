import { getActiveNutritionPhase } from "../nutrition/nutrition-phase.js?v=phase-tolerance-1";

let refreshQueued = false;

function refreshDashboardCalories() {
    const phase = getActiveNutritionPhase();
    const calories = Number(phase?.currentCalories ?? phase?.startCalories);
    if (!Number.isFinite(calories) || calories <= 0) return;

    const card = [...document.querySelectorAll(".dashboard-nutrition-target-card")]
        .find(node => node.querySelector("h3")?.textContent?.trim() === "Daily Calorie Target");
    if (!card) return;

    setText(card.querySelector("p"), `${Math.round(calories)} kcal`);
    setText(card.querySelector("small"), "Active Phase Target");
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
        refreshQueued = false;
        refreshDashboardCalories();
    });
}

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("load", scheduleRefresh);
document.addEventListener("click", scheduleRefresh, true);
scheduleRefresh();
