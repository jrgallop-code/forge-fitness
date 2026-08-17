const SESSION_STORAGE_KEY = "forge_workout_sessions";
const RANGE_STORAGE_KEY = "level_up_training_analytics_range";
const DAY_MS = 86400000;

const RANGE_OPTIONS = {
    "1w": { label: "1W", days: 7 },
    "1m": { label: "1M", days: 30 },
    "3m": { label: "3M", days: 90 },
    "6m": { label: "6M", days: 180 },
    "1y": { label: "1Y", days: 365 },
    all: { label: "ALL", days: 0 }
};

const CORE_STRENGTH_CATEGORIES = [
    {
        key: "horizontal-push",
        preferred: [
            ["barbell-bench-press", "Barbell Bench Press"],
            ["dumbbell-bench-press", "Dumbbell Bench Press"],
            ["machine-chest-press", "Machine Chest Press"],
            ["incline-barbell-press", "Incline Barbell Press"],
            ["incline-dumbbell-press", "Incline Dumbbell Press"]
        ]
    },
    {
        key: "vertical-push",
        preferred: [
            ["overhead-press", "Overhead Press"],
            ["dumbbell-shoulder-press", "Dumbbell Shoulder Press"],
            ["machine-shoulder-press", "Machine Shoulder Press"]
        ]
    },
    {
        key: "horizontal-pull",
        preferred: [
            ["barbell-row", "Barbell Row"],
            ["chest-supported-row", "Chest-Supported Row"],
            ["seated-cable-row", "Seated Cable Row"],
            ["machine-row", "Machine Row"],
            ["single-arm-dumbbell-row", "Single-Arm Dumbbell Row"]
        ]
    },
    {
        key: "vertical-pull",
        preferred: [
            ["lat-pulldown", "Lat Pulldown"],
            ["weighted-pull-up", "Weighted Pull-Up"]
        ]
    },
    {
        key: "knee-dominant",
        preferred: [
            ["hack-squat", "Hack Squat"],
            ["back-squat", "Back Squat"],
            ["front-squat", "Front Squat"]
        ]
    },
    {
        key: "hip-dominant",
        preferred: [
            ["romanian-deadlift", "Romanian Deadlift"],
            ["deadlift", "Deadlift"],
            ["barbell-hip-thrust", "Barbell Hip Thrust"]
        ]
    }
];

let refreshTimer = null;
let observedStrengthCanvas = null;

function readSessions() {
    try {
        const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(sessions)
            ? sessions
                .filter(session => /^\d{4}-\d{2}-\d{2}$/.test(String(session?.date || "")))
                .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            : [];
    }
    catch {
        return [];
    }
}

function readRange() {
    const saved = String(localStorage.getItem(RANGE_STORAGE_KEY) || "3m").toLowerCase();
    return RANGE_OPTIONS[saved] ? saved : "3m";
}

