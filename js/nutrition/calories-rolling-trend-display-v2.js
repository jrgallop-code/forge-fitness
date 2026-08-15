import {
    getActiveNutritionPhase,
    getActivePhaseMetrics
} from "./nutrition-phase.js?v=rolling-phase-trend-1";

const FIRST_CHECK_DAY = 14;
let refreshScheduled = false;
let refreshAgain = false;

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/week`;
}

function setText(node, value) {
    if (!node || node.textContent === value) return false;
    node.textContent = value;
    return true;
}

function syncCurrentPhaseCard(metrics) {
    const card = document.getElementById("nutrition-current-phase");
    if (!card) return;

    setText(card.querySelector(".nutrition-current-phase-head b"), metrics.status);

    const grid = card.querySelector(".nutrition-current-phase-grid");
    if (!grid) return;

    const actualCell = [...grid.children].find(cell =>
        cell.querySelector("span")?.textContent?.trim() === "Actual Since Start"
    );
    const actual = Number(metrics.actualRateLbPerWeek);
    const actualText = Number.isFinite(actual)
        ? `${metrics.status === "PRELIMINARY TREND" ? "Preliminary · " : ""}${formatRate(actual)}`
        : metrics.status === "BUILDING TREND"
            ? "Calibrating"
            : "Need more data";

    setText(actualCell?.querySelector("strong"), actualText);
}

function syncPreliminaryCheckIn(metrics) {
    const trend = metrics.trend;
    if (!trend || Number(trend.phaseDay) < 7 || Number(trend.phaseDay) >= FIRST_CHECK_DAY) return;
    if (metrics.status !== "PRELIMINARY TREND" || !Number.isFinite(Number(trend.weeklyChange))) return;

    setText(document.getElementById("weekly-coach-status"), "PRELIMINARY TREND");
    setText(
        document.getElementById("weekly-coach-confidence"),
        `Day ${trend.phaseDay} · ${trend.currentEntries} weigh-ins in current 7-day window`
    );
    setText(document.getElementById("weekly-coach-previous-label"), "Starting Trend");
    setText(
        document.getElementById("weekly-coach-previous"),
        Number.isFinite(Number(trend.previousAverage)) ? `${Number(trend.previousAverage).toFixed(1)} lb` : "--"
    );
    setText(
        document.getElementById("weekly-coach-current"),
        Number.isFinite(Number(trend.currentAverage)) ? `${Number(trend.currentAverage).toFixed(1)} lb` : "--"
    );
    setText(document.getElementById("weekly-coach-actual"), formatRate(trend.weeklyChange));
    setText(
        document.getElementById("weekly-coach-message"),
        `Preliminary rolling trend: ${formatRate(trend.weeklyChange)}. The current 7-day average updates with each new weigh-in and is compared with your phase starting trend until Day ${FIRST_CHECK_DAY}.`
    );

    const daysUntilCheck = Math.max(0, FIRST_CHECK_DAY - Number(trend.phaseDay || 0));
    setText(
        document.getElementById("weekly-coach-suggestion"),
        `Informational only. First calorie decision is Day ${FIRST_CHECK_DAY}${daysUntilCheck > 0 ? ` · in ${daysUntilCheck} day${daysUntilCheck === 1 ? "" : "s"}` : ""}.`
    );
    setText(
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

function runStabilizedRefresh() {
    refresh();
    window.setTimeout(refresh, 40);
    window.setTimeout(refresh, 120);
    window.setTimeout(() => {
        refresh();
        refreshScheduled = false;
        if (refreshAgain) {
            refreshAgain = false;
            scheduleRefresh();
        }
    }, 260);
}

function scheduleRefresh() {
    if (refreshScheduled) {
        refreshAgain = true;
        return;
    }
    refreshScheduled = true;
    refreshAgain = false;
    window.requestAnimationFrame(runStabilizedRefresh);
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => {
        if (document.getElementById("nutrition-current-phase") || document.getElementById("goal-check-in-card")) {
            scheduleRefresh();
        }
    }).observe(content, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

window.addEventListener("levelup:nutrition-updated", scheduleRefresh);
window.addEventListener("levelup:nutrition-phase-updated", scheduleRefresh);
window.addEventListener("pageshow", scheduleRefresh);
window.addEventListener("focus", scheduleRefresh);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleRefresh();
});

document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, [data-page='energy'], [data-nav='energy']")) {
        scheduleRefresh();
        window.setTimeout(scheduleRefresh, 300);
    }
}, true);

scheduleRefresh();
