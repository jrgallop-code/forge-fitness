import "./dashboard-insights-analytics.js?v=dashboard-see-more-2";
import { buildDashboardWeightTrendSvg } from "./dashboard-weight-trend-svg.js?v=dashboard-weight-animated-1";
import { calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const NUTRITION_PHASES_STORAGE_KEY = "level_up_nutrition_phases";
const DAY_MS = 86400000;
const PRELIMINARY_DAYS = 5;
const PRELIMINARY_WEIGH_INS = 3;
const PHASE_LABELS = {
    fat_loss: "Fat Loss",
    maintenance: "Maintenance",
    lean_bulk: "Lean Bulk",
    custom: "Custom"
};

let queued = false;

function readWeightEntries() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]"));
    }
    catch {
        return [];
    }
}

function readActiveNutritionPhase() {
    try {
        const phases = JSON.parse(localStorage.getItem(NUTRITION_PHASES_STORAGE_KEY) || "[]");
        if (!Array.isArray(phases)) return null;
        return [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null;
    }
    catch {
        return null;
    }
}

function activePhaseLabel(phase) {
    if (!phase) return "";
    return PHASE_LABELS[phase.type] || String(phase.name || "Custom").trim().slice(0, 18);
}

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}

function localDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function findWeightCard() {
    const dashboard = document.querySelector("#content .dashboard.dashboard-command-insights, #content .dashboard");
    if (!dashboard) return null;

    const enhanced = dashboard.querySelector(".dashboard-weight-trend-card");
    if (enhanced) return enhanced;

    return [...dashboard.querySelectorAll(".metric-card")].find(card => {
        const title = String(card.querySelector("h3")?.textContent || "").trim();
        return title === "Latest Weight" || title === "Latest Recorded Weight";
    }) || null;
}

function playTrendTrace(card) {
    const path = card?.querySelector(".dashboard-weight-trend-average");
    if (!path || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    path.style.animation = "none";
    path.style.strokeDasharray = "1";
    path.style.strokeDashoffset = "1";
    path.getBoundingClientRect();
    path.style.animation = "dashboardWeightTrace 1400ms cubic-bezier(.2,.7,.2,1) forwards";
}

function renderWeightTrendCard() {
    const card = findWeightCard();
    if (!card) return;

    const today = localDateString();
    const entries = readWeightEntries().filter(entry => entry.date <= today);
    const trend = calculateVisibleWeightTrend(entries);
    const phaseLabel = activePhaseLabel(readActiveNutritionPhase());
    const series = Array.isArray(trend.series) ? trend.series : [];
    const latestDate = series.at(-1)?.date || null;
    const recent = latestDate
        ? series.filter(point => dateMs(point.date) >= dateMs(latestDate) - (13 * DAY_MS))
        : [];
    const latest = Number(trend.trendWeight);
    const signature = JSON.stringify({
        status: trend.status,
        entries: trend.entries,
        spanDays: trend.spanDays,
        phaseLabel,
        recent: recent.map(point => [point.date, Math.round(point.weight * 1000) / 1000])
    });

    if (card.dataset.weightTrendSignature === signature) return;

    card.dataset.weightTrendSignature = signature;
    card.classList.add("dashboard-weight-trend-card");

    const hasAnyWeightData = entries.length > 0;
    const chart = recent.length >= 2 ? buildDashboardWeightTrendSvg(recent) : "";
    const value = Number.isFinite(latest) ? latest.toFixed(1) : "--";
    const weighInProgress = Math.min(Number(trend.entries || entries.length), PRELIMINARY_WEIGH_INS);
    const dayProgress = Math.min(Number(trend.spanDays || 0), PRELIMINARY_DAYS);
    const building = trend.status === "insufficient";
    const emptyMessage = !hasAnyWeightData
        ? "No data yet"
        : "Building smoothed trend";
    const readinessPrimary = !hasAnyWeightData
        ? "No data yet"
        : Number.isFinite(latest)
            ? `${value} lb`
            : `${weighInProgress} / ${PRELIMINARY_WEIGH_INS} weigh-ins`;
    const readinessSecondary = !hasAnyWeightData
        ? "Add your first weigh-in"
        : building
            ? `${weighInProgress} / ${PRELIMINARY_WEIGH_INS} weigh-ins · ${dayProgress} / ${PRELIMINARY_DAYS} days`
            : trend.status === "preliminary"
                ? "Preliminary trend"
                : "Trend weight";

    card.innerHTML = `
        <button type="button" class="dashboard-weight-trend-button" data-dashboard-weight-trend-open aria-label="Open Weight Progress">
            <span class="dashboard-weight-trend-heading">
                <span>
                    <h3>Weight Trend</h3>
                    <small>Smoothed Trend Weight</small>
                </span>
                ${phaseLabel ? `<span class="dashboard-weight-phase-badge">${phaseLabel}</span>` : ""}
            </span>
            <span class="dashboard-weight-trend-chart" aria-hidden="true">
                ${chart || `<span class="dashboard-weight-trend-empty">${emptyMessage}</span>`}
            </span>
            <span class="dashboard-weight-trend-value">
                <strong>${readinessPrimary}</strong><small>${readinessSecondary}</small>
            </span>
        </button>
    `;
    requestAnimationFrame(() => playTrendTrace(card));
}

function openWeightProgress() {
    const progressButton = document.querySelector('.nav-btn[data-page="progress"]');
    if (!progressButton) return;

    progressButton.click();
    window.setTimeout(() => {
        document.getElementById("weight-tab")?.click();
        document.getElementById("weight-progress")?.scrollIntoView({ block: "start" });
    }, 0);
}

function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        renderWeightTrendCard();
    });
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-dashboard-weight-trend-open]")) {
        openWeightProgress();
    }
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueRender).observe(content, { childList: true, subtree: true });
}

window.addEventListener("storage", event => {
    if (event.key === WEIGHT_STORAGE_KEY || event.key === NUTRITION_PHASES_STORAGE_KEY) queueRender();
});
window.addEventListener("levelup:nutrition-phase-updated", queueRender);
window.addEventListener("levelup:nutrition-updated", queueRender);

queueRender();
