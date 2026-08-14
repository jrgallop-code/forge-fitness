import { getActiveNutritionPhase, getActivePhaseMetrics } from "./nutrition-phase.js?v=weekly-ma-coach-1";

let refreshQueued = false;

const STATUS_LABELS = {
    "MAINTAINING": "Maintaining",
    "ON TRACK": "On Track",
    "SLIGHTLY FASTER": "Slightly Faster",
    "SLIGHTLY SLOWER": "Slightly Slower",
    "NEEDS ATTENTION": "Needs Attention",
    "TRENDING UP": "Trending Up",
    "TRENDING DOWN": "Trending Down"
};

function formatRate(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

function getDisplay() {
    const phase = getActiveNutritionPhase();
    if (!phase) return { text: "No active phase", rateText: "No active phase", statusText: "NO ACTIVE PHASE" };
    const metrics = getActivePhaseMetrics(phase);
    const rate = formatRate(metrics.actualRateLbPerWeek);
    if (metrics.status === "BUILDING TREND") {
        return { text: "Building trend · first check Day 14", rateText: "Calibrating", statusText: "BUILDING TREND" };
    }
    if (metrics.status === "NEED MORE DATA" || metrics.status === "NEED MORE PHASE DATA" || !rate) {
        return { text: "Need more data", rateText: "Need more data", statusText: "NEED MORE DATA" };
    }
    const label = STATUS_LABELS[metrics.status] || metrics.status;
    return { text: `${label} · ${rate}`, rateText: rate, statusText: metrics.status };
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function refresh() {
    const phase = getActiveNutritionPhase();
    const display = getDisplay();
    const targetRate = formatRate(phase?.targetWeeklyRate);
    setText(document.getElementById("weight-current-phase"), phase ? `${phase.label || "Current Phase"}${targetRate ? ` (${targetRate})` : ""}` : "No active phase");
    setText(document.getElementById("weight-phase-rate-heading"), "Phase Weekly Rate");
    setText(document.getElementById("weight-phase-rate"), display.text);
    const phaseCard = document.getElementById("nutrition-current-phase");
    setText(phaseCard?.querySelector(".nutrition-current-phase-head b"), display.statusText);
    const grid = phaseCard?.querySelector(".nutrition-current-phase-grid");
    if (grid) {
        const actualCell = [...grid.children].find(cell => cell.querySelector("span")?.textContent?.trim() === "Actual Since Start");
        setText(actualCell?.querySelector("strong"), display.rateText);
    }
}

function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => { refreshQueued = false; refresh(); });
}

const content = document.getElementById("content");
if (content) new MutationObserver(scheduleRefresh).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("load", scheduleRefresh);
document.addEventListener("click", scheduleRefresh, true);
scheduleRefresh();
