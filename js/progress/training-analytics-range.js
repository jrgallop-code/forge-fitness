import "./training-analytics-range-consistency.js?v=red-index-polish-1";

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
        drawBarChart(
            workoutCanvas,
            buildChartPoints(sessions, rangeWindow, () => 1),
            "Workouts",
            rangeWindow
        );
    }

    if (setsCanvas && !setsCanvas.closest("[hidden]")) {
        drawBarChart(
            setsCanvas,
            buildChartPoints(sessions, rangeWindow, countWorkingSets),
            "Working sets",
            rangeWindow
        );
    }
}

function drawBarChart(canvas, points, axisLabel, rangeWindow) {
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 700;
    const height = canvas.clientHeight || 300;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    canvas.setAttribute(
        "aria-label",
        `${axisLabel} for ${rangeWindow.option.label === "ALL" ? "all recorded training" : rangeWindow.option.label}`
    );

    const padding = { top: 30, right: 16, bottom: 48, left: 52 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);
    const maximumValue = Math.max(0, ...points.map(point => Number(point.value) || 0));
    const maximum = niceMaximum(maximumValue);

    context.strokeStyle = "#303037";
    context.lineWidth = 1;
    for (let index = 0; index <= 4; index++) {
        const y = padding.top + plotHeight * index / 4;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();

        context.fillStyle = "#a0a0a8";
        context.font = "10px Arial";
        context.textAlign = "right";
        const value = maximum - maximum * index / 4;
        context.fillText(formatAxisValue(value), padding.left - 7, y + 3);
    }

    context.save();
    context.fillStyle = "#a0a0a8";
    context.font = "11px Arial";
    context.textAlign = "center";
    context.translate(15, padding.top + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillText(axisLabel, 0, 0);
    context.restore();

    if (!points.length) {
        context.fillStyle = "#a0a0a8";
        context.font = "12px Arial";
        context.textAlign = "center";
        context.fillText("No workout history yet", padding.left + plotWidth / 2, padding.top + plotHeight / 2);
        return;
    }

    const slot = plotWidth / points.length;
    const barWidth = Math.max(2, Math.min(slot * 0.62, 34));
    const labelEvery = Math.max(1, Math.ceil(points.length / 6));

    points.forEach((point, index) => {
        const value = Number(point.value) || 0;
        const barHeight = maximum > 0 ? value / maximum * plotHeight : 0;
        const x = padding.left + index * slot + (slot - barWidth) / 2;
        const y = padding.top + plotHeight - barHeight;

        if (barHeight > 0) {
            context.fillStyle = "#e10600";
            context.fillRect(x, y, barWidth, barHeight);
        }

        if (points.length <= 8 || index % labelEvery === 0 || index === points.length - 1) {
            context.fillStyle = "#a0a0a8";
            context.font = "9px Arial";
            context.textAlign = "center";
            context.fillText(point.label, x + barWidth / 2, height - 18);
        }

        if (value > 0 && points.length <= 14) {
            context.fillStyle = "#ffffff";
            context.font = "9px Arial";
            context.textAlign = "center";
            context.fillText(formatAxisValue(value), x + barWidth / 2, Math.max(12, y - 5));
        }
    });
}

function niceMaximum(value) {
    if (!Number.isFinite(value) || value <= 0) return 4;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return Math.max(4, nice * magnitude);
}

function formatAxisValue(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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
