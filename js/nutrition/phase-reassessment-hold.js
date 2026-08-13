import { getActiveNutritionPhase } from "./nutrition-phase.js?v=phase-tolerance-1";

const REASSESSMENT_DAYS = 21;
let refreshQueued = false;

function getHold() {
    const phase = getActiveNutritionPhase();
    const adjustments = Array.isArray(phase?.adjustments) ? phase.adjustments : [];
    const latest = [...adjustments].reverse().find(item => item?.date && Number(item?.newCalories) > 0);
    if (!phase || !latest) return null;

    const time = new Date(latest.date).getTime();
    if (!Number.isFinite(time)) return null;
    const daysElapsed = Math.max(0, Math.floor((Date.now() - time) / 86400000));
    if (daysElapsed >= REASSESSMENT_DAYS) return null;

    const calories = Number(phase.currentCalories ?? phase.startCalories);
    if (!Number.isFinite(calories) || calories <= 0) return null;
    return { calories: Math.round(calories), daysRemaining: REASSESSMENT_DAYS - daysElapsed };
}

function refresh() {
    const hold = getHold();
    if (!hold) return;
    const copy = `First step applied · reassess in ${hold.daysRemaining} day${hold.daysRemaining === 1 ? "" : "s"}`;

    const nutritionCard = document.querySelector("[data-phase-calorie-suggestion]");
    setText(nutritionCard?.querySelector("strong"), `${hold.calories} kcal/day`);
    setText(nutritionCard?.querySelector("small"), copy);

    setText(document.getElementById("weight-calorie-suggestion"), `${hold.calories} kcal/day`);
    setText(document.getElementById("weight-calorie-suggestion-total"), copy);

    const checkIn = document.getElementById("goal-check-in-card");
    if (checkIn) {
        setText(document.getElementById("goal-check-in-message"), "Hold the current calorie target long enough to measure the response before making another adjustment.");
        setText(document.getElementById("goal-check-in-suggested"), `Current target: ${hold.calories} kcal/day · ${copy}.`);
        const apply = document.getElementById("goal-check-in-apply");
        if (apply && !apply.hidden) apply.hidden = true;
    }
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
        refreshQueued = false;
        refresh();
    });
}

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("load", scheduleRefresh);
document.addEventListener("click", scheduleRefresh, true);
scheduleRefresh();
