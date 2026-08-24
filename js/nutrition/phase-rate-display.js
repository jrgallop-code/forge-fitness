import { getActiveNutritionPhase, getActivePhaseMetrics } from "./nutrition-phase.js?v=nutrition-phase-full-window-1";
import { calculateDisplayWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=nutrition-display-regression-1";

let refreshQueued = false;
const WEIGHT_KEY = "forge_weight_entries";

const STATUS_LABELS = {
    "MAINTAINING": "Maintaining",
    "ON TRACK": "On Track",
    "SLIGHTLY FASTER": "Slightly Faster",
    "SLIGHTLY SLOWER": "Slightly Slower",
    "NEEDS ATTENTION": "Needs Attention",
    "TRENDING UP": "Trending Up",
    "TRENDING DOWN": "Trending Down",
    "AWAITING WEIGH-IN": "Awaiting Weigh-In"
};

function formatRate(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

function getVisibleTrend(metrics) {
    if (metrics?.isFutureTest) return null;
    try {
        const entries = normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
        const latestDate = entries.at(-1)?.date || null;
        return calculateDisplayWeightTrend(entries, { endDate: latestDate });
    } catch {
        return null;
    }
}

function getDisplay() {
    const phase = getActiveNutritionPhase();
    if (!phase) return { text: "No active phase", rateText: "No active phase", statusText: "NO ACTIVE PHASE" };
    const metrics = getActivePhaseMetrics(phase, { rolling: true });
    const visibleTrend = getVisibleTrend(metrics);
    const visibleRate = formatRate(visibleTrend?.weeklyChange);
    const rate = visibleRate || formatRate(metrics.actualRateLbPerWeek);
    if (visibleRate) {
        const preliminary = visibleTrend.status === "preliminary";
        return {
            text: `${preliminary ? "Preliminary · " : ""}${visibleRate}`,
            rateText: `${preliminary ? "Preliminary · " : ""}${visibleRate}`,
            statusText: metrics.status
        };
    }
    if (metrics.status === "BUILDING TREND") {
        return { text: "Building trend · preliminary Day 7", rateText: "Calibrating", statusText: "BUILDING TREND" };
    }
    if (metrics.status === "PRELIMINARY TREND" && rate) {
        return { text: `Preliminary · ${rate}`, rateText: `Preliminary · ${rate}`, statusText: "PRELIMINARY TREND" };
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
        const actualCell = [...grid.children].find(cell => {
            const label = cell.querySelector("span")?.textContent?.trim();
            return label === "Actual Since Start" || label === "Current Weekly Trend";
        });
        setText(actualCell?.querySelector("span"), "Current Weekly Trend");
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
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry")) {
        window.setTimeout(scheduleRefresh, 0);
        return;
    }
    scheduleRefresh();
}, true);
scheduleRefresh();
