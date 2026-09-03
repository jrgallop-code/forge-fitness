import { calculateTrendWeight, calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const WEIGHT_KEY = "forge_weight_entries";
const STYLE_ID = "level-up-weight-trend-interaction-fix";
let queued = false;

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readWeights() {
    try { return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]")); }
    catch { return []; }
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

function directionClass(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || Math.abs(number) < 0.005) return "trend-neutral";
    return number > 0 ? "trend-up" : "trend-down";
}

function ensureInteractionStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #weight-progress .weight-chart-range-control,
        #weight-progress .weight-graph-carousel-pager-v2,
        #weight-progress .weight-trend-tutorial-launch,
        #weight-progress .expenditure-tutorial-actions {
            position: relative;
            z-index: 20;
            pointer-events: auto !important;
        }
        #weight-progress .weight-chart-range-control button,
        #weight-progress .weight-graph-carousel-pager-v2 button,
        #weight-progress .weight-trend-tutorial-launch,
        #weight-progress .expenditure-tutorial-actions button {
            pointer-events: auto !important;
            touch-action: manipulation;
        }
        #weight-progress .weight-trend-tutorial-launch {
            width: 100%;
            margin: 8px 0 2px;
        }
    `;
    document.head.appendChild(style);
}

function syncCopy(section) {
    setText(section.querySelector(".weight-chart-kicker"), "SMOOTHED TREND WEIGHT");
    setText(section.querySelector(".weight-chart-card .chart-header p"), "Daily measurements · weighted smoothed trend");
    setText(section.querySelector(".weight-history-help"), "Trend Weight fills gaps only between real weigh-ins, then gives recent days more influence to reduce normal scale noise. Weekly Trend is calculated from that same smoothed signal.");

    const header = section.querySelector(".weight-table-header");
    setText(header?.children?.[2], "Trend Weight");

    section.querySelectorAll(".weight-carbs-head-v2 p").forEach(node => setText(node, "Same smoothed Trend Weight · carbohydrate intake"));
    section.querySelectorAll(".weight-carbs-legend-v2 .is-trend").forEach(icon => setText(icon.parentElement, "Trend Weight"));
    section.querySelectorAll(".weight-calories-head p").forEach(node => setText(node, "Same smoothed Trend Weight · daily calorie intake"));
    section.querySelectorAll(".weight-calories-legend .is-trend").forEach(icon => setText(icon.parentElement, "Trend Weight"));
}

function syncTopSummary(weights) {
    const today = localDateKey();
    const eligible = weights.filter(entry => entry.date <= today);
    const latestDate = eligible.at(-1)?.date || null;
    const trend = calculateVisibleWeightTrend(eligible, { endDate: latestDate });
    const trendWeight = Number.isFinite(trend.trendWeight)
        ? trend.trendWeight
        : calculateTrendWeight(eligible, { endDate: latestDate });

    const trendWeightNode = document.getElementById("latest-weight");
    if (trendWeightNode) {
        setText(trendWeightNode, Number.isFinite(trendWeight) ? `${trendWeight.toFixed(1)} lb` : "--");
    }

    const rateNode = document.getElementById("actual-weekly-weight-change");
    if (rateNode) {
        setText(rateNode, Number.isFinite(trend.weeklyChange) ? formatRate(trend.weeklyChange) : "Need more data");
        const heading = rateNode.closest(".metric-card")?.querySelector("h3");
        setText(heading, trend.label || "Weekly Trend");
    }
}

function syncTdeeCopy() {
    const note = document.querySelector("#calorie-progress .calculated-maintenance-breakdown > small");
    if (!note) return;
    setText(note, "Food intake uses logged days through yesterday. TDEE now uses the same smoothed weekly weight-change signal shown in Weight Progress while keeping its existing 21-day evidence window, confidence gates, seven-day review cadence, and 50-calorie building / 100-calorie high-confidence stabilization limits.");
}

function syncHistory(section, weights) {
    const today = localDateKey();
    const rows = [...section.querySelectorAll("#weight-history-list .weight-table-row")];
    if (!rows.length || !weights.length) return;

    const newestFirst = [...weights].reverse();
    rows.forEach((row, index) => {
        const entry = newestFirst[index];
        if (!entry) return;
        const cells = row.children;
        if (cells.length < 4) return;

        if (entry.date > today) {
            setText(cells[2], "--");
            setText(cells[3], "--");
            return;
        }

        const trendWeight = calculateTrendWeight(weights, { endDate: entry.date });
        const trend = calculateVisibleWeightTrend(weights, { endDate: entry.date });
        const shownWeight = Number.isFinite(trendWeight) ? displayMass(trendWeight) : null;

        setText(cells[2], Number.isFinite(shownWeight) ? `${shownWeight.toFixed(1)} ${massUnit()}` : "--");
        setText(cells[3], formatRate(trend.weeklyChange));
        cells[3].classList.remove("trend-up", "trend-down", "trend-neutral");
        cells[3].classList.add("weight-history-trend", directionClass(trend.weeklyChange));
    });
}

function refresh() {
    queued = false;
    ensureInteractionStyles();
    const weights = readWeights();
    const section = document.getElementById("weight-progress");
    if (section) {
        syncCopy(section);
        syncTopSummary(weights);
        syncHistory(section, weights);
    }
    syncTdeeCopy();
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true, characterData: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:weight-updated", schedule);
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab, #nutrition-progress-tab, [data-page='progress']")) {
        window.setTimeout(schedule, 50);
        window.setTimeout(schedule, 220);
    }
}, true);

schedule();
