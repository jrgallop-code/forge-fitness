import { calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "../nutrition/calculated-maintenance.js?v=dashboard-insights-1";
import { buildDashboardWeightTrendSvg } from "./dashboard-weight-trend-svg.js?v=dashboard-weight-animated-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const SCREEN_ID = "dashboard-insights-analytics-screen";
const DAY_MS = 86400000;

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(key) {
    return new Date(`${key}T12:00:00`).getTime();
}

function recentCompletedDates(count = 7) {
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    return Array.from({ length: count }, (_, index) => {
        const date = new Date(end);
        date.setDate(end.getDate() - (count - 1 - index));
        return localDateKey(date);
    });
}

function caloriesForEntries(entries) {
    return (Array.isArray(entries) ? entries : []).reduce((sum, entry) => {
        const calories = Number(entry?.nutrition?.calories);
        return sum + (Number.isFinite(calories) && calories > 0 ? calories : 0);
    }, 0);
}

function average(values) {
    const usable = values.filter(Number.isFinite);
    return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}

function activePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases)
        ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null
        : null;
}

function currentTrend() {
    const today = localDateKey();
    const weights = normalizeWeightEntries(readJson(WEIGHT_KEY, []))
        .filter(entry => entry.date <= today);
    return {
        weights,
        trend: calculateVisibleWeightTrend(weights)
    };
}

