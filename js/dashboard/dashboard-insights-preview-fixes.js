import { getCalculatedMaintenanceEstimate, getCalculatedMaintenanceHistory } from "../nutrition/calculated-maintenance.js?v=dashboard-insights-preview-fixes-1";
import { calculateTdee } from "../nutrition/tdee-calculator.js?v=nutrition-phase-1";
import { getNutritionProfile } from "../nutrition/nutrition-storage.js?v=nutrition-phase-1";

const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_COMPLETE_KEY = "level_up_food_log_complete_days_v1";
const DAY_MS = 86400000;
let queued = false;

function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDateKey(key, days) {
    const date = new Date(`${key}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function caloriesForDay(entries) {
    if (!Array.isArray(entries) || !entries.length) return null;
    const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.nutrition?.calories) || 0), 0);
    return total > 0 ? total : null;
}

function profileMaintenance() {
    const profile = getNutritionProfile();
    if (!profile || Number(profile.age) < 18) return null;
    try { return Math.round(Number(calculateTdee(profile).tdee)) || null; }
    catch { return null; }
}

function sevenCalendarDays() {
    const today = localDateKey();
    const start = shiftDateKey(today, -6);
    const profileEstimate = profileMaintenance();
    const current = getCalculatedMaintenanceEstimate(profileEstimate);
    const history = getCalculatedMaintenanceHistory(profileEstimate, { startDate: shiftDateKey(start, -28) });
    const currentLive = positive(current?.liveMaintenanceCalories);
    if (currentLive !== null && history.at(-1)?.date === today) {
        history[history.length - 1].liveMaintenanceCalories = currentLive;
    }

    const foodLog = readJson(FOOD_LOG_KEY, {});
    const completedDays = readJson(FOOD_COMPLETE_KEY, {});
    const historyByDate = new Map(history.map(point => [point.date, point]));
    let lastUsable = null;

    history.filter(point => point.date < start).forEach(point => {
        const live = positive(point.liveMaintenanceCalories);
        const reviewed = positive(point.maintenanceCalories);
        const held = live ?? lastUsable ?? reviewed;
        if (held !== null) lastUsable = held;
    });

    const dates = Array.from({ length: 7 }, (_, index) => shiftDateKey(start, index));
    const points = dates.map(date => {
        const point = historyByDate.get(date);
        const live = positive(point?.liveMaintenanceCalories);
        const reviewed = positive(point?.maintenanceCalories);
        const expenditure = live ?? lastUsable ?? reviewed;
        if (positive(expenditure) !== null) lastUsable = expenditure;
        const calories = date === today && completedDays?.[today] !== true
            ? null
            : caloriesForDay(foodLog?.[date]);
        return { date, expenditure: positive(expenditure), calories: positive(calories) };
    });

    return points;
}

function formatAxisDate(key) {
    return new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric" })
        .format(new Date(`${key}T12:00:00`));
}

function buildComparisonSvg(points) {
    const finiteValues = points
        .flatMap(point => [point.expenditure, point.calories])
        .filter(Number.isFinite);
    if (points.filter(point => Number.isFinite(point.expenditure)).length < 2 || !finiteValues.length) return null;

    const max = Math.max(1, ...finiteValues);
    const width = 180;
    const height = 90;
    const left = 9;
    const right = 9;
    const top = 7;
    const base = 64;
    const step = (width - left - right) / 6;
    const y = value => top + (1 - Number(value) / max) * (base - top);

    const bars = points.map((point, index) => {
        if (!Number.isFinite(point.calories)) return "";
        const x = left + index * step;
        const barWidth = Math.min(15, Math.max(6, step * .55));
        const topY = y(point.calories);
        return `<rect class="dashboard-preview-calorie-bar" x="${(x - barWidth / 2).toFixed(1)}" y="${topY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(1, base - topY).toFixed(1)}" rx="2"></rect>`;
    }).join("");

    const linePoints = points
        .map((point, index) => Number.isFinite(point.expenditure)
            ? { x: left + index * step, y: y(point.expenditure) }
            : null)
        .filter(Boolean);
    const line = linePoints.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const labels = points.map((point, index) => `<text class="dashboard-preview-label" x="${(left + index * step).toFixed(1)}" y="85">${formatAxisDate(point.date)}</text>`).join("");

    return `<svg class="dashboard-preview-svg dashboard-preview-comparison-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path class="dashboard-preview-axis" d="M${left} ${base} H${width - right}"></path>${bars}<path class="dashboard-preview-energy-line" data-preview-fixed-line d="${line}"></path>${labels}</svg>`;
}

function animateLine(path) {
    if (!path || typeof path.getTotalLength !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const length = path.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return;
    path.style.strokeDasharray = `${length} ${length}`;
    path.style.strokeDashoffset = `${length}`;
    path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
        duration: 750,
        easing: "cubic-bezier(.2,.7,.2,1)",
        fill: "forwards"
    });
}

function refreshComparisonPreview() {
    queued = false;
    const screen = document.getElementById("dashboard-insights-analytics-screen");
    if (!screen) return;
    const card = screen.querySelector('[data-dashboard-open-progress="comparison"]');
    const oldSvg = card?.querySelector(".dashboard-preview-svg");
    if (!card || !oldSvg || oldSvg.classList.contains("dashboard-preview-comparison-svg")) return;

    const markup = buildComparisonSvg(sevenCalendarDays());
    if (!markup) return;
    oldSvg.outerHTML = markup;
    animateLine(card.querySelector("[data-preview-fixed-line]"));
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refreshComparisonPreview);
}

const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true });
["pageshow", "levelup:nutrition-updated", "levelup:food-log-updated", "levelup:weight-updated"]
    .forEach(name => window.addEventListener(name, schedule));
schedule();
