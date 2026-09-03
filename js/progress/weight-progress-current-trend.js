import "./weight-visible-trend-sync.js?v=smoothed-visible-trend-3";
import {
    calculateVisibleWeightTrend,
    normalizeWeightEntries
} from "../core/weight-trend.js?v=smoothed-visible-trend-1";

const WEIGHT_KEY = "forge_weight_entries";
const LIVE_RATE_ID = "weight-current-weekly-trend";
const LIVE_HEADING_ID = "weight-current-weekly-trend-heading";
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

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "Need more data";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/wk`;
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function detachLiveCardFromPhaseRenderer() {
    const rate = document.getElementById(LIVE_RATE_ID) || document.getElementById("weight-phase-rate");
    const heading = document.getElementById(LIVE_HEADING_ID) || document.getElementById("weight-phase-rate-heading");
    if (rate?.id === "weight-phase-rate") rate.id = LIVE_RATE_ID;
    if (heading?.id === "weight-phase-rate-heading") heading.id = LIVE_HEADING_ID;
    return { rate, heading };
}

function refresh() {
    const today = localDateKey();
    const weights = readWeights().filter(entry => entry.date <= today);
    const latestEntryDate = weights.at(-1)?.date || null;
    const trend = calculateVisibleWeightTrend(weights, { endDate: latestEntryDate });
    const rateText = Number.isFinite(trend.weeklyChange) ? formatRate(trend.weeklyChange) : "Need more data";

    const visible = detachLiveCardFromPhaseRenderer();
    setText(visible.heading, trend.label);
    setText(visible.rate, rateText);

    if (visible.rate) {
        visible.rate.title = latestEntryDate
            ? `Weekly change from up to 20 days of smoothed Trend Weight through ${latestEntryDate}.`
            : "Add weigh-ins to calculate your weekly trend.";
        const card = visible.rate.closest(".metric-card");
        if (card) card.title = "Weekly Trend is calculated from the smoothed Trend Weight series to reduce short-term scale noise.";
    }

    const compactRate = document.getElementById("actual-weekly-weight-change");
    setText(compactRate, rateText);
    const compactHeading = compactRate?.closest(".metric-card")?.querySelector("h3");
    setText(compactHeading, trend.label);
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
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true, characterData: true });
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