function localDateValue(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDate(dateValue, days) {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localDateValue(date);
}

function getRangeWindow(range = readRange()) {
    const option = RANGE_OPTIONS[range] || RANGE_OPTIONS["3m"];
    const endDate = localDateValue();
    return {
        range,
        label: option.label,
        startDate: option.days ? shiftDate(endDate, -(option.days - 1)) : null,
        endDate
    };
}

function estimateOneRepMax(set) {
    return Number(set?.weight) * (1 + Number(set?.reps) / 30);
}

function collectExerciseRecords(sessions) {
    const recordsByExercise = new Map();

    sessions.forEach(session => {
        (session.exercises || []).forEach(exercise => {
            const exerciseId = String(exercise?.exerciseId || "");
            if (!exerciseId) return;

            const validSets = (exercise.sets || []).filter(set =>
                Number(set?.weight) > 0 && Number(set?.reps) > 0
            );
            if (!validSets.length) return;

            const bestEstimatedOneRepMax = Math.max(...validSets.map(estimateOneRepMax));
            if (!Number.isFinite(bestEstimatedOneRepMax) || bestEstimatedOneRepMax <= 0) return;

            if (!recordsByExercise.has(exerciseId)) recordsByExercise.set(exerciseId, []);
            recordsByExercise.get(exerciseId).push({
                date: session.date,
                estimatedOneRepMax: bestEstimatedOneRepMax
            });
        });
    });

    recordsByExercise.forEach((records, exerciseId) => {
        const byDate = new Map();
        records.forEach(record => {
            const existing = byDate.get(record.date);
            if (!existing || record.estimatedOneRepMax > existing.estimatedOneRepMax) {
                byDate.set(record.date, record);
            }
        });
        recordsByExercise.set(
            exerciseId,
            [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
        );
    });

    return recordsByExercise;
}

function selectCoreExercises(recordsByExercise) {
    return CORE_STRENGTH_CATEGORIES.flatMap(category => {
        for (const [exerciseId, exerciseName] of category.preferred) {
            const records = recordsByExercise.get(exerciseId) || [];
            if (records.length >= 2) {
                return [{
                    key: category.key,
                    exerciseId,
                    exerciseName,
                    records
                }];
            }
        }
        return [];
    });
}

function buildStrengthIndexPoints(sessions) {
    const recordsByExercise = collectExerciseRecords(sessions);
    const selectedCategories = selectCoreExercises(recordsByExercise);
    if (selectedCategories.length < 2) return [];

    const baselineByExercise = new Map(
        selectedCategories.map(item => [item.exerciseId, item.records[0].estimatedOneRepMax])
    );
    const recordsByDate = new Map();

    selectedCategories.forEach(item => {
        item.records.forEach(record => {
            if (!recordsByDate.has(record.date)) recordsByDate.set(record.date, []);
            recordsByDate.get(record.date).push({
                exerciseId: item.exerciseId,
                estimatedOneRepMax: record.estimatedOneRepMax
            });
        });
    });

    const latestByExercise = new Map();
    const points = [];

    [...recordsByDate.keys()].sort().forEach(date => {
        recordsByDate.get(date).forEach(record => {
            latestByExercise.set(record.exerciseId, record.estimatedOneRepMax);
        });

        const indexes = [];
        latestByExercise.forEach((current, exerciseId) => {
            const baseline = baselineByExercise.get(exerciseId);
            if (Number.isFinite(baseline) && baseline > 0) {
                indexes.push((current / baseline) * 100);
            }
        });

        if (indexes.length >= 2) {
            points.push({
                date,
                value: indexes.reduce((sum, value) => sum + value, 0) / indexes.length,
                exerciseCount: indexes.length
            });
        }
    });

    return points;
}

function filterPointsToRange(points, rangeWindow) {
    if (!rangeWindow.startDate) return points;
    return points.filter(point =>
        point.date >= rangeWindow.startDate && point.date <= rangeWindow.endDate
    );
}

function formatShortDate(value) {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
    }).format(new Date(`${value}T12:00:00`));
}

function renderOverallStrengthIndexForRange() {
    const canvas = document.getElementById("overall-strength-index-chart");
    const summary = document.getElementById("overall-strength-index-summary");
    if (!canvas || !summary || canvas.closest("[hidden]")) return;

    const rangeWindow = getRangeWindow();
    const allPoints = buildStrengthIndexPoints(readSessions());
    const points = filterPointsToRange(allPoints, rangeWindow);

    drawStrengthIndexChart(canvas, points);

    if (!allPoints.length) {
        summary.textContent = "Log at least two valid performances in at least two core movement categories to establish an overall strength trend. 100 represents baseline strength.";
        return;
    }

    if (!points.length) {
        summary.textContent = `No Overall Strength Index points fall within the selected ${rangeWindow.label} timeframe.`;
        return;
    }

    const latest = points[points.length - 1];
    const change = latest.value - 100;
    const direction = change > 0 ? "above" : change < 0 ? "below" : "at";
    const magnitude = Math.abs(change).toFixed(1);
    const comparison = direction === "at" ? "at baseline" : `${magnitude}% ${direction} baseline`;

    summary.textContent = `Current index: ${latest.value.toFixed(1)} — about ${comparison}. ${rangeWindow.label} view · based on ${latest.exerciseCount} of 6 core movement categories.`;

    const method = document.getElementById("overall-strength-index-method");
    if (method && !method.querySelector("[data-strength-range-note]")) {
        method.insertAdjacentHTML(
            "afterbegin",
            '<p data-strength-range-note><strong>Timeframe:</strong> the selector changes which part of the strength history is displayed. The 100 baseline remains the first valid recorded performance so ranges stay comparable.</p>'
        );
    }
}

