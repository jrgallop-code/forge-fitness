import {
    calculateSevenDayAverage,
    calculateDisplayWeightTrend,
    normalizeWeightEntries
} from "../core/weight-trend.js?v=progress-regression-trend-2";

const WEIGHT_KEY = "forge_weight_entries";
let queued = false;

function readWeights() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
    } catch {
        return [];
    }
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function refresh() {
    const value = document.getElementById("actual-weekly-weight-change");
    if (!value) return;

    const today = localDateKey();
    const weights = readWeights().filter(entry => entry.date <= today);
    const latestEntryDate = weights.at(-1)?.date || null;
    const trend = calculateDisplayWeightTrend(weights, { endDate: latestEntryDate });
    const trendWeight = latestEntryDate
        ? calculateSevenDayAverage(weights, latestEntryDate).average
        : null;

    const nextValue = Number.isFinite(trend.weeklyChange)
        ? formatRate(trend.weeklyChange)
        : "Need more data";
    if (value.textContent !== nextValue) value.textContent = nextValue;

    const trendWeightNode = document.getElementById("latest-weight");
    if (trendWeightNode) {
        const nextTrendWeight = Number.isFinite(trendWeight)
            ? `${trendWeight.toFixed(1)} lb`
            : "--";
        if (trendWeightNode.textContent !== nextTrendWeight) trendWeightNode.textContent = nextTrendWeight;
        trendWeightNode.title = latestEntryDate
            ? `7-day trend weight through latest weigh-in ${latestEntryDate}`
            : "Add weigh-ins to calculate your 7-day trend weight.";
    }

    const card = value.closest(".metric-card");
    const heading = card?.querySelector("h3");
    if (heading && heading.textContent !== trend.label) heading.textContent = trend.label;

    value.title = latestEntryDate
        ? `Weekly change through latest weigh-in ${latestEntryDate}. Missing days do not move the result.`
        : "Add weigh-ins to calculate your weekly trend.";
    if (card) {
        card.title = "Weekly Trend estimates your rate of change from recent weigh-ins using a 21-day linear regression. The nutrition coach keeps stricter data requirements.";
    }
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
        queued = false;
        refresh();
    });
}

function formatRate(value) {
    const number = Number(value);
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:nutrition-phase-updated", schedule);
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab, [data-page='progress']")) {
        window.setTimeout(schedule, 60);
        window.setTimeout(schedule, 220);
    }
}, true);
schedule();
