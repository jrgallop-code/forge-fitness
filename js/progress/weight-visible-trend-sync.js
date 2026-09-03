import { calculateTrendWeight, calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const WEIGHT_KEY = "forge_weight_entries";
let queued = false;

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readWeights() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
    } catch {
        return [];
    }
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

function syncCopy(section) {
    setText(section.querySelector(".weight-chart-kicker"), "SMOOTHED TREND WEIGHT");
    setText(section.querySelector(".weight-chart-card .chart-header p"), "Daily measurements · weighted smoothed trend");
    setText(
        section.querySelector(".weight-history-help"),
        "Trend Weight fills gaps only between real weigh-ins, then gives recent days more influence to reduce normal scale noise."
    );

    const header = section.querySelector(".weight-table-header");
    setText(header?.children?.[2], "Trend Weight");

    section.querySelectorAll(".weight-carbs-head-v2 p").forEach(node => setText(node, "Same smoothed Trend Weight · carbohydrate intake"));
    section.querySelectorAll(".weight-carbs-legend-v2 .is-trend").forEach(icon => setText(icon.parentElement, "Trend Weight"));
    section.querySelectorAll(".weight-calories-head p").forEach(node => setText(node, "Same smoothed Trend Weight · daily calorie intake"));
    section.querySelectorAll(".weight-calories-legend .is-trend").forEach(icon => setText(icon.parentElement, "Trend Weight"));
}

function syncTdeeCopy() {
    const note = document.querySelector("#calorie-progress .calculated-maintenance-breakdown > small");
    if (!note) return;
    setText(
        note,
        "Food intake uses logged days through yesterday. TDEE uses its own 21-day weigh-in regression and remains separate from the smoothed Trend Weight shown in Weight Progress. Level Up holds the displayed TDEE between seven-day reviews, requires 7 food days and a 14-day weight span, and limits each update to 50 calories while confidence is building or 100 calories at high confidence."
    );
}

function syncHistory(section) {
    const today = localDateKey();
    const weights = readWeights();
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
    const section = document.getElementById("weight-progress");
    if (section) {
        syncCopy(section);
        syncHistory(section);
    }
    syncTdeeCopy();
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:nutrition-updated", schedule);
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab, #nutrition-progress-tab, [data-page='progress']")) {
        window.setTimeout(schedule, 50);
        window.setTimeout(schedule, 220);
    }
}, true);

schedule();
