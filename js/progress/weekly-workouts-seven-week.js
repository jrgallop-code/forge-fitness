const SESSION_STORAGE_KEY = "forge_workout_sessions";
const WEEK_COUNT = 7;
const LEGACY_CANVAS_ID = "weekly-workouts-chart";
const OWNED_CANVAS_ID = "weekly-workouts-seven-week-chart";
const LEGACY_SETS_CANVAS_ID = "weekly-sets-chart";
const OWNED_SETS_CANVAS_ID = "weekly-sets-compact-chart";
const MAX_X_AXIS_LABELS = 6;

function getSessions() {
    try {
        const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(sessions) ? sessions : [];
    }
    catch {
        return [];
    }
}

function getWeekStart(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return date.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
    const date = new Date(`${dateValue}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function formatShortDate(dateValue) {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
    }).format(new Date(`${dateValue}T00:00:00`));
}

function shouldShowXAxisLabel(index, total, maxLabels = MAX_X_AXIS_LABELS) {
    if (total <= maxLabels) return true;
    if (index === 0 || index === total - 1) return true;
    const intervals = maxLabels - 1;
    for (let slot = 1; slot < intervals; slot++) {
        if (Math.round(slot * (total - 1) / intervals) === index) return true;
    }
    return false;
}

function buildSevenWeekPoints() {
    const sessions = getSessions();
    const sessionWeeks = sessions
        .map(session => getWeekStart(session?.date))
        .filter(Boolean)
        .sort();

    if (!sessionWeeks.length) return [];

    const currentWeek = getWeekStart(new Date().toISOString().slice(0, 10));
    if (!currentWeek) return [];

    const firstRecordedWeek = sessionWeeks[0];
    const sevenWeekFloor = addDays(currentWeek, -(WEEK_COUNT - 1) * 7);
    const firstVisibleWeek = firstRecordedWeek > sevenWeekFloor
        ? firstRecordedWeek
        : sevenWeekFloor;

    const totals = new Map();
    for (let week = firstVisibleWeek; week <= currentWeek; week = addDays(week, 7)) {
        totals.set(week, 0);
    }

    sessions.forEach(session => {
        const week = getWeekStart(session?.date);
        if (week && totals.has(week)) totals.set(week, totals.get(week) + 1);
    });

    return [...totals.entries()].map(([date, value]) => ({
        date,
        label: formatShortDate(date),
        value
    }));
}

function countCompletedSets(session) {
    return session?.exercises?.reduce((total, exercise) => total + (
        Array.isArray(exercise?.sets)
            ? exercise.sets.filter(set => set?.weight !== null || set?.reps !== null).length
            : 0
    ), 0) || 0;
}

function buildWeeklySetPoints() {
    const totals = new Map();
    getSessions().forEach(session => {
        const week = getWeekStart(session?.date);
        if (!week) return;
        totals.set(week, (totals.get(week) || 0) + countCompletedSets(session));
    });
    return [...totals.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([date, value]) => ({ date, label: formatShortDate(date), value }));
}

function claimCanvas(legacyId, ownedId) {
    let canvas = document.getElementById(ownedId);
    if (canvas) return canvas;
    canvas = document.getElementById(legacyId);
    if (!canvas) return null;
    canvas.id = ownedId;
    return canvas;
}

function prepareCanvas(canvas) {
    const context = canvas.getContext("2d");
    if (!context) return null;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 700;
    const height = canvas.clientHeight || 300;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height };
}

function drawBarChart(canvas, points, axisLabel, emptyMessage) {
    if (!canvas || canvas.closest("[hidden]")) return;
    const prepared = prepareCanvas(canvas);
    if (!prepared) return;
    const { context, width, height } = prepared;
    const padding = { top: 25, right: 15, bottom: 45, left: 52 };

    context.strokeStyle = "#333";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding.left, 20);
    context.lineTo(padding.left, height - padding.bottom);
    context.lineTo(width - padding.right, height - padding.bottom);
    context.stroke();

    context.save();
    context.fillStyle = "#a0a0a0";
    context.font = "12px Arial";
    context.textAlign = "center";
    context.translate(15, height / 2);
    context.rotate(-Math.PI / 2);
    context.fillText(axisLabel, 0, 0);
    context.restore();

    if (!points.length) {
        context.fillStyle = "#a0a0a0";
        context.font = "12px Arial";
        context.textAlign = "center";
        context.fillText(emptyMessage, width / 2, height / 2);
        return;
    }

    const maximum = Math.max(1, ...points.map(point => point.value));
    const plotHeight = height - padding.top - padding.bottom;
    for (let tick = 0; tick <= 4; tick++) {
        const value = maximum * tick / 4;
        const y = height - padding.bottom - value / maximum * plotHeight;
        context.fillStyle = "#a0a0a0";
        context.font = "10px Arial";
        context.textAlign = "right";
        context.fillText(String(Math.round(value)), padding.left - 8, y + 3);
    }

    const space = (width - padding.left - padding.right) / points.length;
    points.forEach((point, index) => {
        const barHeight = point.value / maximum * plotHeight;
        const x = padding.left + index * space + space * .18;
        const y = height - padding.bottom - barHeight;
        context.fillStyle = "#e10600";
        context.fillRect(x, y, space * .64, barHeight);

        if (shouldShowXAxisLabel(index, points.length)) {
            context.fillStyle = "#a0a0a0";
            context.font = "10px Arial";
            context.textAlign = "center";
            context.fillText(point.label, x + space * .32, height - 18);
        }

        context.fillStyle = "#ffffff";
        context.textAlign = "center";
        context.fillText(String(point.value), x + space * .32, Math.max(15, y - 6));
    });
}

function drawWeeklyCharts() {
    drawBarChart(
        claimCanvas(LEGACY_CANVAS_ID, OWNED_CANVAS_ID),
        buildSevenWeekPoints(),
        "Workouts",
        "No workout history yet"
    );
    drawBarChart(
        claimCanvas(LEGACY_SETS_CANVAS_ID, OWNED_SETS_CANVAS_ID),
        buildWeeklySetPoints(),
        "Working sets",
        "No workout history yet"
    );
}

function scheduleDraw(delay = 40) {
    requestAnimationFrame(() => setTimeout(drawWeeklyCharts, delay));
}

document.addEventListener("click", event => {
    if (
        event.target.closest('[data-page="progress"]') ||
        event.target.closest("#lifting-tab") ||
        event.target.closest('[data-view="overview"]') ||
        event.target.closest("#load-training-demo") ||
        event.target.closest("#remove-training-demo")
    ) {
        scheduleDraw(60);
    }
}, true);

window.addEventListener("resize", () => scheduleDraw(20));
scheduleDraw();
