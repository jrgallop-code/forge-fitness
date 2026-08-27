import { calculatePhaseMovingAverageTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=future-weight-test-1";
import { buildDashboardWeightTrendSvg } from "../dashboard/dashboard-weight-trend-svg.js?v=dashboard-weight-style-sync-1";

const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const RANGE_KEY = "level_up_weight_chart_range";
const DAY_MS = 86400000;
const MIN_TREND_DAY = 7;
const FIRST_CHECK_DAY = 14;
const MIN_ENTRIES_PER_WINDOW = 4;
const DAILY_WEIGHT_LINE = "rgba(190, 190, 200, 0.35)";
const DAILY_WEIGHT_POINT = "rgba(255, 255, 255, 0.88)";
const RANGE_DAYS = { "1w": 7, "1m": 30, "3m": 90, "6m": 180 };

let queued = false;
let lastCoachSignature = "";
let lastDashboardSignature = "";

function readWeights() {
    try {
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]"));
    } catch {
        return [];
    }
}

function readPhases() {
    try {
        const phases = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
        return Array.isArray(phases) ? phases : [];
    } catch {
        return [];
    }
}

function getActivePhase() {
    return [...readPhases()].reverse().find(phase => phase?.startDate && !phase?.endDate) || null;
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(value) {
    return new Date(`${value}T12:00:00`).getTime();
}

function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return localDate(date);
}

function getFutureTestDate(weights) {
    const today = localDate();
    const latest = weights.at(-1)?.date || null;
    return latest && latest > today ? latest : null;
}

function getStartingTrendWeight(phase, weights) {
    const saved = Number(phase?.startingTrendWeight);
    if (Number.isFinite(saved) && saved > 0) return saved;
    const eligible = weights.filter(entry => entry.date <= phase?.startDate);
    if (!eligible.length) return null;
    const latest = eligible.at(-1);
    const cutoff = dateMs(latest.date) - (6 * DAY_MS);
    const recent = eligible.filter(entry => dateMs(entry.date) >= cutoff);
    if (!recent.length) return latest.weight;
    return recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length;
}

