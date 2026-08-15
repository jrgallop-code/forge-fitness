import {
    getActiveNutritionPhase,
    getActivePhaseMetrics
} from "./nutrition-phase.js?v=rolling-phase-trend-1";

const FIRST_CHECK_DAY = 14;
let refreshQueued = false;

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/week`;
}

function setSimpleText(node, value) {
    if (!node || node.textContent === value) return;
    if (node.childNodes.length === 1 && node.firstChild?.nodeType === Node.TEXT_NODE) {
        node.firstChild.nodeValue = value;
        return;
    }
    node.textContent = value;
}

function syncCurrentPhaseCard(metrics) {
    const card = document.getElementById("nutrition-current-phase");
    if (!card) return;

    const badge = card.querySelector(".nutrition-current-phase-head b");
    setSimpleText(badge, metrics.status);

    const grid = card.querySelector(".nutrition-current-phase-grid");
    if (!grid) return;

    const actualCell = [...grid.children].find(cell =>
        cell.querySelector("span")?.textContent?.trim() === "Actual Since Start"
    );
    const actual = Number(metrics.actualRateLbPerWeek);
    const actualText = Number.isFinite(actual)
        ? `${metrics.status === "PRELIMINARY TREND" ? "Preliminary · " : ""}${formatRate(actual)}`
        : metrics.status === "BUILDING TREND" ? "Calibrating" : "Need more data";
    setSimpleText(actualCell?.querySelector("strong"), actualText);
}

function syncPreliminaryCheckIn(metrics) {
    const trend = metrics.trend;
    if (!trend || trend.phaseDay < 7 || trend.phaseDay >= FIRST_CHECK_DAY) return;
    if (metrics.status !== "PRELIMINARY TREND" || !Number.isFinite(Number(trend.weeklyChange))) return;

    setSimpleText(document.getElementById("weekly-coach-status"), "PRELIMINARY TREND");
    setSimpleText(
        document.getElementById("weekly-coach-confidence"),
        `Day ${trend.phaseDay} · ${trend.currentEntries} weigh-ins in current 7-day window`
    );
    setSimpleText(document.getElementById("weekly-coach-previous-label"), "Starting Trend");
    setSimpleText(
        document.getElementById("weekly-coach-previous"),
        Number.isFinite(Number(trend.previousAverage)) ? `${Number(trend.previousAverage).toFixed(1)} lb` : "--"
    );
    setSimpleText(
        document.getElementById("weekly-coach-current"),
        Number.isFinite(Number(trend.currentAverage)) ? `${Number(trend.currentAverage).toFixed(1)} lb` : "--"
    );
    setSimpleText(
        document.getElementById("weekly-coach-actual"),
        formatRate(trend.weeklyChange)
    );
    setSimpleText(
        document.getElementById("weekly-coach-message"),
        `Preliminary rolling trend: ${formatRate(trend.weeklyChange)}. Your current 7-day average now updates with each new weigh-in and is compared with your phase starting trend until Day ${FIRST_CHECK_DAY}.`
    );

    const daysUntilCheck = Math.max(0, FIRST_CHECK_DAY - Number(trend.phaseDay || 0));
    setSimpleText(
        document.getElementById("weekly-coach-suggestion"),
        `Informational only. First calorie decision is Day ${FIRST_CHECK_DAY}${daysUntilCheck > 0 ? ` · in ${daysUntilCheck} day${daysUntilCheck === 1 ? "" : "s"}` : ""}.`
    );

    setSimpleText(
        document.querySelector("#goal-check-in-card[data-weekly-coach='1'] .weekly-coach-method"),
        `The weight trend starts on Day 7, then the 7-day moving average rolls forward with each new weigh-in. Calorie decisions begin on Day ${FIRST_CHECK_DAY} using scheduled 7-day check-ins, then repeat every 7 days. Each decision window needs at least 4 weigh-ins.`
    );
}

function refresh() {
    const phase = getActiveNutritionPhase();
    if (!phase) return;

    const metrics = getActivePhaseMetrics(phase, { rolling: true });
    syncCurrentPhaseCard(metrics);
    syncPreliminaryCheckIn(metrics);
}

function scheduleRefresh(delay = 0) {
    if (refreshQueued) return;
    refreshQueued = true;
    window.setTimeout(() => {
        refreshQueued = false;
        refresh();
    }, delay);
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => scheduleRefresh(0)).observe(content, {
        childList: true,
        subtree: true
    });
}

window.addEventListener("levelup:nutrition-updated", () => scheduleRefresh(20));
window.addEventListener("levelup:nutrition-phase-updated", () => scheduleRefresh(20));
window.addEventListener("pageshow", () => scheduleRefresh(20));

document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, [data-page='energy'], [data-nav='energy']")) {
        scheduleRefresh(80);
    }
}, true);

scheduleRefresh(80);
