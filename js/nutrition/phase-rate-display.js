import { getActiveNutritionPhase, getActivePhaseMetrics } from "./nutrition-phase.js?v=phase-rate-display-1";

let refreshQueued = false;

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

function getDisplay() {
    const phase = getActiveNutritionPhase();
    if (!phase) return { text: "No active phase", nutritionText: "No active phase" };

    const metrics = getActivePhaseMetrics(phase);
    if (metrics?.trend?.status !== "actual" || !Number.isFinite(Number(metrics.actualRateLbPerWeek))) {
        return { text: "Need more phase data", nutritionText: "Need more phase data" };
    }

    const rate = formatRate(metrics.actualRateLbPerWeek);
    const status = metrics.status === "MAINTAINING" ? "Maintaining" : null;
    return {
        text: status ? `${status} · ${rate}` : rate,
        nutritionText: status ? `${status} · ${rate}` : rate
    };
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function refresh() {
    const display = getDisplay();
    setText(document.getElementById("weight-phase-rate-heading"), "Phase Weekly Rate");
    setText(document.getElementById("weight-phase-rate"), display.text);

    const grid = document.querySelector("#nutrition-current-phase .nutrition-current-phase-grid");
    if (grid) {
        const actualCell = [...grid.children].find(cell => cell.querySelector("span")?.textContent?.trim() === "Actual Since Start");
        setText(actualCell?.querySelector("strong"), display.nutritionText);
    }
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
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("load", scheduleRefresh);
document.addEventListener("click", scheduleRefresh, true);
scheduleRefresh();
