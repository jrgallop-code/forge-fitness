import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "./calculated-maintenance.js?v=research-journal-cleanup-1";
import { calculateTdee } from "./tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "./nutrition-storage.js?v=nutrition-phase-1";
import { getMaintenanceCheckIn, getMaintenanceUpdateMode } from "./maintenance-check-in.js?v=calorie-authority-recovery-1";
import { getActivePhaseMetrics } from "./nutrition-phase.js?v=calorie-authority-recovery-1";
import { readAdjustmentHold } from "./calorie-adjustment-coordinator.js?v=independent-tdee-staged-target-1";
import { completeTutorial, dismissTutorial, getTutorial, getTutorialState, setTutorialStep, shouldShowTutorial } from "../core/tutorials.js?v=research-journal-cleanup-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const RANGE_KEY = "level_up_calorie_stats_range_v1";
const TDEE_RANGE_KEY = "level_up_tdee_chart_range_v1";
const ranges = { "7": 7, "28": 28, "84": 84 };
export const TDEE_RANGE_OPTIONS = {
    "1w": { days: 7, label: "1W" },
    "1m": { days: 30, label: "1M" },
    "3m": { days: 90, label: "3M" },
    "6m": { days: 180, label: "6M" },
    phase: { label: "PHASE" },
    all: { label: "ALL" }
};
const MEAL_COLORS = { Breakfast: "#4fa8ff", Lunch: "#8b7cf6", Dinner: "#39d7ae", Snacks: "#ff9f43", Other: "#8f8f99" };
let tdeeResizeBound = false;

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeyOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

