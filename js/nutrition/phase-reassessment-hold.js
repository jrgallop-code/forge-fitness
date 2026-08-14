import { getActiveNutritionPhase } from "./nutrition-phase.js?v=weekly-ma-coach-1";

const REASSESSMENT_DAYS = 7;
const REASSESSMENT_HOLD_KEY = "level_up_phase_reassessment_hold";
let refreshQueued = false;

function getHold() {
    const phase = getActiveNutritionPhase();
    if (!phase) return null;

    let hold;
    try { hold = JSON.parse(localStorage.getItem(REASSESSMENT_HOLD_KEY) || "null"); }
    catch { hold = null; }
    if (!hold || hold.phaseId !== phase.id) return null;

    const calories = Number(phase.currentCalories ?? phase.startCalories);
    if (!Number.isFinite(calories) || calories <= 0) return null;
    if (Math.round(Number(hold.calories)) !== Math.round(calories)) {
        localStorage.removeItem(REASSESSMENT_HOLD_KEY);
        return null;
    }

    const time = new Date(hold.appliedAt).getTime();
    if (!Number.isFinite(time)) {
        localStorage.removeItem(REASSESSMENT_HOLD_KEY);
        return null;
    }
    const daysElapsed = Math.max(0, Math.floor((Date.now() - time) / 86400000));
    if (daysElapsed >= REASSESSMENT_DAYS) {
        localStorage.removeItem(REASSESSMENT_HOLD_KEY);
        return null;
    }

    return {
        calories: Math.round(calories),
        daysRemaining: REASSESSMENT_DAYS - daysElapsed,
        estimatedTargetCalories: Number(hold.estimatedTargetCalories) || null
    };
}

function refresh() {
    const hold = getHold();
    if (!hold) return;
    const copy = `Weekly adjustment applied · reassess in ${hold.daysRemaining} day${hold.daysRemaining === 1 ? "" : "s"}`;
    const targetCopy = Number.isFinite(hold.estimatedTargetCalories)
        ? `Estimated full target: ${Math.round(hold.estimatedTargetCalories)} kcal/day`
        : copy;

    const nutritionCard = document.querySelector("[data-phase-calorie-suggestion]");
    setText(nutritionCard?.querySelector("strong"), `${hold.calories} kcal/day`);
    setText(nutritionCard?.querySelector("small"), `${copy}${Number.isFinite(hold.estimatedTargetCalories) ? ` · ${targetCopy}` : ""}`);

    setText(document.getElementById("weight-calorie-suggestion"), `${hold.calories} kcal/day`);
    setText(document.getElementById("weight-calorie-suggestion-total"), `${copy}${Number.isFinite(hold.estimatedTargetCalories) ? ` · ${targetCopy}` : ""}`);

    const checkIn = document.getElementById("goal-check-in-card");
    if (checkIn && checkIn.dataset.weeklyCoach !== "1") {
        setText(document.getElementById("goal-check-in-message"), "Hold the current calorie target for 7 days before another adjustment.");
        setText(document.getElementById("goal-check-in-suggested"), `Current target: ${hold.calories} kcal/day · ${copy}.${Number.isFinite(hold.estimatedTargetCalories) ? ` ${targetCopy}.` : ""}`);
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
