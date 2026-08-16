import { getActiveNutritionPhase } from "./nutrition-phase.js?v=calorie-adjustment-disabled-1";

function selectedGoalId() {
    return document.getElementById("unified-goal-select")?.value || "";
}

function positive(value) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : null;
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function applyReadOnlyState() {
    const container = document.querySelector(".unified-active-target");
    const button = document.getElementById("unified-save-plan");
    if (!container) return;

    const active = getActiveNutritionPhase();
    const goalId = selectedGoalId();
    const samePhase = Boolean(active && goalId && active.goalId === goalId);

    if (!samePhase) {
        if (button) button.hidden = false;
        return;
    }

    const calories = positive(active.currentCalories ?? active.startCalories);
    const maintenance = positive(active.maintenanceCalories ?? document.getElementById("unified-maintenance")?.value);

    let valueNode = document.getElementById("unified-active-target");
    if (!valueNode || valueNode.tagName !== "STRONG") {
        container.innerHTML = `
            <span>Current Daily Target</span>
            <strong id="unified-active-target">${calories ?? "--"} kcal/day</strong>
            <small>Calorie adjustments are temporarily unavailable. Your current phase and original start date are unchanged.</small>
        `;
        valueNode = document.getElementById("unified-active-target");
    }

    setText(container.querySelector(":scope > span"), "Current Daily Target");
    setText(valueNode, calories ? `${calories} kcal/day` : "--");
    setText(
        container.querySelector("small"),
        "Calorie adjustments are temporarily unavailable. Your current phase and original start date are unchanged."
    );

    const adjustmentNode = document.getElementById("unified-daily-adjustment");
    if (adjustmentNode && calories && maintenance) {
        const adjustment = calories - maintenance;
        setText(adjustmentNode, `${adjustment > 0 ? "+" : ""}${adjustment} kcal/day`);
    }

    if (button) button.hidden = true;
}

let queued = false;
function queueApply(delay = 0) {
    if (delay > 0) {
        window.setTimeout(applyReadOnlyState, delay);
        return;
    }
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        applyReadOnlyState();
    });
}

document.addEventListener("change", event => {
    if (event.target?.id === "unified-goal-select") queueApply(30);
}, true);

document.addEventListener("input", event => {
    if (event.target?.id === "unified-maintenance") queueApply(20);
}, true);

document.addEventListener("click", event => {
    const button = event.target?.closest?.("#unified-save-plan");
    if (!button) return;
    const active = getActiveNutritionPhase();
    if (active && active.goalId === selectedGoalId()) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}, true);

const content = document.getElementById("content");
if (content) new MutationObserver(() => queueApply()).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-updated", () => queueApply(20));
window.addEventListener("levelup:nutrition-phase-updated", () => queueApply(20));
window.addEventListener("load", () => queueApply(20));
queueApply();
