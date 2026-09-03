import {
    calculateTrendWeight,
    calculateVisibleWeightTrend,
    normalizeWeightEntries
} from "../core/weight-trend.js?v=smoothed-visible-trend-1";

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
    const trend = calculateVisibleWeightTrend(weights, { endDate: latestEntryDate });
    const trendWeight = Number.isFinite(trend.trendWeight)
        ? trend.trendWeight
        : calculateTrendWeight(weights, { endDate: latestEntryDate });

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
            ? `Smoothed Trend Weight through latest weigh-in ${latestEntryDate}`
            : "Add a weigh-in to begin building Trend Weight.";
    }

    const card = value.closest(".metric-card");
    const heading = card?.querySelector("h3");
    if (heading && heading.textContent !== trend.label) heading.textContent = trend.label;

    value.title = latestEntryDate
        ? `Weekly pace from up to 20 days of smoothed Trend Weight through ${latestEntryDate}.`
        : "Add weigh-ins to calculate your weekly trend.";
    if (card) {
        card.title = "Weekly Trend uses the smoothed Trend Weight series. TDEE keeps its separate 21-day regression and review rules.";
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
