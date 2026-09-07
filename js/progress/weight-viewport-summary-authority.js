import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";
import { calculateTrendWeightSeries, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";

const VIEWPORT_KEY = "level_up_weight_chart_viewport_v4";
const LEGACY_STYLE_ID = "weight-viewport-summary-authority-styles";
let queued = false;

function localDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readViewport() {
    try {
        const value = JSON.parse(sessionStorage.getItem(VIEWPORT_KEY) || "null");
        return value?.start && value?.end ? value : null;
    } catch {
        return null;
    }
}

function readWeightEntries() {
    try {
        const today = localDateString();
        return normalizeWeightEntries(JSON.parse(localStorage.getItem("forge_weight_entries") || "[]"))
            .filter(entry => entry.date <= today);
    } catch {
        return [];
    }
}

function formatLongRange(start, end) {
    if (!start || !end) return "—";
    const a = new Date(`${start}T12:00:00`);
    const b = new Date(`${end}T12:00:00`);
    const sameYear = a.getFullYear() === b.getFullYear();
    const left = a.toLocaleDateString("en-US", { month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
    const right = b.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return `${left} – ${right}`;
}

function stableText(node, value) {
    if (!node) return;
    const wanted = String(value ?? "—");
    if (node.textContent !== wanted) node.textContent = wanted;
}

function clearLegacyOverlay(card) {
    document.getElementById(LEGACY_STYLE_ID)?.remove();
    if (!card) return;
    card.removeAttribute("data-viewport-summary-active");
    card.querySelectorAll("[data-viewport-summary]").forEach(node => node.removeAttribute("data-viewport-summary"));
}

function apply() {
    queued = false;
    const card = document.querySelector("#weight-progress .weight-chart-card, .weight-chart-card");
    clearLegacyOverlay(card);
    if (!card) return;

    const viewportMounted = Boolean(card.querySelector("[data-analytics-viewport-chart='weight'], .analytics-viewport-controls"));
    const windowState = readViewport();
    if (!viewportMounted || !windowState) {
        card.removeAttribute("data-viewport-summary-authority");
        return;
    }

    let { start, end } = windowState;
    if (String(start) > String(end)) [start, end] = [end, start];

    const entries = readWeightEntries();
    const trend = calculateTrendWeightSeries(entries);
    const visibleEntries = entries.filter(entry => entry.date >= start && entry.date <= end);
    const visibleTrend = trend.filter(entry => entry.date >= start && entry.date <= end);
    const series = visibleTrend.length ? visibleTrend : visibleEntries;
    const values = series.map(item => Number(item.weight)).filter(Number.isFinite);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const change = values.length >= 2 ? values.at(-1) - values[0] : null;
    const shownAverage = Number.isFinite(average) ? displayMass(average) : null;
    const shownChange = Number.isFinite(change) ? displayMass(change) : null;
    const unit = massUnit();

    card.dataset.viewportSummaryAuthority = "true";
    stableText(card.querySelector("[data-weight-chart-average]"), Number.isFinite(shownAverage) ? `${shownAverage.toFixed(1)} ${unit}` : "—");
    stableText(card.querySelector("[data-weight-chart-change]"), Number.isFinite(shownChange)
        ? `${shownChange > 0 ? "+" : shownChange < 0 ? "−" : ""}${Math.abs(shownChange).toFixed(1)} ${unit}`
        : "—");
    stableText(card.querySelector("[data-weight-chart-period]"), formatLongRange(start, end));
}

function schedule(delay = 0) {
    if (delay) {
        setTimeout(() => schedule(), delay);
        return;
    }
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(schedule).observe(content, { childList: true, subtree: true, characterData: true });
}

window.addEventListener("pageshow", schedule);
window.addEventListener("resize", schedule, { passive: true });

document.addEventListener("click", event => {
    if (event.target.closest?.(".analytics-viewport-controls, .analytics-viewport-scrubber, [data-weight-chart-range], #weight-tab, [data-page='progress']")) {
        schedule();
        schedule(60);
        schedule(160);
    }
}, true);

document.addEventListener("input", event => {
    if (event.target.closest?.(".analytics-viewport-scrubber, .analytics-viewport-date-panel")) {
        schedule();
        schedule(40);
    }
}, true);

document.addEventListener("pointerup", event => {
    if (event.target.closest?.(".analytics-viewport-stage, .analytics-viewport-scrubber")) {
        schedule();
        schedule(40);
    }
}, true);

document.addEventListener("touchend", event => {
    if (event.target.closest?.(".analytics-viewport-stage, .analytics-viewport-scrubber")) {
        schedule();
        schedule(40);
    }
}, { capture: true, passive: true });

schedule();