function trendWeightAtPhaseStart(series, phaseStartDate) {
    if (!Array.isArray(series) || !series.length || !phaseStartDate) return null;
    const startTime = dateMs(phaseStartDate);
    const nearest = series.reduce((best, point) => {
        const distance = Math.abs(dateMs(point.date) - startTime);
        return !best || distance < best.distance ? { point, distance } : best;
    }, null)?.point;
    const weight = Number(nearest?.weight);
    return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function goalProgressData(trendInfo) {
    const phase = activePhase();
    const series = Array.isArray(trendInfo?.trend?.series) ? trendInfo.trend.series : [];
    const current = Number(trendInfo?.trend?.trendWeight ?? series.at(-1)?.weight ?? trendInfo?.weights?.at(-1)?.weight);
    const phaseGoal = Number(phase?.goalWeight ?? phase?.targetWeight);
    const legacyGoal = Number(localStorage.getItem(GOAL_WEIGHT_KEY));
    const goal = Number.isFinite(phaseGoal) && phaseGoal > 0
        ? phaseGoal
        : Number.isFinite(legacyGoal) && legacyGoal > 0
            ? legacyGoal
            : null;
    const storedStart = Number(phase?.startingTrendWeight ?? phase?.startWeight);
    const start = Number.isFinite(storedStart) && storedStart > 0
        ? storedStart
        : trendWeightAtPhaseStart(series, phase?.startDate) ?? Number(trendInfo?.weights?.[0]?.weight);

    if (![start, current, goal].every(value => Number.isFinite(value) && value > 0) || Math.abs(goal - start) < 0.05) {
        return { ready: false, phase, start, current, goal, percent: 0, remaining: null };
    }

    const direction = goal > start ? 1 : -1;
    const totalDistance = Math.abs(goal - start);
    const travelled = Math.max(0, (current - start) * direction);
    const percent = Math.min(100, Math.max(0, (travelled / totalDistance) * 100));
    const remaining = Math.max(0, Math.abs(goal - current));
    return { ready: true, phase, start, current, goal, percent, remaining };
}

function smoothPath(points) {
    if (!points.length) return "";
    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    if (points.length === 1) return path;
    for (let index = 1; index < points.length - 1; index++) {
        const current = points[index];
        const next = points[index + 1];
        path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${((current.x + next.x) / 2).toFixed(2)} ${((current.y + next.y) / 2).toFixed(2)}`;
    }
    const last = points.at(-1);
    return `${path} L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
}

function miniLineSvg(values, className) {
    const usable = values.map(Number);
    if (usable.filter(Number.isFinite).length < 2) return `<div class="dashboard-analytics-empty">More data needed</div>`;
    const finite = usable.filter(Number.isFinite);
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    const range = Math.max(1, max - min);
    const width = 180;
    const height = 54;
    const points = usable.map((value, index) => ({
        x: 5 + (index / Math.max(1, usable.length - 1)) * (width - 10),
        y: Number.isFinite(value) ? 5 + ((max - value) / range) * (height - 10) : null
    })).filter(point => point.y !== null);
    return `<svg class="dashboard-analytics-mini-line ${className}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="${smoothPath(points)}"></path></svg>`;
}

function historyForDates(dates) {
    const startDate = dates[0] || null;
    const points = getCalculatedMaintenanceHistory(null, { startDate });
    const byDate = new Map(points.map(point => [point.date, point]));
    return dates.map(date => {
        const point = byDate.get(date);
        const value = Number(point?.liveMaintenanceCalories ?? point?.maintenanceCalories);
        return Number.isFinite(value) && value > 0 ? value : null;
    });
}

function pairedBars(dates, calories, expenditure) {
    const max = Math.max(1, ...calories.filter(Number.isFinite), ...expenditure.filter(Number.isFinite));
    return `
        <div class="dashboard-analytics-paired-bars" aria-label="Daily calories and expenditure over the last 7 completed days">
            ${dates.map((date, index) => {
                const calorieValue = calories[index];
                const expenditureValue = expenditure[index];
                const calorieHeight = Number.isFinite(calorieValue) ? Math.max(8, Math.round((calorieValue / max) * 100)) : 0;
                const expenditureHeight = Number.isFinite(expenditureValue) ? Math.max(8, Math.round((expenditureValue / max) * 100)) : 0;
                const label = new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(new Date(`${date}T12:00:00`));
                return `<span class="dashboard-analytics-day-pair"><i class="calories ${calorieHeight ? "has-value" : ""}" style="height:${calorieHeight}%"></i><i class="expenditure ${expenditureHeight ? "has-value" : ""}" style="height:${expenditureHeight}%"></i><small>${label}</small></span>`;
            }).join("")}
        </div>
    `;
}

function buildAnalyticsMarkup() {
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const dates = recentCompletedDates(7);
    const calories = dates.map(date => {
        const total = caloriesForEntries(foodLog?.[date]);
        return total > 0 ? total : null;
    });
    const expenditure = historyForDates(dates);
    const currentEstimate = getCalculatedMaintenanceEstimate();
    const trendInfo = currentTrend();
    const trendSeries = Array.isArray(trendInfo.trend?.series) ? trendInfo.trend.series : [];
    const goal = goalProgressData(trendInfo);

    const averageCalories = average(calories);
    const estimateFallback = Number(currentEstimate?.liveMaintenanceCalories ?? currentEstimate?.maintenanceCalories);
    const averageExpenditure = average(expenditure) ?? (Number.isFinite(estimateFallback) && estimateFallback > 0 ? estimateFallback : null);
    const currentWeight = Number(trendInfo.trend?.trendWeight ?? trendSeries.at(-1)?.weight);
    const weightSvg = trendSeries.length >= 2 ? buildDashboardWeightTrendSvg(trendSeries) : "";
    const calorieDelta = Number.isFinite(averageCalories) && Number.isFinite(averageExpenditure)
        ? Math.round(averageCalories - averageExpenditure)
        : null;
    const deltaLabel = calorieDelta === null
        ? "More complete food days needed"
        : calorieDelta === 0
            ? "At estimated energy balance"
            : `${Math.abs(calorieDelta).toLocaleString()} kcal ${calorieDelta > 0 ? "surplus" : "deficit"}`;
    const phaseDays = goal.phase?.startDate
        ? Math.max(1, Math.floor((dateMs(localDateKey()) - dateMs(goal.phase.startDate)) / DAY_MS) + 1)
        : null;

    return `
        <header class="dashboard-analytics-screen-header">
            <button type="button" class="dashboard-analytics-back" data-dashboard-insights-close aria-label="Back">‹</button>
            <div><span class="eyebrow">PROGRESS</span><h2>Insights &amp; Analytics</h2></div>
        </header>
        <main class="dashboard-analytics-screen-body">
            <h3>All</h3>
            <div class="dashboard-analytics-grid">
                <article class="dashboard-analytics-card dashboard-analytics-expenditure-card">
                    <div class="dashboard-analytics-card-heading"><div><h4>Expenditure</h4><small>Last 7 completed days</small></div></div>
                    ${miniLineSvg(expenditure, "is-expenditure")}
                    <div class="dashboard-analytics-card-value"><strong>${Number.isFinite(averageExpenditure) ? Math.round(averageExpenditure).toLocaleString() : "--"}</strong><span>kcal / day</span></div>
                </article>

                <article class="dashboard-analytics-card dashboard-analytics-weight-card">
                    <div class="dashboard-analytics-card-heading"><div><h4>Weight Trend</h4><small>Smoothed trend</small></div></div>
                    <div class="dashboard-analytics-weight-chart">${weightSvg || `<div class="dashboard-analytics-empty">More weigh-ins needed</div>`}</div>
                    <div class="dashboard-analytics-card-value"><strong>${Number.isFinite(currentWeight) ? currentWeight.toFixed(1) : "--"}</strong><span>lb</span></div>
                </article>

                <article class="dashboard-analytics-card dashboard-analytics-balance-card">
                    <div class="dashboard-analytics-card-heading"><div><h4>Calories vs Expenditure</h4><small>Last 7 completed days</small></div></div>
                    ${pairedBars(dates, calories, expenditure)}
                    <div class="dashboard-analytics-compare-values"><span><b>${Number.isFinite(averageCalories) ? Math.round(averageCalories).toLocaleString() : "--"}</b><small>Calories</small></span><span><b>${Number.isFinite(averageExpenditure) ? Math.round(averageExpenditure).toLocaleString() : "--"}</b><small>Expenditure</small></span></div>
                    <p>${deltaLabel}</p>
                </article>

                <article class="dashboard-analytics-card dashboard-analytics-goal-card">
                    <div class="dashboard-analytics-card-heading"><div><h4>Goal Progress</h4><small>${phaseDays ? `Day ${phaseDays} of active phase` : "Active weight goal"}</small></div></div>
                    <div class="dashboard-goal-progress-track" aria-label="${goal.ready ? `${Math.round(goal.percent)} percent of weight goal completed` : "Goal progress unavailable"}"><span style="width:${goal.ready ? goal.percent.toFixed(1) : 0}%"></span></div>
                    <div class="dashboard-goal-progress-value"><strong>${goal.ready ? Math.round(goal.percent) : "--"}<small>${goal.ready ? "%" : ""}</small></strong><span>${goal.ready ? "complete" : "Set a goal weight to track progress"}</span></div>
                    ${goal.ready ? `<div class="dashboard-goal-progress-meta"><span>Start <b>${goal.start.toFixed(1)} lb</b></span><span>Current <b>${goal.current.toFixed(1)} lb</b></span><span>Goal <b>${goal.goal.toFixed(1)} lb</b></span></div><p>${goal.percent >= 100 ? "Goal reached" : `${goal.remaining.toFixed(1)} lb remaining`}</p>` : ""}
                </article>
            </div>
            <div class="dashboard-analytics-legend"><span><i class="calories"></i>Calories</span><span><i class="expenditure"></i>Expenditure</span></div>
        </main>
    `;
}

function ensureSeeAllButton() {
    const heading = document.querySelector("#content .dashboard-command-insights-heading");
    if (!heading || heading.querySelector("[data-dashboard-insights-open]")) return;
    const copy = document.createElement("div");
    copy.className = "dashboard-insights-heading-copy";
    [...heading.children].forEach(child => copy.appendChild(child));
    heading.appendChild(copy);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dashboard-insights-see-all";
    button.dataset.dashboardInsightsOpen = "";
    button.textContent = "See all";
    heading.appendChild(button);
    heading.classList.add("dashboard-command-insights-heading-with-action");
}

export function openDashboardInsights() {
    document.getElementById(SCREEN_ID)?.remove();
    const screen = document.createElement("section");
    screen.id = SCREEN_ID;
    screen.className = "dashboard-analytics-screen";
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-label", "Insights and Analytics");
    screen.innerHTML = buildAnalyticsMarkup();
    document.body.appendChild(screen);
    document.body.classList.add("dashboard-insights-open");
    requestAnimationFrame(() => screen.classList.add("is-visible"));
    screen.querySelector("[data-dashboard-insights-close]")?.focus({ preventScroll: true });
}

export function closeDashboardInsights() {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    screen.classList.remove("is-visible");
    document.body.classList.remove("dashboard-insights-open");
    window.setTimeout(() => screen.remove(), 180);
}

function refreshOpenScreen() {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    screen.innerHTML = buildAnalyticsMarkup();
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-dashboard-insights-open]")) {
        openDashboardInsights();
        return;
    }
    if (event.target.closest("[data-dashboard-insights-close]")) closeDashboardInsights();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.getElementById(SCREEN_ID)) closeDashboardInsights();
});

const content = document.getElementById("content");
if (content) new MutationObserver(ensureSeeAllButton).observe(content, { childList: true, subtree: true });

["levelup:nutrition-updated", "levelup:nutrition-phase-updated", "levelup:weight-updated"].forEach(name => {
    window.addEventListener(name, () => {
        ensureSeeAllButton();
        refreshOpenScreen();
    });
});
window.addEventListener("storage", event => {
    if ([FOOD_LOG_KEY, WEIGHT_KEY, PHASES_KEY, GOAL_WEIGHT_KEY].includes(event.key)) refreshOpenScreen();
});

ensureSeeAllButton();