function calculateMovingAverage(entries) {
    return entries.map(entry => {
        const currentTime = dateMs(entry.date);
        const windowStart = currentTime - (6 * DAY_MS);
        const windowEntries = entries.filter(item => {
            const time = dateMs(item.date);
            return time >= windowStart && time <= currentTime;
        });
        return {
            date: entry.date,
            weight: windowEntries.reduce((sum, item) => sum + item.weight, 0) / windowEntries.length
        };
    });
}

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/week`;
}

function formatShortDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function evaluateRate(actual, target, referenceWeight) {
    const actualRate = Number(actual);
    const targetRate = Number(target);
    const weight = Number(referenceWeight);
    const bodyweightTolerance = Number.isFinite(weight) && weight > 0 ? weight * 0.001 : 0.1;
    const targetTolerance = Number.isFinite(targetRate) ? Math.abs(targetRate) * 0.25 : 0;
    const tolerance = Math.max(bodyweightTolerance, targetTolerance);

    if (!Number.isFinite(actualRate) || !Number.isFinite(targetRate)) return "NEED MORE DATA";
    if (Math.abs(targetRate) < 0.005) {
        if (Math.abs(actualRate) <= tolerance) return "MAINTAINING";
        return actualRate > 0 ? "TRENDING UP" : "TRENDING DOWN";
    }

    const difference = actualRate - targetRate;
    const absoluteDifference = Math.abs(difference);
    if (absoluteDifference <= tolerance) return "ON TRACK";
    if (absoluteDifference <= tolerance * 2) {
        const paceDifference = difference * Math.sign(targetRate);
        return paceDifference > 0 ? "SLIGHTLY FASTER" : "SLIGHTLY SLOWER";
    }
    return "NEEDS ATTENTION";
}

function buildCaloriePreview(actual, target, currentCalories) {
    if (![actual, target, currentCalories].every(value => Number.isFinite(Number(value)))) return null;
    const rawGap = (Number(target) - Number(actual)) * 500;
    let fullGap = Math.round(rawGap / 50) * 50;
    if (fullGap === 0 && Math.abs(rawGap) > 0.001) fullGap = Math.sign(rawGap) * 50;
    const estimatedTarget = Math.max(1, Math.round(Number(currentCalories) + fullGap));
    let firstStep = Math.round((fullGap * 0.5) / 25) * 25;
    if (firstStep === 0 && fullGap !== 0) firstStep = Math.sign(fullGap) * 25;
    firstStep = Math.max(-150, Math.min(150, firstStep));
    return {
        estimatedTarget,
        firstStep,
        firstStepCalories: Math.max(1, Math.round(Number(currentCalories) + firstStep))
    };
}

function ensureStyles() {
    if (document.getElementById("future-weight-testing-styles")) return;
    const style = document.createElement("style");
    style.id = "future-weight-testing-styles";
    style.textContent = `
        .future-weight-test-card{border-color:rgba(250,204,21,.28)!important;box-shadow:inset 3px 0 0 rgba(250,204,21,.75)}
        .future-weight-test-card .future-weight-test-note{margin:8px 0 0;color:var(--muted,#a1a1aa);font-size:10px;line-height:1.4}
        .future-weight-test-card .future-weight-test-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
        .future-weight-test-card .future-weight-test-metric{padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:10px;background:rgba(255,255,255,.025)}
        .future-weight-test-card .future-weight-test-metric span{display:block;color:var(--muted,#a1a1aa);font-size:10px;text-transform:uppercase;letter-spacing:.04em}
        .future-weight-test-card .future-weight-test-metric strong{display:block;margin-top:3px;font-size:14px}
        .dashboard.dashboard-command-insights .metric-card.future-dashboard-weight-trend-card{min-height:132px;padding:0;overflow:hidden}
    `;
    document.head.appendChild(style);
}

function getChartWindow(range, entries, phase, testDate) {
    if (range === "phase" && phase?.startDate) {
        return { startDate: String(phase.startDate), endDate: testDate, label: "Current phase" };
    }
    if (range === "all") {
        return { startDate: entries[0]?.date || testDate, endDate: testDate, label: "All time" };
    }
    const days = RANGE_DAYS[range] || 7;
    return { startDate: shiftDate(testDate, -(days - 1)), endDate: testDate, label: String(range || "1w").toUpperCase() };
}

function readGoalWeight(phase) {
    const phaseGoal = Number(phase?.goalWeight ?? phase?.targetWeight);
    if (Number.isFinite(phaseGoal) && phaseGoal > 0) return phaseGoal;
    const stored = Number(localStorage.getItem(GOAL_WEIGHT_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
}

function redrawFutureChart(weights, phase, testDate) {
    const canvas = document.getElementById("weight-trend-chart");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const range = String(localStorage.getItem(RANGE_KEY) || "1w").toLowerCase();
    const chartWindow = getChartWindow(range, weights, phase, testDate);
    const movingAverage = calculateMovingAverage(weights);
    const entries = weights.filter(entry => entry.date >= chartWindow.startDate && entry.date <= chartWindow.endDate);
    const trend = movingAverage.filter(entry => entry.date >= chartWindow.startDate && entry.date <= chartWindow.endDate);
    const goalWeight = readGoalWeight(phase);

    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
    const height = 400;
    const scale = globalThis.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.height = `${height}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    canvas.setAttribute("aria-label", `Weight chart through future test date ${testDate}`);

    if (!entries.length) return;

    const dataValues = [...entries.map(item => item.weight), ...trend.map(item => item.weight)].filter(Number.isFinite);
    const dataMinimum = Math.min(...dataValues);
    const dataMaximum = Math.max(...dataValues);
    const dataSpan = Math.max(0.5, dataMaximum - dataMinimum);
    const scalePadding = Math.max(0.75, dataSpan * 0.18);
    let minimum = dataMinimum - scalePadding;
    let maximum = dataMaximum + scalePadding;
    const showGoal = goalWeight !== null && (range === "all" || (goalWeight >= minimum && goalWeight <= maximum));
    if (showGoal && range === "all") {
        minimum = Math.min(minimum, goalWeight - 1);
        maximum = Math.max(maximum, goalWeight + 1);
    }

    const valueRange = Math.max(1, maximum - minimum);
    const padding = { left: 58, right: 22, top: 62, bottom: 48 };
    const chartWidth = Math.max(1, width - padding.left - padding.right);
    const chartHeight = Math.max(1, height - padding.top - padding.bottom);
    const firstTime = dateMs(chartWindow.startDate);
    const lastTime = dateMs(chartWindow.endDate);
    const elapsed = Math.max(1, lastTime - firstTime);
    const xPosition = date => padding.left + ((dateMs(date) - firstTime) / elapsed) * chartWidth;
    const yPosition = weight => padding.top + ((maximum - weight) / valueRange) * chartHeight;

    context.font = "10px Arial";
    context.textAlign = "left";
    context.fillStyle = "#b9b9c1";
    drawLegendItem(context, 58, 18, DAILY_WEIGHT_LINE, "Daily Weight", false, true);
    drawLegendItem(context, 185, 18, TREND_GREEN, "Trend Line", true, false);
    context.fillStyle = "#facc15";
    context.font = "700 10px Arial";
    context.fillText(`TEST THROUGH ${formatShortDate(testDate).toUpperCase()}`, 58, 42);

    context.strokeStyle = "#303037";
    context.lineWidth = 1;
    for (let index = 0; index <= 4; index += 1) {
        const y = padding.top + (chartHeight * index / 4);
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.fillStyle = "#a0a0a8";
        context.font = "11px Arial";
        context.textAlign = "right";
        context.fillText((maximum - (valueRange * index / 4)).toFixed(1), padding.left - 8, y + 4);
    }

    context.fillStyle = "#a0a0a8";
    context.font = "11px Arial";
    context.textAlign = "left";
    context.fillText(formatShortDate(chartWindow.startDate), padding.left, height - 16);
    context.textAlign = "right";
    context.fillText(formatShortDate(chartWindow.endDate), width - padding.right, height - 16);

    context.save();
    context.strokeStyle = DAILY_WEIGHT_LINE;
    context.lineWidth = 1.25;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    entries.forEach((entry, index) => {
        const x = xPosition(entry.date);
        const y = yPosition(entry.weight);
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();

    context.save();
    context.strokeStyle = TREND_GREEN;
    context.lineWidth = 1.5;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.setLineDash([6, 5]);
    context.beginPath();
    trend.forEach((entry, index) => {
        const x = xPosition(entry.date);
        const y = yPosition(entry.weight);
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();

    context.fillStyle = DAILY_WEIGHT_POINT;
    entries.forEach(entry => {
        context.beginPath();
        context.arc(xPosition(entry.date), yPosition(entry.weight), 2.5, 0, Math.PI * 2);
        context.fill();
    });

    if (showGoal) {
        context.save();
        context.strokeStyle = "#facc15";
        context.lineWidth = 2;
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(padding.left, yPosition(goalWeight));
        context.lineTo(width - padding.right, yPosition(goalWeight));
        context.stroke();
        context.restore();
    }
}

function drawLegendItem(context, x, y, color, label, dashed, point) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = dashed ? 2 : 1.25;
    if (dashed) context.setLineDash([5, 4]);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 18, y);
    context.stroke();
    if (point) {
        context.fillStyle = DAILY_WEIGHT_POINT;
        context.beginPath();
        context.arc(x + 9, y, 2.5, 0, Math.PI * 2);
        context.fill();
    }
    context.restore();
    context.fillStyle = "#b9b9c1";
    context.font = "10px Arial";
    context.textAlign = "left";
    context.fillText(label, x + 25, y + 3);
}

function renderFutureCoach(weights, phase, testDate) {
    const normalCard = document.getElementById("goal-check-in-card");
    if (!normalCard || !phase) return;

    normalCard.hidden = true;
    const entries = weights.filter(entry => entry.date >= phase.startDate && entry.date <= testDate);
    const startingTrendWeight = getStartingTrendWeight(phase, weights);
    const phaseDay = Math.max(1, Math.floor((dateMs(testDate) - dateMs(phase.startDate)) / DAY_MS) + 1);
    const trend = calculatePhaseMovingAverageTrend(entries, {
        phaseStartDate: phase.startDate,
        asOfDate: testDate,
        startingTrendWeight,
        minEntriesPerWindow: MIN_ENTRIES_PER_WINDOW,
        rolling: phaseDay < FIRST_CHECK_DAY
    });
    const target = Number(phase.targetWeeklyRate);
    const currentCalories = Number(phase.currentCalories ?? phase.startCalories);

    let status = "NEED MORE DATA";
    let message = "";
    let suggestion = "";

    if (trend.reason === "before-first-trend") {
        status = "BUILDING TREND";
        message = `Mock date is Day ${trend.phaseDay}. Keep adding dated weigh-ins to reach the Day ${MIN_TREND_DAY} preliminary trend.`;
        suggestion = `Preliminary trend in ${trend.daysUntilTrend} simulated day${trend.daysUntilTrend === 1 ? "" : "s"}.`;
    } else if (trend.status === "preliminary" && Number.isFinite(trend.weeklyChange)) {
        status = "PRELIMINARY TREND";
        message = `Preliminary rolling trend: ${formatRate(trend.weeklyChange)}. This uses your future-dated mock entries through ${formatShortDate(testDate)}.`;
        suggestion = `Informational only. First calorie decision is Day ${FIRST_CHECK_DAY}${trend.daysUntilCheck > 0 ? ` · in ${trend.daysUntilCheck} simulated day${trend.daysUntilCheck === 1 ? "" : "s"}` : ""}.`;
    } else if (trend.status !== "actual" || !Number.isFinite(trend.weeklyChange)) {
        status = "NEED MORE DATA";
        message = Number.isFinite(trend.checkDay)
            ? `The Day ${trend.checkDay} mock check needs at least ${MIN_ENTRIES_PER_WINDOW} weigh-ins in each 7-day block.`
            : `At least ${MIN_ENTRIES_PER_WINDOW} weigh-ins are needed in the current 7-day window.`;
        suggestion = "Add more mock weigh-ins to test the next coach state.";
    } else {
        status = evaluateRate(trend.weeklyChange, target, trend.currentAverage);
        const onTarget = ["ON TRACK", "MAINTAINING"].includes(status);
        const preview = onTarget ? null : buildCaloriePreview(trend.weeklyChange, target, currentCalories);
        message = `Mock Day ${trend.checkDay} check: actual ${formatRate(trend.weeklyChange)} versus target ${formatRate(target)}.`;
        suggestion = preview
            ? `Preview only: estimated target ${preview.estimatedTarget} kcal/day · first step ${preview.firstStep > 0 ? "+" : ""}${preview.firstStep} → ${preview.firstStepCalories} kcal/day.`
            : Number.isFinite(currentCalories)
                ? `On target in this mock scenario. Keep ${Math.round(currentCalories)} kcal/day.`
                : "On target in this mock scenario.";
    }

    const signature = JSON.stringify({ testDate, status, trend, target, currentCalories, message, suggestion });
    let card = document.getElementById("future-weight-test-coach");
    if (!card) {
        card = document.createElement("section");
        card.id = "future-weight-test-coach";
        card.className = `${normalCard.className || "goal-box"} future-weight-test-card`;
        normalCard.insertAdjacentElement("beforebegin", card);
    }
    if (signature === lastCoachSignature) return;
    lastCoachSignature = signature;

    card.innerHTML = `
        <span class="eyebrow">PHASE CHECK-IN · TEST DATE ${formatShortDate(testDate).toUpperCase()}</span>
        <div class="goal-check-in-heading"><h3>${status}</h3><small>Future mock-data preview</small></div>
        <p class="nutrition-message">${message}</p>
        <div class="future-weight-test-grid">
            <div class="future-weight-test-metric"><span>${trend.status === "preliminary" ? "Starting Trend" : "Previous 7-Day Avg"}</span><strong>${Number.isFinite(trend.previousAverage) ? `${trend.previousAverage.toFixed(1)} lb` : "--"}</strong></div>
            <div class="future-weight-test-metric"><span>Current 7-Day Avg</span><strong>${Number.isFinite(trend.currentAverage) ? `${trend.currentAverage.toFixed(1)} lb` : "--"}</strong></div>
            <div class="future-weight-test-metric"><span>Weekly Change</span><strong>${formatRate(trend.weeklyChange)}</strong></div>
            <div class="future-weight-test-metric"><span>Target</span><strong>${formatRate(target)}</strong></div>
        </div>
        <strong>${suggestion}</strong>
        <p class="future-weight-test-note">Testing mode is active because you have a weigh-in dated after today. Mock future data can preview the coach but cannot apply a calorie change.</p>
    `;
}

function renderFutureDashboard(weights, phase, testDate) {
    const dashboard = document.querySelector("#content .dashboard.dashboard-command-insights, #content .dashboard");
    if (!dashboard) return;
    let card = dashboard.querySelector(".future-dashboard-weight-trend-card, .dashboard-weight-trend-card");
    if (!card) return;

    const phaseEntries = phase?.startDate
        ? weights.filter(entry => entry.date >= phase.startDate && entry.date <= testDate)
        : weights.filter(entry => entry.date <= testDate);
    const startDate = phase?.startDate || phaseEntries[0]?.date || testDate;
    const elapsedDays = Math.max(1, Math.floor((dateMs(testDate) - dateMs(startDate)) / DAY_MS) + 1);
    const weighIns = new Set(phaseEntries.map(entry => entry.date)).size;
    const ready = elapsedDays >= MIN_TREND_DAY && weighIns >= MIN_ENTRIES_PER_WINDOW;
    const trend = ready ? calculateMovingAverage(weights.filter(entry => entry.date <= testDate)) : [];
    const recent = trend.filter(point => dateMs(point.date) >= dateMs(testDate) - 6 * DAY_MS);
    const latest = recent.at(-1)?.weight ?? null;
    const signature = JSON.stringify({ testDate, elapsedDays, weighIns, recent });
    if (signature === lastDashboardSignature && card.classList.contains("future-dashboard-weight-trend-card")) return;
    lastDashboardSignature = signature;

    card.classList.remove("dashboard-weight-trend-card");
    card.classList.add("future-dashboard-weight-trend-card");
    const chart = buildDashboardWeightTrendSvg(trend);
    card.innerHTML = `
        <button type="button" class="dashboard-weight-trend-button" data-dashboard-weight-trend-open aria-label="Open Weight Progress">
            <span class="dashboard-weight-trend-heading"><span><h3>Weight Trend</h3><small>Test through ${formatShortDate(testDate)}</small></span></span>
            <span class="dashboard-weight-trend-chart" aria-hidden="true">
                ${ready && chart ? chart : `<span class="dashboard-weight-trend-empty">Future test data</span>`}
            </span>
            <span class="dashboard-weight-trend-value">
                ${ready && Number.isFinite(latest) ? `<strong>${latest.toFixed(1)} lb</strong><small>mock trend weight</small>` : `<strong>Day ${Math.min(elapsedDays, MIN_TREND_DAY)} / ${MIN_TREND_DAY}</strong><small>${Math.min(weighIns, MIN_ENTRIES_PER_WINDOW)} / ${MIN_ENTRIES_PER_WINDOW} weigh-ins</small>`}
            </span>
        </button>
    `;
}

function cleanupFutureMode() {
    document.getElementById("future-weight-test-coach")?.remove();
    const normalCard = document.getElementById("goal-check-in-card");
    if (normalCard) normalCard.hidden = false;
    const dashboardCard = document.querySelector(".future-dashboard-weight-trend-card");
    if (dashboardCard) {
        dashboardCard.classList.remove("future-dashboard-weight-trend-card");
        dashboardCard.classList.add("dashboard-weight-trend-card");
        dashboardCard.dataset.weightTrendSignature = "";
    }
    lastCoachSignature = "";
    lastDashboardSignature = "";
}

function applyFutureTesting() {
    const weights = readWeights();
    const testDate = getFutureTestDate(weights);
    if (!testDate) {
        cleanupFutureMode();
        return;
    }

    ensureStyles();
    const phase = getActivePhase();
    redrawFutureChart(weights, phase, testDate);
    renderFutureCoach(weights, phase, testDate);
    renderFutureDashboard(weights, phase, testDate);
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        applyFutureTesting();
        window.setTimeout(applyFutureTesting, 80);
        window.setTimeout(applyFutureTesting, 220);
    });
}

const content = document.getElementById("content");
if (content) {
    new MutationObserver(mutations => {
        if (mutations.some(mutation => [...mutation.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE))) schedule();
    }).observe(content, { childList: true, subtree: true });
}

document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn, .remove-weight-entry, #weight-tab, [data-page='home'], [data-page='progress'], [data-page='energy']")) {
        window.setTimeout(schedule, 40);
    }
}, true);
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:nutrition-phase-updated", schedule);
window.addEventListener("pageshow", schedule);
window.addEventListener("focus", schedule);
window.addEventListener("resize", schedule);
schedule();
