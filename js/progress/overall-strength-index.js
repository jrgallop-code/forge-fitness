const SESSION_STORAGE_KEY = "forge_workout_sessions";

export function initializeOverallStrengthIndex() {
    ensureStrengthIndexCard();

    const render = () => requestAnimationFrame(renderOverallStrengthIndex);

    document.getElementById("lifting-tab")?.addEventListener("click", render);
    document.querySelectorAll('.training-progress-tab[data-view="overview"]').forEach(button => {
        button.addEventListener("click", render);
    });
    document.getElementById("load-training-demo")?.addEventListener("click", () => setTimeout(render, 0));
    document.getElementById("remove-training-demo")?.addEventListener("click", () => setTimeout(render, 0));
    window.addEventListener("resize", render);

    render();
}

function ensureStrengthIndexCard() {
    const overview = document.querySelector('.training-progress-view[data-view="overview"]');
    if (!overview || document.getElementById("overall-strength-index-chart")) return;

    overview.insertAdjacentHTML("afterbegin", `
        <div class="analytics-card overall-strength-index-card">
            <h4>Overall Strength Index</h4>
            <p class="analytics-note">
                A personal strength trend built from your logged estimated 1RMs. Each exercise starts at an index of 100, then changes relative to its own first valid performance. The overall index is the average of qualifying exercise indexes.
            </p>
            <canvas
                id="overall-strength-index-chart"
                class="training-chart"
                aria-label="Overall strength index over time"
            ></canvas>
            <p id="overall-strength-index-summary" class="analytics-note">
                100 = baseline strength. An index of 105 means overall estimated strength is about 5% above baseline; 95 means about 5% below baseline.
            </p>
        </div>
    `);
}

function renderOverallStrengthIndex() {
    const canvas = document.getElementById("overall-strength-index-chart");
    const summary = document.getElementById("overall-strength-index-summary");
    if (!canvas || !summary) return;

    const points = buildStrengthIndexPoints(getSessions());
    drawStrengthIndexChart(canvas, points);

    if (!points.length) {
        summary.textContent = "Log at least two valid performances for at least two weighted exercises to establish an overall strength trend. 100 represents baseline strength.";
        return;
    }

    const latest = points[points.length - 1];
    const change = latest.value - 100;
    const direction = change > 0 ? "above" : change < 0 ? "below" : "at";
    const magnitude = Math.abs(change).toFixed(1);
    const comparison = direction === "at"
        ? "at baseline"
        : `${magnitude}% ${direction} baseline`;

    summary.textContent = `Current index: ${latest.value.toFixed(1)} — about ${comparison}. 100 is your starting baseline. The index averages ${latest.exerciseCount} qualifying exercise${latest.exerciseCount === 1 ? "" : "s"}, each normalized to its own first valid estimated 1RM.`;
}

function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(parsed)
            ? parsed.filter(session => /^\d{4}-\d{2}-\d{2}$/.test(String(session?.date || "")))
                .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            : [];
    } catch {
        return [];
    }
}

function buildStrengthIndexPoints(sessions) {
    const recordsByExercise = new Map();

    sessions.forEach(session => {
        session.exercises?.forEach(exercise => {
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

    const qualifying = [...recordsByExercise.entries()]
        .map(([exerciseId, records]) => {
            const byDate = new Map();
            records.forEach(record => {
                const existing = byDate.get(record.date);
                if (!existing || record.estimatedOneRepMax > existing.estimatedOneRepMax) {
                    byDate.set(record.date, record);
                }
            });
            const deduped = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
            return { exerciseId, records: deduped };
        })
        .filter(item => item.records.length >= 2);

    if (qualifying.length < 2) return [];

    const baselineByExercise = new Map(
        qualifying.map(item => [item.exerciseId, item.records[0].estimatedOneRepMax])
    );
    const eligibleIds = new Set(qualifying.map(item => item.exerciseId));
    const recordsByDate = new Map();

    qualifying.forEach(item => {
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
            if (eligibleIds.has(record.exerciseId)) {
                latestByExercise.set(record.exerciseId, record.estimatedOneRepMax);
            }
        });

        const indexes = [];
        latestByExercise.forEach((current, exerciseId) => {
            const baseline = baselineByExercise.get(exerciseId);
            if (Number.isFinite(baseline) && baseline > 0) {
                indexes.push((current / baseline) * 100);
            }
        });

        if (indexes.length) {
            points.push({
                date,
                label: formatShortDate(date),
                value: indexes.reduce((sum, value) => sum + value, 0) / indexes.length,
                exerciseCount: indexes.length
            });
        }
    });

    return points;
}

function estimateOneRepMax(set) {
    return Number(set.weight) * (1 + Number(set.reps) / 30);
}

function drawStrengthIndexChart(canvas, points) {
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 700;
    const height = canvas.clientHeight || 300;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { top: 28, right: 18, bottom: 44, left: 48 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

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
        context.fillText("More strength data needed", width / 2, height / 2);
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
        const value = axisMinimum + (axisRange * tick / 4);
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
    context.setLineDash([5, 5]);
    context.strokeStyle = "#777";
    context.beginPath();
    context.moveTo(padding.left, baselineY);
    context.lineTo(width - padding.right, baselineY);
    context.stroke();
    context.restore();
    context.fillStyle = "#a0a0a0";
    context.font = "10px Arial";
    context.textAlign = "left";
    context.fillText("Baseline 100", padding.left + 5, Math.max(12, baselineY - 6));

    const coordinates = points.map((point, index) => ({
        ...point,
        x: padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
        y: yFor(point.value)
    }));

    context.strokeStyle = "#e10600";
    context.lineWidth = 3;
    context.beginPath();
    coordinates.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
    });
    context.stroke();

    const labelEvery = Math.max(1, Math.ceil(coordinates.length / 6));
    coordinates.forEach((point, index) => {
        context.fillStyle = "#fff";
        context.beginPath();
        context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
        context.fill();

        if (coordinates.length <= 7 || index === 0 || index === coordinates.length - 1 || index % labelEvery === 0) {
            context.fillStyle = "#a0a0a0";
            context.font = "10px Arial";
            context.textAlign = "center";
            context.fillText(point.label, point.x, height - 17);
        }
    });
}

function formatShortDate(value) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
        .format(new Date(`${value}T00:00:00`));
}