function drawStrengthIndexChart(canvas, points) {
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 700;
    const height = canvas.clientHeight || 300;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { top: 28, right: 18, bottom: 44, left: 48 };
    const plotWidth = Math.max(1, width - padding.left - padding.right);
    const plotHeight = Math.max(1, height - padding.top - padding.bottom);

    context.strokeStyle = "#333";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding.left, padding.top);
    context.lineTo(padding.left, height - padding.bottom);
    context.lineTo(width - padding.right, height - padding.bottom);
    context.stroke();

    if (!points.length) {
        context.fillStyle = "#a0a0a0";
        context.font = "12px Arial";
        context.textAlign = "center";
        context.fillText("No strength-index data in this timeframe", width / 2, height / 2);
        return;
    }

    const values = points.map(point => point.value);
    const rawMinimum = Math.min(100, ...values);
    const rawMaximum = Math.max(100, ...values);
    const range = Math.max(4, rawMaximum - rawMinimum);
    const margin = Math.max(2, range * 0.2);
    const axisMinimum = Math.floor((rawMinimum - margin) / 2) * 2;
    const axisMaximum = Math.ceil((rawMaximum + margin) / 2) * 2;
    const axisRange = Math.max(4, axisMaximum - axisMinimum);
    const yFor = value => height - padding.bottom - ((value - axisMinimum) / axisRange) * plotHeight;

    for (let tick = 0; tick <= 4; tick++) {
        const value = axisMinimum + axisRange * tick / 4;
        const y = yFor(value);
        context.strokeStyle = "#2f2f2f";
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.fillStyle = "#a0a0a0";
        context.font = "11px Arial";
        context.textAlign = "right";
        context.fillText(value.toFixed(0), padding.left - 7, y + 4);
    }

    const baselineY = yFor(100);
    context.save();
    context.strokeStyle = "rgba(255,255,255,.24)";
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(padding.left, baselineY);
    context.lineTo(width - padding.right, baselineY);
    context.stroke();
    context.restore();

    const xFor = index => points.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + index / (points.length - 1) * plotWidth;

    context.strokeStyle = "#e10600";
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    points.forEach((point, index) => {
        const x = xFor(index);
        const y = yFor(point.value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    });
    context.stroke();

    context.fillStyle = "#fff";
    points.forEach((point, index) => {
        context.beginPath();
        context.arc(xFor(index), yFor(point.value), 2.5, 0, Math.PI * 2);
        context.fill();
    });

    context.fillStyle = "#a0a0a0";
    context.font = "10px Arial";
    context.textAlign = "left";
    context.fillText(formatShortDate(points[0].date), padding.left, height - 16);
    context.textAlign = "right";
    context.fillText(formatShortDate(points[points.length - 1].date), width - padding.right, height - 16);
}

function refreshExerciseTrendSummary() {
    const select = document.getElementById("exercise-progress-select");
    if (!select) return;
    select.dispatchEvent(new Event("change", { bubbles: true }));
}

function refreshRangeDependentAnalytics() {
    renderOverallStrengthIndexForRange();
    refreshExerciseTrendSummary();
}

function scheduleRefresh(delay = 60) {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => requestAnimationFrame(refreshRangeDependentAnalytics), delay);
}

document.addEventListener("click", event => {
    if (
        event.target.closest("[data-training-analytics-range]") ||
        event.target.closest("#load-training-demo") ||
        event.target.closest("#remove-training-demo") ||
        event.target.closest("#lifting-tab") ||
        event.target.closest('.training-progress-tab[data-view="overview"]') ||
        event.target.closest('.training-progress-tab[data-view="exercises"]')
    ) {
        scheduleRefresh(80);
    }
}, true);

document.addEventListener("change", event => {
    if (event.target?.id === "progress-range") scheduleRefresh(45);
});

window.addEventListener("resize", () => scheduleRefresh(50), { passive: true });
window.addEventListener("storage", event => {
    if (event.key === RANGE_STORAGE_KEY || event.key === SESSION_STORAGE_KEY) {
        scheduleRefresh(45);
    }
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => {
        const canvas = document.getElementById("overall-strength-index-chart");
        if (!canvas) {
            observedStrengthCanvas = null;
            return;
        }
        if (canvas !== observedStrengthCanvas) {
            observedStrengthCanvas = canvas;
            scheduleRefresh(25);
        }
    }).observe(content, { childList: true, subtree: true });
}

scheduleRefresh(80);