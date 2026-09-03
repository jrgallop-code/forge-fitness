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
    const kicker = section.querySelector(".weight-chart-kicker");
    if (kicker) kicker.textContent = "SMOOTHED TREND WEIGHT";

    const chartDescription = section.querySelector(".weight-chart-card .chart-header p");
    if (chartDescription) chartDescription.textContent = "Daily measurements · weighted smoothed trend";

    const help = section.querySelector(".weight-history-help");
    if (help) {
        help.textContent = "Trend Weight fills gaps only between real weigh-ins, then gives recent days more influence to reduce normal scale noise.";
    }

    const header = section.querySelector(".weight-table-header");
    if (header?.children?.[2]) header.children[2].textContent = "Trend Weight";
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
            cells[2].textContent = "--";
            cells[3].textContent = "--";
            return;
        }

        const trendWeight = calculateTrendWeight(weights, { endDate: entry.date });
        const trend = calculateVisibleWeightTrend(weights, { endDate: entry.date });
        const shownWeight = Number.isFinite(trendWeight) ? displayMass(trendWeight) : null;

        cells[2].textContent = Number.isFinite(shownWeight)
            ? `${shownWeight.toFixed(1)} ${massUnit()}`
            : "--";
        cells[3].textContent = formatRate(trend.weeklyChange);
        cells[3].classList.remove("trend-up", "trend-down", "trend-neutral");
        cells[3].classList.add("weight-history-trend", directionClass(trend.weeklyChange));
    });
}

function refresh() {
    queued = false;
    const section = document.getElementById("weight-progress");
    if (!section) return;
    syncCopy(section);
    syncHistory(section);
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
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab, [data-page='progress']")) {
        window.setTimeout(schedule, 50);
        window.setTimeout(schedule, 220);
    }
}, true);

schedule();
