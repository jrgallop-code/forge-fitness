import "./training-analytics-range-consistency.js?v=analytics-summary-polish-1";
import { drawTrainingBarChart } from "./training-bar-chart-renderer.js?v=analytics-bar-polish-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const RANGE_STORAGE_KEY = "level_up_training_analytics_range";
const STYLESHEET_HREF = "css/training-analytics-range.css?v=training-analytics-range-1";
const DAY_MS = 86400000;

const RANGE_OPTIONS = [
    { id: "1w", label: "1W", days: 7, legacyDays: 6, bucket: "day" },
    { id: "1m", label: "1M", days: 30, legacyDays: 29, bucket: "week" },
    { id: "3m", label: "3M", days: 90, legacyDays: 89, bucket: "week" },
    { id: "6m", label: "6M", days: 180, legacyDays: 179, bucket: "week" },
    { id: "1y", label: "1Y", days: 365, legacyDays: 364, bucket: "month" },
    { id: "all", label: "ALL", legacyDays: 0, bucket: "month" }
];

let setupQueued = false;
let drawTimer = null;

function ensureStylesheet() {
    if (document.querySelector('link[data-training-analytics-range-style]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLESHEET_HREF;
    link.dataset.trainingAnalyticsRangeStyle = "true";
    document.head.appendChild(link);
}

function readSelectedRange() {
    const saved = String(localStorage.getItem(RANGE_STORAGE_KEY) || "").toLowerCase();
    return RANGE_OPTIONS.some(option => option.id === saved) ? saved : "3m";
}

function saveSelectedRange(range) {
    if (!RANGE_OPTIONS.some(option => option.id === range)) return;
    localStorage.setItem(RANGE_STORAGE_KEY, range);
}

function getRangeOption(range = readSelectedRange()) {
    return RANGE_OPTIONS.find(option => option.id === range) || RANGE_OPTIONS[2];
}

function ensureControls() {
    const lifting = document.getElementById("lifting-progress");
    const tabs = lifting?.querySelector(".training-progress-tabs");
    if (!lifting || !tabs) return false;

    ensureStylesheet();

    let controls = lifting.querySelector(".training-analytics-range-control");
    if (!controls) {
        controls = document.createElement("div");
        controls.className = "training-analytics-range-control";
        controls.setAttribute("role", "group");
        controls.setAttribute("aria-label", "Lifting analytics timeframe");
        controls.innerHTML = RANGE_OPTIONS.map(option => `
            <button type="button" data-training-analytics-range="${option.id}" aria-pressed="false">${option.label}</button>
        `).join("");
        tabs.insertAdjacentElement("beforebegin", controls);
    }

    const selected = readSelectedRange();
    controls.querySelectorAll("[data-training-analytics-range]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.trainingAnalyticsRange === selected));
    });

    const legacyRange = document.getElementById("progress-range");
    const option = getRangeOption(selected);
    if (legacyRange && legacyRange.value !== String(option.legacyDays)) {
        legacyRange.value = String(option.legacyDays);
        legacyRange.dispatchEvent(new Event("change", { bubbles: true }));
    }

    scheduleDraw(30);
    return true;
}

function queueSetup() {
    if (setupQueued) return;
    setupQueued = true;
    requestAnimationFrame(() => {
        setupQueued = false;
        ensureControls();
    });
}

function selectRange(range) {
    const option = getRangeOption(range);
    saveSelectedRange(option.id);

    document.querySelectorAll("[data-training-analytics-range]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.trainingAnalyticsRange === option.id));
    });

    const legacyRange = document.getElementById("progress-range");
    if (legacyRange) {
        legacyRange.value = String(option.legacyDays);
        legacyRange.dispatchEvent(new Event("change", { bubbles: true }));
    }

    scheduleDraw(50);
}

function readSessions() {
    try {
        const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(sessions)
            ? sessions.filter(session => session && isDateValue(session.date))
            : [];
    }
    catch {
        return [];
    }
}

function getRangeWindow(range, sessions) {
    const option = getRangeOption(range);
    const endDate = localDateValue();

    if (option.id === "all") {
        const dates = sessions.map(session => String(session.date)).sort();
        return {
            startDate: dates[0] || endDate,
            endDate,
            option
        };
    }

    return {
        startDate: shiftDate(endDate, -(option.days - 1)),
        endDate,
        option
    };
}

function filterSessions(sessions, rangeWindow) {
    return sessions.filter(session =>
        session.date >= rangeWindow.startDate && session.date <= rangeWindow.endDate
    );
}

