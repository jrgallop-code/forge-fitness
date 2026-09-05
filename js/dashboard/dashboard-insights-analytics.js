import { calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "../nutrition/calculated-maintenance.js?v=dashboard-see-more-2";
import { calculateTdee } from "../nutrition/tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "../nutrition/nutrition-storage.js?v=nutrition-phase-1";
import { buildCaloriesExpenditureState, renderCaloriesExpenditureChart } from "../nutrition/calorie-expenditure-shared.js?v=authoritative-graphs-1";

const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const TDEE_RANGE_KEY = "level_up_tdee_chart_range_v1";
const SCREEN_ID = "dashboard-insights-analytics-screen";
const DAY_MS = 86400000;
const RANGE_OPTIONS = {
    "1w": 7,
    "1m": 30,
    "3m": 90,
    "6m": 180
};

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}
function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dateMs(key) { return new Date(`${key}T12:00:00`).getTime(); }
function shiftDateKey(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return value;
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}
function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}
function themeColor(token, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}
function activePhase() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases)
        ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) || null
        : null;
}
function currentTrend() {
    const today = localDateKey();
    const weights = normalizeWeightEntries(readJson(WEIGHT_KEY, [])).filter(entry => entry.date <= today);
    return { weights, trend: calculateVisibleWeightTrend(weights) };
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
    const goal = Number.isFinite(phaseGoal) && phaseGoal > 0 ? phaseGoal : Number.isFinite(legacyGoal) && legacyGoal > 0 ? legacyGoal : null;
    const storedStart = Number(phase?.startingTrendWeight ?? phase?.startWeight);
    const start = Number.isFinite(storedStart) && storedStart > 0
        ? storedStart
        : trendWeightAtPhaseStart(series, phase?.startDate) ?? Number(trendInfo?.weights?.[0]?.weight);
    if (![start, current, goal].every(value => Number.isFinite(value) && value > 0) || Math.abs(goal - start) < .05) {
        return { ready: false, phase, start, current, goal, percent: 0, remaining: null };
    }
    const direction = goal > start ? 1 : -1;
    const totalDistance = Math.abs(goal - start);
    const travelled = Math.max(0, (current - start) * direction);
    const percent = Math.min(100, Math.max(0, travelled / totalDistance * 100));
    return { ready: true, phase, start, current, goal, percent, remaining: Math.max(0, Math.abs(goal - current)) };
}
function profileMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || Number(profile.age) < 18) return null;
    try {
        const value = Number(calculateTdee(profile).tdee);
        return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
    } catch { return null; }
}
function selectedExpenditureRange(phase) {
    const requested = String(localStorage.getItem(TDEE_RANGE_KEY) || "3m").toLowerCase();
    if (requested === "phase" && phase?.startDate) return requested;
    if (requested === "all" || RANGE_OPTIONS[requested]) return requested;
    return "3m";
}
function expenditureWindowStart(range, phase, endDate) {
    if (range === "all") return null;
    if (range === "phase") return phase?.startDate || endDate;
    return shiftDateKey(endDate, -(RANGE_OPTIONS[range] - 1));
}
function authoritativeExpenditure() {
    const phase = activePhase();
    const range = selectedExpenditureRange(phase);
    const today = localDateKey();
    const startDate = expenditureWindowStart(range, phase, today);
    const formula = profileMaintenance();
    const current = getCalculatedMaintenanceEstimate(formula);
    const raw = (getCalculatedMaintenanceHistory(formula, startDate ? { startDate: shiftDateKey(startDate, -28) } : undefined) || []).map(point => ({ ...point }));
    const currentLive = positive(current?.liveMaintenanceCalories);
    const currentReviewed = positive(current?.maintenanceCalories);
    const todayPoint = raw.find(point => point?.date === today);
    if (todayPoint) {
        if (currentLive !== null) todayPoint.liveMaintenanceCalories = currentLive;
        if (currentReviewed !== null) todayPoint.maintenanceCalories = currentReviewed;
    } else if (currentLive !== null || currentReviewed !== null) {
        raw.push({ date: today, liveMaintenanceCalories: currentLive, maintenanceCalories: currentReviewed });
    }
    raw.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let lastUsable = null;
    const allPoints = raw.map(point => {
        const live = positive(point.liveMaintenanceCalories);
        const reviewed = positive(point.maintenanceCalories);
        if (live !== null) {
            lastUsable = live;
            return { date: point.date, value: live, mode: "updating" };
        }
        const held = lastUsable ?? reviewed;
        if (held !== null) {
            lastUsable = held;
            return { date: point.date, value: held, mode: "holding" };
        }
        return null;
    }).filter(Boolean);
    const visibleStart = startDate || allPoints[0]?.date || today;
    const points = allPoints.filter(point => point.date >= visibleStart && point.date <= today);
    const currentValue = currentLive ?? currentReviewed ?? positive(points.at(-1)?.value);
    return { range, startDate: visibleStart, endDate: today, formula, current, currentValue, points };
}
function expenditureScale(values) {
    const finite = values.filter(Number.isFinite);
    if (!finite.length) return { min: 1500, max: 3500 };
    const minValue = Math.min(...finite);
    const maxValue = Math.max(...finite);
    const padding = Math.max(125, (maxValue - minValue) * .2);
    const min = Math.floor((minValue - padding) / 250) * 250;
    const max = Math.ceil((maxValue + padding) / 250) * 250;
    return { min, max: max <= min ? min + 500 : max };
}
function renderExpenditureChart(card, data, { animate = true } = {}) {
    const canvas = card.querySelector("[data-dashboard-expenditure-chart]");
    const shell = canvas?.closest(".dashboard-expenditure-chart-shell");
    if (!canvas || !shell) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const points = data.points;
    if (!points.length) return;
    let progress = animate && !matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
    let frame = null;
    const draw = () => {
        const ratio = Math.min(2, devicePixelRatio || 1);
        const width = Math.max(280, Math.round(shell.clientWidth || 320));
        const height = 250;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        const padding = { top: 18, right: 46, bottom: 30, left: 8 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const first = dateMs(data.startDate);
        const last = dateMs(data.endDate);
        const elapsed = Math.max(1, last - first);
        const x = point => padding.left + ((dateMs(point.date) - first) / elapsed) * plotWidth;
        const scaleValues = points.map(point => point.value);
        if (Number.isFinite(data.formula)) scaleValues.push(data.formula);
        const scale = expenditureScale(scaleValues);
        const y = value => padding.top + (1 - (value - scale.min) / Math.max(1, scale.max - scale.min)) * plotHeight;
        const muted = themeColor("--muted", "#85858f");
        const lineColor = themeColor("--line", "rgba(255,255,255,.09)");
        const accent = themeColor("--accent", "#ff3b4b");
        const cardColor = themeColor("--card", "#1b1b1f");
        context.font = "800 9px Arial";
        context.textAlign = "left";
        context.textBaseline = "middle";
        for (let index = 0; index <= 4; index += 1) {
            const value = scale.max - (scale.max - scale.min) * index / 4;
            const yy = padding.top + plotHeight * index / 4;
            context.strokeStyle = lineColor;
            context.lineWidth = 1;
            context.setLineDash([3, 3]);
            context.beginPath();
            context.moveTo(padding.left, yy);
            context.lineTo(width - padding.right + 4, yy);
            context.stroke();
            context.setLineDash([]);
            context.fillStyle = muted;
            context.fillText(Math.round(value).toLocaleString(), width - padding.right + 9, yy);
        }
        if (Number.isFinite(data.formula) && data.formula >= scale.min && data.formula <= scale.max) {
            context.save();
            context.setLineDash([5, 5]);
            context.strokeStyle = muted;
            context.globalAlpha = .72;
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(padding.left, y(data.formula));
            context.lineTo(width - padding.right + 4, y(data.formula));
            context.stroke();
            context.restore();
        }
        const visible = Math.max(0, Math.min(points.length - 1, progress * (points.length - 1)));
        const fullSegments = Math.floor(visible);
        const partial = visible - fullSegments;
        for (let index = 1; index <= fullSegments; index += 1) {
            const previous = points[index - 1];
            const point = points[index];
            context.save();
            context.strokeStyle = accent;
            context.lineWidth = point.mode === "holding" ? 2 : 2.75;
            context.globalAlpha = point.mode === "holding" ? .46 : .96;
            context.setLineDash(point.mode === "holding" ? [5, 5] : []);
            context.beginPath();
            context.moveTo(x(previous), y(previous.value));
            context.lineTo(x(point), y(point.value));
            context.stroke();
            context.restore();
        }
        if (partial > 0 && fullSegments + 1 < points.length) {
            const previous = points[fullSegments];
            const point = points[fullSegments + 1];
            context.save();
            context.strokeStyle = accent;
            context.lineWidth = point.mode === "holding" ? 2 : 2.75;
            context.globalAlpha = point.mode === "holding" ? .46 : .96;
            context.setLineDash(point.mode === "holding" ? [5, 5] : []);
            context.beginPath();
            context.moveTo(x(previous), y(previous.value));
            context.lineTo(x(previous) + (x(point) - x(previous)) * partial, y(previous.value) + (y(point.value) - y(previous.value)) * partial);
            context.stroke();
            context.restore();
        }
        if (progress >= 1) {
            const stride = points.length > 180 ? 14 : points.length > 90 ? 7 : points.length > 45 ? 3 : 1;
            points.forEach((point, index) => {
                if (index % stride !== 0 && index !== points.length - 1) return;
                context.save();
                context.strokeStyle = accent;
                context.fillStyle = cardColor;
                context.globalAlpha = point.mode === "holding" ? .56 : 1;
                context.lineWidth = 2;
                context.beginPath();
                if (point.mode === "holding") context.rect(x(point) - 3, y(point.value) - 3, 6, 6);
                else context.arc(x(point), y(point.value), 3.2, 0, Math.PI * 2);
                context.fill();
                context.stroke();
                context.restore();
            });
        }
        context.fillStyle = muted;
        context.font = "800 8px Arial";
        context.textAlign = "center";
        context.textBaseline = "alphabetic";
        const labelCount = data.range === "1w" ? 7 : 5;
        for (let index = 0; index < labelCount; index += 1) {
            const pointX = padding.left + index / Math.max(1, labelCount - 1) * plotWidth;
            const key = localDateKey(new Date(first + (last - first) * index / Math.max(1, labelCount - 1)));
            const label = new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
            context.fillText(label, pointX, height - 7);
        }
    };
    card.__levelUpDashboardExpenditureDraw = draw;
    draw();
    if (progress < 1) {
        const started = performance.now();
        const duration = 950;
        const tick = now => {
            progress = Math.min(1, (now - started) / duration);
            draw();
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
    }
    card.__levelUpDashboardExpenditureCancelAnimation = () => frame && cancelAnimationFrame(frame);
}
function goalMarkup(goal) {
    const phaseDays = goal.phase?.startDate
        ? Math.max(1, Math.floor((dateMs(localDateKey()) - dateMs(goal.phase.startDate)) / DAY_MS) + 1)
        : null;
    return `
        <article class="dashboard-analytics-card dashboard-analytics-goal-card">
            <div class="dashboard-analytics-card-heading"><div><h4>Goal Progress</h4><small>${phaseDays ? `Day ${phaseDays} of active phase` : "Active weight goal"}</small></div></div>
            <div class="dashboard-goal-progress-track" aria-label="${goal.ready ? `${Math.round(goal.percent)} percent of weight goal completed` : "Goal progress unavailable"}"><span style="width:${goal.ready ? goal.percent.toFixed(1) : 0}%"></span></div>
            <div class="dashboard-goal-progress-value"><strong>${goal.ready ? Math.round(goal.percent) : "--"}<small>${goal.ready ? "%" : ""}</small></strong><span>${goal.ready ? "complete" : "Set a goal weight to track progress"}</span></div>
            ${goal.ready ? `<div class="dashboard-goal-progress-meta"><span>Start <b>${goal.start.toFixed(1)} lb</b></span><span>Current <b>${goal.current.toFixed(1)} lb</b></span><span>Goal <b>${goal.goal.toFixed(1)} lb</b></span></div><p>${goal.percent >= 100 ? "Goal reached" : `${goal.remaining.toFixed(1)} lb remaining`}</p>` : ""}
        </article>`;
}
function buildAnalyticsMarkup() {
    const trendInfo = currentTrend();
    const goal = goalProgressData(trendInfo);
    const expenditure = authoritativeExpenditure();
    const currentValue = expenditure.currentValue;
    return `
        <header class="dashboard-analytics-screen-header">
            <button type="button" class="dashboard-analytics-back" data-dashboard-insights-close aria-label="Back">‹</button>
            <div><span class="eyebrow">MORE INSIGHTS</span><h2>Additional Analytics</h2></div>
        </header>
        <main class="dashboard-analytics-screen-body">
            <div class="dashboard-analytics-stack">
                ${goalMarkup(goal)}
                <article class="dashboard-analytics-card dashboard-analytics-expenditure-card" data-dashboard-expenditure-card>
                    <div class="dashboard-analytics-card-heading"><div><h4>Expenditure</h4><small>Same range and daily estimate used in Progress</small></div></div>
                    <div class="dashboard-expenditure-chart-shell"><canvas data-dashboard-expenditure-chart role="img" aria-label="Expenditure over time"></canvas></div>
                    <div class="dashboard-analytics-card-value"><strong>${Number.isFinite(currentValue) ? Math.round(currentValue).toLocaleString() : "--"}</strong><span>current kcal / day</span></div>
                </article>
                <article class="dashboard-analytics-card dashboard-analytics-balance-card" data-dashboard-calorie-expenditure-card>
                    <div class="dashboard-analytics-card-heading"><div><h4>Calories vs Expenditure</h4><small>Same graph and range used in Progress</small></div></div>
                    <div class="calorie-expenditure-shell">
                        <canvas data-calorie-expenditure-chart role="img" aria-label="Daily calories compared with daily expenditure"></canvas>
                        <div class="calorie-expenditure-tooltip" data-calorie-expenditure-tooltip hidden aria-live="polite"></div>
                    </div>
                    <div class="calorie-expenditure-legend" aria-hidden="true"><span><i class="is-calories"></i>Calories</span><span><i class="is-expenditure"></i>Expenditure</span></div>
                    <p class="calorie-expenditure-hint">Tap or drag for daily values.</p>
                </article>
            </div>
        </main>`;
}
function ensureSeeMoreButton() {
    const dashboard = document.querySelector("#content .dashboard.dashboard-command-insights");
    const weightCard = dashboard?.querySelector(".dashboard-weight-trend-card");
    if (!dashboard || !weightCard) return;
    let row = dashboard.querySelector("[data-dashboard-see-more-row]");
    if (!row) {
        row = document.createElement("div");
        row.className = "dashboard-insights-see-more-row";
        row.dataset.dashboardSeeMoreRow = "";
        row.innerHTML = `<button type="button" class="dashboard-insights-see-all" data-dashboard-insights-open>See More</button>`;
    }
    if (row.nextElementSibling !== weightCard) weightCard.insertAdjacentElement("beforebegin", row);
    document.querySelector("#content .dashboard-command-insights-heading")?.classList.remove("dashboard-command-insights-heading-with-action");
    document.querySelector("#content .dashboard-command-insights-heading [data-dashboard-insights-open]")?.remove();
}
function renderScreenCharts(screen) {
    const expenditureCard = screen.querySelector("[data-dashboard-expenditure-card]");
    if (expenditureCard) renderExpenditureChart(expenditureCard, authoritativeExpenditure(), { animate: true });
    const comparisonCard = screen.querySelector("[data-dashboard-calorie-expenditure-card]");
    if (comparisonCard) renderCaloriesExpenditureChart(comparisonCard, buildCaloriesExpenditureState(), { animateLine: true });
}
export function openDashboardInsights() {
    document.getElementById(SCREEN_ID)?.remove();
    const screen = document.createElement("section");
    screen.id = SCREEN_ID;
    screen.className = "dashboard-analytics-screen";
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-label", "Additional analytics");
    screen.innerHTML = buildAnalyticsMarkup();
    document.body.appendChild(screen);
    document.body.classList.add("dashboard-insights-open");
    requestAnimationFrame(() => {
        screen.classList.add("is-visible");
        renderScreenCharts(screen);
    });
    screen.querySelector("[data-dashboard-insights-close]")?.focus({ preventScroll: true });
}
export function closeDashboardInsights() {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    screen.querySelector("[data-dashboard-expenditure-card]")?.__levelUpDashboardExpenditureCancelAnimation?.();
    screen.querySelector("[data-dashboard-calorie-expenditure-card]")?.__levelUpCaloriesExpenditureCancelAnimation?.();
    screen.classList.remove("is-visible");
    document.body.classList.remove("dashboard-insights-open");
    setTimeout(() => screen.remove(), 180);
}
function refreshOpenScreen() {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    screen.innerHTML = buildAnalyticsMarkup();
    renderScreenCharts(screen);
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
if (content) new MutationObserver(ensureSeeMoreButton).observe(content, { childList: true, subtree: true });
["levelup:nutrition-updated", "levelup:food-log-updated", "levelup:weight-updated", "levelup:nutrition-phase-updated", "levelup:appearance-changed"]
    .forEach(name => window.addEventListener(name, refreshOpenScreen));
window.addEventListener("resize", () => {
    const screen = document.getElementById(SCREEN_ID);
    screen?.querySelector("[data-dashboard-expenditure-card]")?.__levelUpDashboardExpenditureDraw?.();
    screen?.querySelector("[data-dashboard-calorie-expenditure-card]")?.__levelUpCaloriesExpenditureDraw?.();
});
ensureSeeMoreButton();
