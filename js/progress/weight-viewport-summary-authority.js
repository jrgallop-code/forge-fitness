import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";
import { calculateTrendWeightSeries, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";

const VIEWPORT_KEY = "level_up_weight_chart_viewport_v4";
const STYLE_ID = "weight-viewport-summary-authority-styles";
let queued = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .weight-chart-card[data-viewport-summary-active="true"] [data-weight-chart-average][data-viewport-summary],
        .weight-chart-card[data-viewport-summary-active="true"] [data-weight-chart-change][data-viewport-summary],
        .weight-chart-card[data-viewport-summary-active="true"] [data-weight-chart-period][data-viewport-summary]{position:relative;color:transparent!important}
        .weight-chart-card[data-viewport-summary-active="true"] [data-weight-chart-average][data-viewport-summary]::after,
        .weight-chart-card[data-viewport-summary-active="true"] [data-weight-chart-change][data-viewport-summary]::after,
        .weight-chart-card[data-viewport-summary-active="true"] [data-weight-chart-period][data-viewport-summary]::after{content:attr(data-viewport-summary);position:absolute;inset:0 auto auto 0;color:inherit;white-space:nowrap}
        .weight-chart-card[data-viewport-summary-active="true"] [data-weight-chart-average][data-viewport-summary]::after,
        .weight-chart-card[data-viewport-summary-active="true"] [data-weight-chart-change][data-viewport-summary]::after{color:var(--success,#45cb75)}
        .weight-chart-card[data-viewport-summary-active="true"] [data-weight-chart-period][data-viewport-summary]::after{color:var(--text-secondary,var(--muted,#667085))}
    `;
    document.head.appendChild(style);
}

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

function setOverlay(node, value) {
    if (!node) return;
    const wanted = String(value ?? "—");
    if (node.dataset.viewportSummary !== wanted) node.dataset.viewportSummary = wanted;
}

function clearOverlay(card) {
    if (!card) return;
    card.removeAttribute("data-viewport-summary-active");
    card.querySelectorAll("[data-viewport-summary]").forEach(node => node.removeAttribute("data-viewport-summary"));
}

function apply() {
    queued = false;
    ensureStyles();
    const card = document.querySelector("#weight-progress .weight-chart-card, .weight-chart-card");
    if (!card) return;

    const viewportMounted = Boolean(card.querySelector("[data-analytics-viewport-chart='weight'], .analytics-viewport-controls"));
    const windowState = readViewport();
    if (!viewportMounted || !windowState) {
        clearOverlay(card);
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

    card.dataset.viewportSummaryActive = "true";
    setOverlay(card.querySelector("[data-weight-chart-average]"), Number.isFinite(shownAverage) ? `${shownAverage.toFixed(1)} ${unit}` : "—");
    setOverlay(card.querySelector("[data-weight-chart-change]"), Number.isFinite(shownChange)
        ? `${shownChange > 0 ? "+" : shownChange < 0 ? "−" : ""}${Math.abs(shownChange).toFixed(1)} ${unit}`
        : "—");
    setOverlay(card.querySelector("[data-weight-chart-period]"), formatLongRange(start, end));
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true, characterData: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("resize", schedule, { passive: true });
document.addEventListener("click", event => {
    if (event.target.closest?.(".analytics-viewport-controls, .analytics-viewport-scrubber, [data-weight-chart-range], #weight-tab, [data-page='progress']")) {
        requestAnimationFrame(schedule);
        setTimeout(schedule, 80);
    }
}, true);

schedule();