function summarize(entries) {
    return (Array.isArray(entries) ? entries : []).reduce((total, entry) => {
        const nutrition = entry?.nutrition || {};
        ["calories", "protein", "carbs", "fat"].forEach(key => total[key] += Math.max(0, Number(nutrition[key]) || 0));
        return total;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function activeTargets() {
    const plan = readJson("level_up_nutrition_plan", {});
    const phases = readJson("level_up_nutrition_phases", []);
    const active = Array.isArray(phases) ? [...phases].reverse().find(phase => !phase?.endDate) : null;
    const macro = readJson("level_up_nutrition_macro", {});
    const manual = macro?.useManual ? macro.manualMacros : null;
    const auto = macro?.autoBaseline;
    return {
        calories: Number(active?.currentCalories ?? active?.startCalories ?? plan?.calculatedCalories ?? plan?.currentCalories) || 0,
        protein: Number(manual?.protein ?? auto?.protein) || 0,
        carbs: Number(manual?.carbs ?? auto?.carbs) || 0,
        fat: Number(manual?.fat ?? auto?.fat) || 0,
        phase: active
    };
}

export function calorieTargetTolerance(target) {
    return Math.round((Number(target) || 0) * .03);
}

export function isCaloriesInTarget(calories, target) {
    if (!(Number(target) > 0) || !Number.isFinite(Number(calories))) return false;
    return Math.abs(Number(calories) - Number(target)) <= calorieTargetTolerance(target);
}

function daysForRange(count) {
    const log = readJson(FOOD_LOG_KEY, {});
    const completedDays = readJson(FOOD_COMPLETE_KEY, {});
    return Array.from({ length: count }, (_, index) => {
        const date = dateKeyOffset(index - count + 1);
        const entries = Array.isArray(log?.[date]) ? log[date] : [];
        const mealCalories = entries.reduce((totals, entry) => {
            const meal = String(entry?.meal || "Other");
            totals[meal] = (totals[meal] || 0) + Math.max(0, Number(entry?.nutrition?.calories) || 0);
            return totals;
        }, {});
        return { date, logged: entries.length > 0, complete: completedDays?.[date] === true, mealCalories, ...summarize(entries) };
    });
}

function average(days, key) {
    const logged = days.filter(day => day.logged);
    return logged.length ? logged.reduce((sum, day) => sum + day[key], 0) / logged.length : 0;
}

function calorieAverage(days) {
    const today = localDateKey();
    const included = days.filter(day => day.logged && (day.date !== today || day.complete));
    return {
        included,
        value: included.length ? included.reduce((sum, day) => sum + day.calories, 0) / included.length : 0
    };
}

function formatNumber(value) {
    return Math.round(value).toLocaleString();
}

function profileMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || Number(profile.age) < 18) return null;
    try { return Math.round(Number(calculateTdee(profile).tdee)) || null; }
    catch { return null; }
}

function maintenanceCard(estimate, checkIn) {
    const result = estimate.maintenanceCalories;
    const display = Number.isFinite(result) ? formatNumber(result) : Number.isFinite(estimate.profileEstimate) ? formatNumber(estimate.profileEstimate) : "—";
    const hasTrendEstimate = Number.isFinite(result);
    const valueLabel = hasTrendEstimate ? "Current Expenditure" : Number.isFinite(estimate.profileEstimate) ? "Profile Estimate" : "Current Expenditure";
    const valueDescription = hasTrendEstimate
        ? "Your latest daily energy expenditure estimate, based on logged intake and your 21-day weight trend."
        : Number.isFinite(estimate.profileEstimate)
            ? "Your Body Profile estimate is shown while Level Up learns from real-world nutrition and weight data."
            : "Complete your Body Profile and keep logging nutrition and weight to establish an expenditure estimate.";
    const strategy = !hasTrendEstimate
        ? "Learning"
        : checkIn?.ready && checkIn.mode !== "track"
            ? "Updating"
            : "Holding";
    const strategyDescription = strategy === "Learning"
        ? "Keep logging food and body weight. A trend estimate appears once there is enough usable data."
        : strategy === "Updating"
            ? "A new estimate is ready to be included in your unified weekly calorie review."
            : estimate.weeklyReviewDue && !estimate.weeklyDataReady
                ? "Waiting for enough recent data to complete the next weekly review."
                : `Held steady between weekly reviews${Number.isFinite(estimate.daysUntilReview) ? ` · next review in ${estimate.daysUntilReview} day${estimate.daysUntilReview === 1 ? "" : "s"}` : ""}.`;
    const signedRate = Number.isFinite(estimate.weightRateLbPerWeek) ? `${estimate.weightRateLbPerWeek > 0 ? "+" : ""}${estimate.weightRateLbPerWeek.toFixed(2)} lb/week` : "Need more weigh-ins";
    const correction = Number.isFinite(estimate.energyCorrection) ? `${estimate.energyCorrection > 0 ? "+" : ""}${formatNumber(estimate.energyCorrection)} cal/day` : "—";
    const progress = Math.min(100, Math.round(Math.min(1, estimate.foodDays / 15) * .55 * 100 + Math.min(1, estimate.weighIns / 9) * .45 * 100));
    const uncapped = Number(estimate.uncappedMaintenanceCalories);
    return `<article class="calorie-stat-card calculated-maintenance-card is-${estimate.status}">
        <header class="expenditure-card-heading"><div><small>EXPENDITURE</small><h3>Current Expenditure</h3></div><b>${estimate.label}</b></header>
        <div class="expenditure-summary-grid">
            <div class="expenditure-summary-value"><strong>${display}</strong><small>cal/day</small></div>
            <div class="expenditure-summary-copy"><strong>${valueLabel}</strong><p>${valueDescription}</p></div>
            <div class="expenditure-summary-value is-strategy"><strong>${strategy}</strong></div>
            <div class="expenditure-summary-copy"><strong>Current Strategy</strong><p>${strategyDescription}</p></div>
        </div>
        ${estimate.status === "learning" || estimate.status === "early" || estimate.status === "preliminary" ? `<div class="calculated-maintenance-progress"><i><b style="width:${progress}%"></b></i><span>Confidence improves with complete logs · ${estimate.foodDays} food days · ${estimate.weighIns} weigh-ins</span></div>` : ""}
        <details><summary>How this was calculated <span>›</span></summary><div class="calculated-maintenance-breakdown">
            <div><span>Average intake</span><strong>${Number.isFinite(estimate.averageIntake) ? `${formatNumber(estimate.averageIntake)} cal/day` : "—"}</strong></div>
            <div><span>Current ${estimate.weightTrendLabel || "Weekly Trend"}</span><strong>${signedRate}</strong></div>
            <div><span>TDEE correction from weight change</span><strong>${correction}</strong></div>
            <div><span>Usable data</span><strong>${estimate.foodDays} food days · ${estimate.weighIns} weigh-ins</strong></div>
            ${Number.isFinite(uncapped) && uncapped !== result ? `<div><span>Weekly stability limit</span><strong>${formatNumber(uncapped)} → ${formatNumber(result)} cal/day</strong></div>` : ""}
            <small>Food intake uses completed days through yesterday. The current weight trend uses your latest non-future weigh-in and matches Weight Progress exactly. Level Up holds the displayed TDEE between seven-day reviews, requires 7 food days and a 14-day weight span, and limits each update to 50 calories while confidence is building or 100 calories at high confidence.</small>
        </div></details>
        ${maintenanceCheckInMarkup(checkIn)}
    </article>`;
}

function shiftDateKey(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return value;
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

function selectedExpenditureRange(targets) {
    const requested = String(localStorage.getItem(TDEE_RANGE_KEY) || "3m").toLowerCase();
    return TDEE_RANGE_OPTIONS[requested] && (requested !== "phase" || targets.phase?.startDate) ? requested : "3m";
}

function expenditureWindowStart(range, targets, endDate = localDateKey()) {
    if (range === "all") return null;
    if (range === "phase") return String(targets.phase.startDate);
    return shiftDateKey(endDate, -(TDEE_RANGE_OPTIONS[range].days - 1));
}

function expenditureTrendState(history, targets, currentEstimate, range = selectedExpenditureRange(targets)) {
    const endDate = localDateKey();
    const startDate = expenditureWindowStart(range, targets, endDate) || history[0]?.date || endDate;
    const series = history
        .filter(point => point.date >= startDate && point.date <= endDate)
        .map(point => ({ ...point }));
    const currentValue = Number(currentEstimate?.maintenanceCalories);
    if (Number.isFinite(currentValue) && currentValue > 0 && series.at(-1)?.date === endDate) series[series.length - 1].maintenanceCalories = currentValue;
    const available = series.filter(point => Number.isFinite(point.maintenanceCalories) && point.maintenanceCalories > 0);
    const average = available.length ? available.reduce((sum, point) => sum + point.maintenanceCalories, 0) / available.length : null;
    const difference = available.length > 1 ? available.at(-1).maintenanceCalories - available[0].maintenanceCalories : null;
    return { range, startDate, endDate, series, available, average, difference };
}

function formatChartDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatChartRange(state) {
    if (!state.available.length) return "More data needed";
    const first = state.available[0].date;
    const last = state.available.at(-1).date;
    return first === last ? formatChartDate(first) : `${formatChartDate(first)} – ${formatChartDate(last)}`;
}

function formatSignedCalories(value) {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${formatNumber(Math.abs(number))}`;
}

function expenditureTrendCard(state, profileEstimate, phase) {
    const difference = state.difference === null || state.difference === undefined ? null : Number(state.difference);
    const differenceLabel = formatSignedCalories(state.difference);
    const direction = difference === null || !Number.isFinite(difference) ? "Waiting" : difference > 0 ? "Increase" : difference < 0 ? "Decrease" : "No change";
    const hasChart = state.available.length > 0;
    return `<article class="calorie-stat-card expenditure-trend-card">
        <header class="expenditure-trend-heading"><div><small>EXPENDITURE TREND</small><h3>TDEE Over Time</h3><p>${formatChartRange(state)}</p></div></header>
        <div class="expenditure-trend-metrics">
            <span><small>AVERAGE</small><strong>${Number.isFinite(state.average) ? formatNumber(state.average) : "—"} <em>cal</em></strong></span>
            <span><small>CHANGE</small><strong>${differenceLabel} <em>cal</em></strong><b>${direction}</b></span>
        </div>
        <div class="expenditure-chart-shell${hasChart ? "" : " is-empty"}">
            <canvas data-expenditure-chart role="img" aria-label="TDEE expenditure trend over time"></canvas>
            <div class="expenditure-chart-tooltip" data-expenditure-tooltip hidden aria-live="polite"></div>
            <div class="expenditure-chart-empty"><strong>More data needed</strong><p>Keep logging food and body weight to build your expenditure trend.</p></div>
        </div>
        <div class="expenditure-chart-legend" aria-hidden="true"><span><i class="is-tdee"></i>TDEE</span>${Number.isFinite(profileEstimate) ? '<span><i class="is-profile"></i>Generic expenditure</span>' : ""}</div>
        <p class="expenditure-chart-hint">Tap or drag for daily details. Double-tap to close.</p>
        <div class="expenditure-chart-ranges" role="group" aria-label="TDEE chart date range">
            ${Object.entries(TDEE_RANGE_OPTIONS).map(([value, option]) => `<button type="button" data-tdee-chart-range="${value}" aria-pressed="${state.range === value}" ${value === "phase" && !phase?.startDate ? "disabled" : ""}>${option.label}</button>`).join("")}
        </div>
    </article>`;
}

const EXPENDITURE_TUTORIAL_ID = "expenditure";
const EXPENDITURE_TUTORIAL_ICONS = [
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Zm2 11.5-.9.5V15h-2.2v-1l-.9-.5A5 5 0 1 1 14 13.5ZM9 19h6v2H9v-2Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-1 3h2v3h3v2h-5V8Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4V4Zm2 2v12h12V6H6Zm2 2h3v3H8V8Zm5 0h3v2h-3V8Zm0 4h3v2h-3v-2Zm-5 1h3v3H8v-3Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v4H5V5Zm2 2h10V7H7Zm-2 5h14v7H5v-7Zm2 2v3h10v-3H7Zm2 .5h2v2H9v-2Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5h2v11.2l3.7-4 3 2.2L18.5 8H15V6h7v7h-2V9.6l-7 7.8-3.1-2.3L6.3 19H4Z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-1 3h2v4h4v2h-6V7Z"/></svg>'
];

function expenditureTutorialStepMarkup(tutorial, stepIndex) {
    const step = tutorial.steps[stepIndex];
    const last = stepIndex === tutorial.steps.length - 1;
    return `<div class="expenditure-tutorial-progress" aria-label="Step ${stepIndex + 1} of ${tutorial.steps.length}">
            <span>${stepIndex + 1} of ${tutorial.steps.length}</span>
            <div>${tutorial.steps.map((_, index) => `<i class="${index <= stepIndex ? "is-active" : ""}"></i>`).join("")}</div>
        </div>
        <div class="expenditure-tutorial-copy">
            <span class="expenditure-tutorial-icon">${EXPENDITURE_TUTORIAL_ICONS[stepIndex] || EXPENDITURE_TUTORIAL_ICONS[0]}</span>
            <div><small>${step.eyebrow}</small><h3>${step.title}</h3></div>
            <p>${step.body}</p>
        </div>
        <div class="expenditure-tutorial-actions">
            <button type="button" class="expenditure-tutorial-dismiss" data-tutorial-dismiss>Dismiss tutorial</button>
            <span>
                <button type="button" class="secondary-btn" data-tutorial-previous ${stepIndex === 0 ? "disabled" : ""}>Previous</button>
                <button type="button" class="primary-btn" data-tutorial-next>${last ? "Finish" : "Next"}</button>
            </span>
        </div>`;
}

function expenditureTutorialCard() {
    if (!shouldShowTutorial(EXPENDITURE_TUTORIAL_ID)) return "";
    const tutorial = getTutorial(EXPENDITURE_TUTORIAL_ID);
    if (!tutorial) return "";
    const { step } = getTutorialState(EXPENDITURE_TUTORIAL_ID);
    return `<aside class="expenditure-tutorial-card" data-expenditure-tutorial aria-label="Expenditure tutorial" aria-live="polite">${expenditureTutorialStepMarkup(tutorial, step)}</aside>`;
}

function initializeExpenditureTutorial(panel) {
    const card = panel.querySelector("[data-expenditure-tutorial]");
    const tutorial = getTutorial(EXPENDITURE_TUTORIAL_ID);
    if (!card || !tutorial) return;
    let stepIndex = getTutorialState(EXPENDITURE_TUTORIAL_ID).step;

    card.addEventListener("click", event => {
        if (event.target.closest("[data-tutorial-dismiss]")) {
            dismissTutorial(EXPENDITURE_TUTORIAL_ID, stepIndex);
            card.remove();
            return;
        }
        if (event.target.closest("[data-tutorial-previous]")) {
            stepIndex = Math.max(0, stepIndex - 1);
            setTutorialStep(EXPENDITURE_TUTORIAL_ID, stepIndex);
            card.innerHTML = expenditureTutorialStepMarkup(tutorial, stepIndex);
            return;
        }
        if (!event.target.closest("[data-tutorial-next]")) return;
        if (stepIndex >= tutorial.steps.length - 1) {
            completeTutorial(EXPENDITURE_TUTORIAL_ID);
            card.remove();
            return;
        }
        stepIndex += 1;
        setTutorialStep(EXPENDITURE_TUTORIAL_ID, stepIndex);
        card.innerHTML = expenditureTutorialStepMarkup(tutorial, stepIndex);
    });
}

function chartThemeColor(token, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function niceCalorieStep(value) {
    return [25, 50, 100, 200, 250, 500, 1000].find(step => step >= value) || 2000;
}

function renderExpenditureChart(panel, state, profileEstimate) {
    const canvas = panel.querySelector("[data-expenditure-chart]");
    const tooltip = panel.querySelector("[data-expenditure-tooltip]");
    const shell = canvas?.closest(".expenditure-chart-shell");
    if (!canvas || !tooltip || !shell || !state.available.length) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let selectedIndex = null;
    let lastTouchTap = null;
    const padding = { top: 18, right: 44, bottom: 30, left: 8 };
    const startMs = new Date(`${state.startDate}T12:00:00`).getTime();
    const endMs = new Date(`${state.endDate}T12:00:00`).getTime();
    const draw = () => {
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        const width = Math.max(280, Math.round(shell.clientWidth || 320));
        const height = 250;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const values = state.available.map(point => point.maintenanceCalories);
        if (Number.isFinite(profileEstimate)) values.push(profileEstimate);
        const minimum = Math.min(...values);
        const maximum = Math.max(...values);
        const step = niceCalorieStep(Math.max(100, maximum - minimum) / 4);
        let yMin = Math.floor((minimum - step) / step) * step;
        let yMax = Math.ceil((maximum + step) / step) * step;
        if (yMax <= yMin) yMax = yMin + step * 4;
        const x = point => padding.left + ((new Date(`${point.date}T12:00:00`).getTime() - startMs) / Math.max(1, endMs - startMs)) * plotWidth;
        const y = value => padding.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;

        context.font = "800 9px Arial";
        context.textAlign = "left";
        context.textBaseline = "middle";
        for (let index = 0; index <= 4; index += 1) {
            const value = yMax - (yMax - yMin) * index / 4;
            const lineY = padding.top + plotHeight * index / 4;
            context.strokeStyle = chartThemeColor("--line", "rgba(255,255,255,.09)");
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(padding.left, lineY);
            context.lineTo(width - padding.right + 4, lineY);
            context.stroke();
            context.fillStyle = chartThemeColor("--muted", "#85858f");
            context.fillText(formatNumber(value), width - padding.right + 9, lineY);
        }

        if (Number.isFinite(profileEstimate)) {
            context.save();
            context.setLineDash([5, 5]);
            context.strokeStyle = chartThemeColor("--muted", "#777780");
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(padding.left, y(profileEstimate));
            context.lineTo(width - padding.right + 4, y(profileEstimate));
            context.stroke();
            context.restore();
        }

        const area = context.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
        area.addColorStop(0, chartThemeColor("--accent-glow", "rgba(255,59,75,.28)"));
        area.addColorStop(1, "rgba(255,59,75,0)");
        context.fillStyle = area;
        context.strokeStyle = chartThemeColor("--accent", "#ff3b4b");
        context.lineWidth = 3;
        context.lineCap = "round";
        context.lineJoin = "round";
        if (state.available.length === 1) {
            context.beginPath();
            context.arc(x(state.available[0]), y(state.available[0].maintenanceCalories), 3, 0, Math.PI * 2);
            context.fillStyle = chartThemeColor("--accent", "#ff3b4b");
            context.fill();
        } else {
            context.beginPath();
            state.available.forEach((point, index) => index ? context.lineTo(x(point), y(point.maintenanceCalories)) : context.moveTo(x(point), y(point.maintenanceCalories)));
            context.lineTo(x(state.available.at(-1)), padding.top + plotHeight);
            context.lineTo(x(state.available[0]), padding.top + plotHeight);
            context.closePath();
            context.fillStyle = area;
            context.fill();

            context.beginPath();
            state.available.forEach((point, index) => index ? context.lineTo(x(point), y(point.maintenanceCalories)) : context.moveTo(x(point), y(point.maintenanceCalories)));
            context.stroke();
        }

        const labelCount = state.range === "1w" ? 7 : 5;
        context.fillStyle = chartThemeColor("--muted", "#85858f");
        context.font = "800 8px Arial";
        context.textAlign = "center";
        context.textBaseline = "alphabetic";
        for (let index = 0; index < labelCount; index += 1) {
            const labelDate = new Date(startMs + (endMs - startMs) * index / Math.max(1, labelCount - 1));
            const point = { date: localDateKey(labelDate) };
            context.fillText(formatChartDate(point.date), x(point), height - 7);
        }

        if (Number.isInteger(selectedIndex) && state.available[selectedIndex]) {
            const point = state.available[selectedIndex];
            const pointX = x(point);
            const pointY = y(point.maintenanceCalories);
            context.strokeStyle = chartThemeColor("--text-secondary", "rgba(255,255,255,.45)");
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(pointX, padding.top);
            context.lineTo(pointX, padding.top + plotHeight);
            context.stroke();
            context.fillStyle = chartThemeColor("--card", "#1b1b1f");
            context.strokeStyle = chartThemeColor("--accent", "#ff3b4b");
            context.lineWidth = 3;
            context.beginPath();
            context.arc(pointX, pointY, 5, 0, Math.PI * 2);
            context.fill();
            context.stroke();
        }
    };

    const selectPoint = event => {
        const bounds = canvas.getBoundingClientRect();
        const relative = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
        const plotWidth = Math.max(1, bounds.width - padding.left - padding.right);
        const plotPosition = Math.max(0, Math.min(1, (relative - padding.left) / plotWidth));
        const selectedTime = startMs + (endMs - startMs) * plotPosition;
        selectedIndex = state.available.reduce((nearest, point, index) => {
            const pointTime = new Date(`${point.date}T12:00:00`).getTime();
            const nearestTime = new Date(`${state.available[nearest].date}T12:00:00`).getTime();
            return Math.abs(pointTime - selectedTime) < Math.abs(nearestTime - selectedTime) ? index : nearest;
        }, 0);
        const point = state.available[selectedIndex];
        tooltip.hidden = false;
        tooltip.innerHTML = `<strong>${formatChartDate(point.date)}</strong><span>${formatNumber(point.maintenanceCalories)} cal/day</span>${Number.isFinite(profileEstimate) ? `<small>${formatSignedCalories(point.maintenanceCalories - profileEstimate)} vs generic expenditure</small>` : ""}`;
        const desiredLeft = relative < bounds.width / 2 ? relative + 10 : relative - 140;
        tooltip.style.left = `${Math.max(8, Math.min(bounds.width - 132, desiredLeft))}px`;
        draw();
    };

    const clearSelection = () => {
        selectedIndex = null;
        tooltip.hidden = true;
        draw();
    };
    canvas.addEventListener("pointerdown", event => {
        if (event.pointerType !== "mouse") {
            const now = Date.now();
            const doubleTap = lastTouchTap && now - lastTouchTap.time <= 350 && Math.abs(event.clientX - lastTouchTap.x) <= 28 && Math.abs(event.clientY - lastTouchTap.y) <= 28;
            lastTouchTap = doubleTap ? null : { time: now, x: event.clientX, y: event.clientY };
            if (doubleTap) {
                event.preventDefault();
                clearSelection();
                return;
            }
        }
        selectPoint(event);
    });
    canvas.addEventListener("dblclick", event => {
        event.preventDefault();
        clearSelection();
    });
    canvas.addEventListener("pointermove", event => { if (event.pointerType === "mouse" || event.buttons) selectPoint(event); });
    canvas.addEventListener("pointerleave", event => {
        if (event.pointerType !== "mouse") return;
        clearSelection();
    });
    canvas.__drawExpenditureChart = draw;
    if (!tdeeResizeBound) {
        tdeeResizeBound = true;
        window.addEventListener("resize", () => document.querySelector("[data-expenditure-chart]")?.__drawExpenditureChart?.());
    }
    draw();
}

function maintenanceCheckInMarkup(checkIn) {
    if (!checkIn?.ready || checkIn.mode === "track") return "";
    return `<section class="maintenance-check-in-alert">
        <span class="eyebrow">WEEKLY CALORIE REVIEW</span>
        <h3>Your calorie update is ready</h3>
        <p>Review one recommended daily target.</p>
        <div class="maintenance-check-in-actions"><button class="primary-btn" type="button" data-maintenance-review>Review update</button></div>
    </section>`;
}

function bars(days, target) {
    const maximum = Math.max(target || 0, ...days.map(day => day.calories), 1);
    return days.map(day => {
        const height = day.logged ? Math.max(8, Math.min(100, day.calories / maximum * 100)) : 0;
        const status = !day.logged ? "missing" : isCaloriesInTarget(day.calories, target) ? "target" : "outside";
        const label = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
        const title = day.logged ? `${formatNumber(day.calories)} calories` : "Not logged";
        return `<div class="calorie-stat-bar" title="${title}"><span><i class="${status}" style="height:${height}%"></i></span><small>${label}</small></div>`;
    }).join("");
}

function macroTrend(days, key, target) {
    const recent = days.slice(-7);
    const maximum = Math.max(Number(target) || 0, ...recent.map(day => day[key]), 1);
    return recent.map(day => {
        const height = day.logged ? Math.max(8, Math.min(100, day[key] / maximum * 100)) : 0;
        const label = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
        return `<span title="${day.logged ? `${formatNumber(day[key])} g` : "Not logged"}"><i style="height:${height}%"></i><small>${label}</small></span>`;
    }).join("");
}

function macroRow(label, key, days, target) {
    const value = average(days, key);
    const percent = target ? Math.round(value / target * 100) : null;
    return `<div class="calorie-stat-macro calorie-stat-macro--${key}"><div class="calorie-stat-macro-copy"><span><strong>${label}</strong><small>${target ? `${formatNumber(target)} g goal` : "No goal set"}</small></span><b>${formatNumber(value)} g <small>avg</small></b><em>${percent === null ? "—" : `${percent}%`}</em></div><div class="calorie-stat-macro-trend" aria-label="Recent ${label.toLowerCase()} trend">${macroTrend(days, key, target)}</div></div>`;
}

function mealBreakdown(days) {
    const totals = days.reduce((result, day) => {
        Object.entries(day.mealCalories || {}).forEach(([meal, calories]) => { result[meal] = (result[meal] || 0) + calories; });
        return result;
    }, {});
    const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const ordered = [...Object.keys(MEAL_COLORS), ...Object.keys(totals).filter(meal => !MEAL_COLORS[meal])]
        .filter((meal, index, meals) => meals.indexOf(meal) === index && totals[meal] > 0);
    if (!grandTotal) return '<p class="calorie-stat-empty">Log food to see where your calories are coming from.</p>';
    const segments = ordered.map(meal => `<i style="width:${totals[meal] / grandTotal * 100}%;--meal-color:${MEAL_COLORS[meal] || MEAL_COLORS.Other}" title="${meal}: ${formatNumber(totals[meal])} calories"></i>`).join("");
    const legend = ordered.map(meal => `<span style="--meal-color:${MEAL_COLORS[meal] || MEAL_COLORS.Other}"><i></i><b>${meal}</b><small>${Math.round(totals[meal] / grandTotal * 100)}% · ${formatNumber(totals[meal])} cal</small></span>`).join("");
    return `<div class="calorie-stat-meal-bar">${segments}</div><div class="calorie-stat-meal-legend">${legend}</div>`;
}

function mealWeekView(days, target) {
    const recent = days.slice(-7);
    const logged = recent.filter(day => day.logged);
    const calorieAverageState = calorieAverage(recent);
    const averageCalories = calorieAverageState.value;
    const included = calorieAverageState.included;
    const maximum = Math.max(Number(target) || 0, averageCalories, ...recent.map(day => day.calories), 1);
    const axisMaximum = Math.max(500, Math.ceil(maximum / 500) * 500);
    const axisTicks = [1, .75, .5, .25, 0]
        .map(position => `<span>${formatNumber(axisMaximum * position)}</span>`)
        .join("");
    const knownMeals = [...Object.keys(MEAL_COLORS), ...recent.flatMap(day => Object.keys(day.mealCalories || {}))]
        .filter((meal, index, meals) => meals.indexOf(meal) === index);
    const valuePanels = [];
    const mealValueCards = (mealCalories = {}) => knownMeals.map(meal => {
        const value = Number(mealCalories[meal]) || 0;
        return value > 0 ? `<span style="--meal-color:${MEAL_COLORS[meal] || MEAL_COLORS.Other}"><i></i><small>${meal}</small><strong>${formatNumber(value)} cal</strong></span>` : "";
    }).join("");
    const dayBars = recent.map((day, index) => {
        const segments = knownMeals.map(meal => {
            const value = Number(day.mealCalories?.[meal]) || 0;
            return value ? `<i style="height:${value / axisMaximum * 100}%;--meal-color:${MEAL_COLORS[meal] || MEAL_COLORS.Other}"></i>` : "";
        }).join("");
        const date = new Date(`${day.date}T12:00:00`);
        const panelId = `calorie-meal-day-values-${index}`;
        const dateLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        valuePanels.push(`<section class="calorie-meal-week-values" id="${panelId}" data-calorie-meal-values hidden><header><span>${dateLabel}</span><strong>${day.logged ? `${formatNumber(day.calories)} cal` : "Not logged"}</strong></header>${day.logged ? `<div>${mealValueCards(day.mealCalories)}</div>` : '<p>No foods were logged for this day.</p>'}</section>`);
        return `<button type="button" class="calorie-meal-week-column" title="${day.logged ? `${formatNumber(day.calories)} calories` : "Not logged"}" aria-label="${dateLabel}: ${day.logged ? `${formatNumber(day.calories)} calories` : "not logged"}. Show values" aria-controls="${panelId}" aria-expanded="false" data-calorie-meal-column><span>${segments}</span><small>${date.toLocaleDateString(undefined, { weekday: "narrow" })}<b>${date.getDate()}</b></small></button>`;
    }).join("");
    const averageMeals = knownMeals.reduce((result, meal) => {
        result[meal] = included.length ? included.reduce((sum, day) => sum + (Number(day.mealCalories?.[meal]) || 0), 0) / included.length : 0;
        return result;
    }, {});
    const averagePanelId = "calorie-meal-average-values";
    valuePanels.push(`<section class="calorie-meal-week-values" id="${averagePanelId}" data-calorie-meal-values hidden><header><span>Daily average</span><strong>${included.length ? `${formatNumber(averageCalories)} cal` : "No data"}</strong></header>${included.length ? `<div>${mealValueCards(averageMeals)}</div>` : '<p>Complete calorie tracking to calculate an average.</p>'}</section>`);
    const averageBar = `<button type="button" class="calorie-meal-week-column is-average" title="${formatNumber(averageCalories)} average calories" aria-label="Daily average: ${formatNumber(averageCalories)} calories. Show values" aria-controls="${averagePanelId}" aria-expanded="false" data-calorie-meal-column><span><i style="height:${averageCalories / axisMaximum * 100}%"></i></span><small>Avg</small></button>`;
    const weeklyDifference = target > 0 && included.length === 7 ? included.reduce((sum, day) => sum + day.calories, 0) - target * 7 : null;
    const differenceLabel = weeklyDifference === null ? "Weekly goal difference" : `Calories ${weeklyDifference > 0 ? "over" : "under"} weekly goal`;
    return `<div class="calorie-meal-week-value-region" aria-live="polite">${valuePanels.join("")}</div><div class="calorie-meal-week-chart" aria-label="Calories by meal for the last seven days"><div class="calorie-meal-week-axis" aria-hidden="true"><small>cal</small>${axisTicks}</div><div class="calorie-meal-week-plot">${dayBars}${averageBar}</div></div><p class="calorie-meal-week-hint">Tap a bar to view its values.</p><div class="calorie-meal-week-metrics"><span><small>${differenceLabel}</small><strong>${weeklyDifference === null ? "—" : formatNumber(Math.abs(weeklyDifference))}</strong></span><span><small>Daily average</small><strong>${included.length ? formatNumber(averageCalories) : "—"}</strong></span><span><small>Daily goal</small><strong>${target > 0 ? formatNumber(target) : "—"}</strong></span></div>${included.length < 7 ? '<p class="calorie-stat-note">Today joins the average after calorie tracking is marked complete.</p>' : ""}`;
}

function phaseInsight(targets, rate, loggedCount) {
    if (loggedCount < 4) return ["More data needed", "Log at least 4 days to create a useful calorie and weight trend."];
    if (rate === null) return ["Calories tracked", "Add at least two weigh-ins in this range to compare intake with your weight trend."];
    const phaseText = String(targets.phase?.type || targets.phase?.goal || targets.phase?.name || "").toLowerCase();
    const cutting = /cut|loss|lose/.test(phaseText);
    const bulking = /bulk|gain|build/.test(phaseText);
    const aligned = cutting ? rate < 0 : bulking ? rate > 0 : Math.abs(rate) < .35;
    if (cutting || bulking) return aligned
        ? ["Phase trend aligned", `Your weight trend is moving ${rate < 0 ? "down" : "up"} at ${Math.abs(rate).toFixed(2)} lb/week. Keep following your current plan.`]
        : ["Watch the trend", `Your weight trend is ${rate > 0 ? "+" : ""}${rate.toFixed(2)} lb/week, which may not match your current phase. Keep logging before changing calories.`];
    return ["Weight trend", `Your current trend is ${rate > 0 ? "+" : ""}${rate.toFixed(2)} lb/week.`];
}

function renderStats(panel) {
    const count = ranges[localStorage.getItem(RANGE_KEY)] || 7;
    const targets = activeTargets();
    const days = daysForRange(count);
    const logged = days.filter(day => day.logged);
    const inTarget = logged.filter(day => isCaloriesInTarget(day.calories, targets.calories)).length;
    const proteinDays = logged.filter(day => targets.protein > 0 && day.protein >= targets.protein).length;
    const calorieAverageState = calorieAverage(days);
    const avgCalories = calorieAverageState.value;
    const averageDayCount = calorieAverageState.included.length;
    const difference = targets.calories && averageDayCount ? avgCalories - targets.calories : null;
    const tolerance = targets.calories ? calorieTargetTolerance(targets.calories) : 0;
    const lower = targets.calories - tolerance;
    const upper = targets.calories + tolerance;
    const displayDays = count === 7 ? days : days.slice(-14);
    const formulaEstimate = profileMaintenance();
    const maintenance = getCalculatedMaintenanceEstimate(formulaEstimate);
    const tdeeRange = selectedExpenditureRange(targets);
    const tdeeStart = expenditureWindowStart(tdeeRange, targets);
    const historyStart = tdeeStart ? shiftDateKey(tdeeStart, -28) : null;
    const tdeeHistory = getCalculatedMaintenanceHistory(formulaEstimate, { startDate: historyStart });
    const tdeeTrend = expenditureTrendState(tdeeHistory, targets, maintenance, tdeeRange);
    const rate = Number.isFinite(maintenance.weightRateLbPerWeek) ? maintenance.weightRateLbPerWeek : null;
    const insight = phaseInsight(targets, rate, logged.length);
    const checkIn = getMaintenanceCheckIn({
        estimate: maintenance,
        currentMaintenance: targets.phase?.maintenanceCalories,
        currentTarget: targets.calories,
        adaptiveMetrics: targets.phase ? getActivePhaseMetrics(targets.phase, { rolling: true }) : null,
        adjustmentHold: readAdjustmentHold({ phase: targets.phase, currentCalories: targets.calories })
    });
    checkIn.mode = getMaintenanceUpdateMode();

    panel.innerHTML = `
        <section class="calorie-stats-page">
            <header><span class="eyebrow">CALORIE TRENDS</span><h2>Calorie Stats</h2><p>See whether your intake is supporting your current goal.</p></header>
            <div class="calorie-stats-ranges" aria-label="Stats date range">
                ${Object.entries({7:"7D",28:"4W",84:"12W"}).map(([value,label]) => `<button type="button" class="${count === Number(value) ? "active" : ""}" data-calorie-stats-range="${value}">${label}</button>`).join("")}
            </div>
            ${maintenanceCard(maintenance, checkIn)}
            <article class="calorie-stat-card calorie-target-rule">
                <div><small>CALORIE TARGET</small><strong>${targets.calories ? `${formatNumber(targets.calories)} cal/day (${formatNumber(lower)}–${formatNumber(upper)})` : "No calorie goal set"}</strong></div>
                <p>A day is in target when it is within ±3% of your calorie goal.</p>
            </article>
            ${expenditureTrendCard(tdeeTrend, formulaEstimate, targets.phase)}
            ${expenditureTutorialCard()}
            <article class="calorie-stat-card calorie-stat-week">
                <div class="calorie-stat-title"><span><small>AVERAGE CALORIES</small><strong>${averageDayCount ? formatNumber(avgCalories) : "—"}</strong></span><b>${averageDayCount} of ${count} days in average</b></div>
                <div class="calorie-stat-bars ${displayDays.length === 7 ? "is-seven" : ""}">${bars(displayDays, targets.calories)}</div>
                <div class="calorie-stat-goal">
                    <span><i class="target"></i>In target</span><span><i class="outside"></i>Outside target</span><b>${difference === null ? "Set a calorie goal" : `${difference > 0 ? "+" : ""}${formatNumber(difference)} average vs goal`}</b>
                </div>
            </article>
            <article class="calorie-stat-card">
                <div class="calorie-stat-section-title"><span><small>CONSISTENCY</small><strong>${inTarget} days in target</strong></span><b>${logged.length ? Math.round(inTarget / logged.length * 100) : 0}%</b></div>
                <div class="calorie-stat-consistency"><span><strong>${logged.length}</strong><small>Days logged</small></span><span><strong>${inTarget}</strong><small>Calories in target</small></span><span><strong>${proteinDays}</strong><small>Protein goal hit</small></span></div>
            </article>
            <article class="calorie-stat-card">
                <div class="calorie-stat-section-title"><span><small>CALORIES BY MEAL</small><strong>Meal breakdown</strong></span><b>${logged.length} logged days</b></div>
                ${mealBreakdown(days)}
                <details class="calorie-meal-week-details">
                    <summary>View last 7 days <span>›</span></summary>
                    ${mealWeekView(daysForRange(7), targets.calories)}
                </details>
            </article>
            <article class="calorie-stat-card">
                <div class="calorie-stat-section-title"><span><small>MACRO AVERAGES</small><strong>Logged days</strong></span></div>
                <div class="calorie-stat-macros">
                    ${macroRow("Protein", "protein", days, targets.protein)}
                    ${macroRow("Carbohydrates", "carbs", days, targets.carbs)}
                    ${macroRow("Fat", "fat", days, targets.fat)}
                </div>
            </article>
            <article class="calorie-stat-card calorie-phase-insight"><small>LEVEL UP INSIGHT</small><strong>${insight[0]}</strong><p>${insight[1]}</p></article>
        </section>`;

    panel.querySelectorAll("[data-calorie-stats-range]").forEach(button => button.addEventListener("click", () => {
        localStorage.setItem(RANGE_KEY, button.dataset.calorieStatsRange);
        renderStats(panel);
    }));
    panel.querySelectorAll("[data-tdee-chart-range]").forEach(button => button.addEventListener("click", () => {
        if (button.disabled) return;
        localStorage.setItem(TDEE_RANGE_KEY, button.dataset.tdeeChartRange);
        renderStats(panel);
    }));
    panel.querySelectorAll("[data-calorie-meal-column]").forEach(button => button.addEventListener("click", () => {
        const wasExpanded = button.getAttribute("aria-expanded") === "true";
        panel.querySelectorAll("[data-calorie-meal-column]").forEach(column => {
            column.setAttribute("aria-expanded", "false");
            column.classList.remove("is-selected");
        });
        panel.querySelectorAll("[data-calorie-meal-values]").forEach(values => { values.hidden = true; });
        if (wasExpanded) return;
        const values = panel.querySelector(`#${button.getAttribute("aria-controls")}`);
        if (!values) return;
        button.setAttribute("aria-expanded", "true");
        button.classList.add("is-selected");
        values.hidden = false;
    }));
    panel.querySelector("[data-maintenance-review]")?.addEventListener("click", () => openMaintenanceReview(checkIn));
    renderExpenditureChart(panel, tdeeTrend, formulaEstimate);
    initializeExpenditureTutorial(panel);
}

function openMaintenanceReview() {
    window.dispatchEvent(new CustomEvent("levelup:open-weekly-calorie-review"));
}

export function renderCalorieStats() {
    return '<div data-progress-calorie-stats></div>';
}

export function initializeCalorieStats(root = document) {
    const panel = root.querySelector?.("[data-progress-calorie-stats]");
    if (panel) renderStats(panel);
}

window.addEventListener("levelup:food-log-updated", () => {
    const panel = document.querySelector("#calorie-progress:not([hidden]) [data-progress-calorie-stats]");
    if (panel) renderStats(panel);
});
window.addEventListener("levelup:nutrition-updated", () => {
    const panel = document.querySelector("#calorie-progress:not([hidden]) [data-progress-calorie-stats]");
    if (panel) renderStats(panel);
});
window.addEventListener("levelup:weight-updated", () => {
    const panel = document.querySelector("#calorie-progress:not([hidden]) [data-progress-calorie-stats]");
    if (panel) renderStats(panel);
});