function buildChartPoints(sessions, rangeWindow, valueGetter) {
    const { option, startDate, endDate } = rangeWindow;
    const totals = new Map();

    if (option.bucket === "day") {
        for (let date = startDate; date <= endDate; date = shiftDate(date, 1)) {
            totals.set(date, 0);
        }
        sessions.forEach(session => {
            if (totals.has(session.date)) {
                totals.set(session.date, totals.get(session.date) + valueGetter(session));
            }
        });
        return [...totals.entries()].map(([date, value]) => ({
            date,
            value,
            label: formatDayLabel(date)
        }));
    }

    if (option.bucket === "week") {
        const firstWeek = getWeekStart(startDate);
        const lastWeek = getWeekStart(endDate);
        for (let week = firstWeek; week <= lastWeek; week = shiftDate(week, 7)) {
            totals.set(week, 0);
        }
        sessions.forEach(session => {
            const week = getWeekStart(session.date);
            if (totals.has(week)) totals.set(week, totals.get(week) + valueGetter(session));
        });
        return [...totals.entries()].map(([date, value]) => ({
            date,
            value,
            label: formatShortDate(date)
        }));
    }

    const firstMonth = getMonthStart(startDate);
    const lastMonth = getMonthStart(endDate);
    for (let month = firstMonth; month <= lastMonth; month = shiftMonth(month, 1)) {
        totals.set(month, 0);
    }
    sessions.forEach(session => {
        const month = getMonthStart(session.date);
        if (totals.has(month)) totals.set(month, totals.get(month) + valueGetter(session));
    });
    return [...totals.entries()].map(([date, value]) => ({
        date,
        value,
        label: formatMonthLabel(date, firstMonth !== lastMonth && date.slice(0, 4) !== endDate.slice(0, 4))
    }));
}

function countWorkingSets(session) {
    return (session.exercises || []).reduce((total, exercise) =>
        total + (exercise.sets || []).filter(set => set?.weight !== null || set?.reps !== null).length,
    0);
}

function scheduleDraw(delay = 40) {
    if (drawTimer) clearTimeout(drawTimer);
    drawTimer = setTimeout(() => requestAnimationFrame(drawRangeCharts), delay);
}

function drawRangeCharts() {
    const range = readSelectedRange();
    const allSessions = readSessions();
    const rangeWindow = getRangeWindow(range, allSessions);
    const sessions = filterSessions(allSessions, rangeWindow);

    const workoutCanvas = document.getElementById("weekly-workouts-chart") ||
        document.getElementById("weekly-workouts-seven-week-chart");
    const setsCanvas = document.getElementById("weekly-sets-chart");

    if (workoutCanvas && !workoutCanvas.closest("[hidden]")) {
        drawTrainingBarChart(
            workoutCanvas,
            buildChartPoints(sessions, rangeWindow, () => 1),
            { axisLabel: "Workouts", rangeLabel: rangeWindow.option.label === "ALL" ? "all recorded training" : rangeWindow.option.label }
        );
    }

    if (setsCanvas && !setsCanvas.closest("[hidden]")) {
        drawTrainingBarChart(
            setsCanvas,
            buildChartPoints(sessions, rangeWindow, countWorkingSets),
            { axisLabel: "Working sets", rangeLabel: rangeWindow.option.label === "ALL" ? "all recorded training" : rangeWindow.option.label }
        );
    }
}

function isDateValue(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function localDateValue(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDate(dateValue, days) {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localDateValue(date);
}

function getWeekStart(dateValue) {
    const date = new Date(`${dateValue}T12:00:00`);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return localDateValue(date);
}

function getMonthStart(dateValue) {
    return `${String(dateValue).slice(0, 7)}-01`;
}

function shiftMonth(dateValue, months) {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setMonth(date.getMonth() + months, 1);
    return localDateValue(date);
}

function formatDayLabel(dateValue) {
    return new Intl.DateTimeFormat(undefined, { weekday: "short" })
        .format(new Date(`${dateValue}T12:00:00`));
}

function formatShortDate(dateValue) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
        .format(new Date(`${dateValue}T12:00:00`));
}

function formatMonthLabel(dateValue, includeYear) {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        ...(includeYear ? { year: "2-digit" } : {})
    }).format(new Date(`${dateValue}T12:00:00`));
}

document.addEventListener("click", event => {
    const rangeButton = event.target.closest("[data-training-analytics-range]");
    if (rangeButton) {
        selectRange(rangeButton.dataset.trainingAnalyticsRange);
        return;
    }

    if (
        event.target.closest('[data-page="progress"]') ||
        event.target.closest("#lifting-tab") ||
        event.target.closest(".training-progress-tab") ||
        event.target.closest("#load-training-demo") ||
        event.target.closest("#remove-training-demo")
    ) {
        setTimeout(() => {
            queueSetup();
            scheduleDraw(50);
        }, 0);
    }
}, true);

window.addEventListener("resize", () => scheduleDraw(30), { passive: true });
window.addEventListener("storage", event => {
    if (event.key === RANGE_STORAGE_KEY || event.key === SESSION_STORAGE_KEY) {
        queueSetup();
        scheduleDraw(40);
    }
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueSetup).observe(content, { childList: true, subtree: true });
}

queueSetup();
