import {
    calculateWeightTrend,
    normalizeWeightEntries
} from "../core/weight-trend.js?v=progress-visible-current-trend-1";

const WEIGHT_KEY = "forge_weight_entries";
const MIN_ENTRIES_PER_WINDOW = 4;
let queued = false;

function readWeights() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
    } catch {
        return [];
    }
}

function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "Need more data";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function refresh() {
    const weights = readWeights();
    const latestEntryDate = weights.at(-1)?.date || null;

    // Future-weight testing intentionally owns the carousel while synthetic
    // future dates are active. Leave that test UI alone.
    if (latestEntryDate && latestEntryDate > today()) return;

    const trend = calculateWeightTrend(weights, {
        endDate: latestEntryDate,
        minEntriesPerWindow: MIN_ENTRIES_PER_WINDOW
    });
    const rateText = Number.isFinite(trend.weeklyChange)
        ? formatRate(trend.weeklyChange)
        : "Need more data";

    // phase-goal-controls replaces the original compact Weekly Trend card with
    // weight-phase-rate. Make the visible card use the latest actual weigh-in,
    // rather than a scheduled nutrition checkpoint.
    const visibleRate = document.getElementById("weight-phase-rate");
    const visibleHeading = document.getElementById("weight-phase-rate-heading");
    setText(visibleHeading, "Weekly Trend");
    setText(visibleRate, rateText);

    if (visibleRate) {
        visibleRate.title = latestEntryDate
            ? `Weekly change through latest weigh-in ${latestEntryDate}. Missing days do not move the result.`
            : "Add weigh-ins to calculate your weekly trend.";
        const card = visibleRate.closest(".metric-card");
        if (card) {
            card.title = "Weekly Trend compares the 7-day average ending on your latest weigh-in with the previous 7-day average. It updates only when weight data changes.";
        }
    }

    // Keep the original compact-summary target consistent if another render path
    // uses it.
    const compactRate = document.getElementById("actual-weekly-weight-change");
    setText(compactRate, rateText);
    const compactHeading = compactRate?.closest(".metric-card")?.querySelector("h3");
    setText(compactHeading, "Weekly Trend");
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
        queued = false;
        refresh();
    });
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(schedule).observe(content, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

window.addEventListener("pageshow", schedule);
window.addEventListener("focus", schedule);
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:nutrition-phase-updated", schedule);
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab, [data-page='progress']")) {
        window.setTimeout(schedule, 40);
        window.setTimeout(schedule, 180);
        window.setTimeout(schedule, 320);
    }
}, true);

schedule();
