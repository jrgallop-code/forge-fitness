import { calculateWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=weekly-ma-coach-1";

const WEIGHT_KEY = "forge_weight_entries";
let queued = false;

function readWeights() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
    } catch {
        return [];
    }
}

function refresh() {
    const value = document.getElementById("actual-weekly-weight-change");
    if (!value) return;

    const trend = calculateWeightTrend(readWeights(), { minEntriesPerWindow: 4 });
    value.textContent = Number.isFinite(trend.weeklyChange)
        ? formatRate(trend.weeklyChange)
        : "Need more data";
    value.title = "Current 7-day average minus the previous 7-day average";

    const card = value.closest(".metric-card");
    const heading = card?.querySelector("h3");
    if (heading) heading.textContent = "Weekly Trend";
    if (card) card.title = "Weekly change uses two consecutive 7-day moving-average windows, with at least 4 weigh-ins per window.";
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
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab")) {
        window.setTimeout(schedule, 60);
    }
}, true);
schedule();
