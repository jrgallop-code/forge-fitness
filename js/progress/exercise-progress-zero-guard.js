const SESSION_STORAGE_KEY = "forge_workout_sessions";

export function initializeExerciseProgressZeroGuard() {
    const content = document.getElementById("content");

    const refresh = () => {
        const select = document.getElementById("exercise-progress-select");
        const canvas = document.getElementById("exercise-strength-chart");
        const history = document.getElementById("exercise-history-body");

        if (!select || !canvas || !history) return;

        attachOnce(select, "change", renderGuardedExerciseProgress);
        attachOnce(document.getElementById("progress-range"), "change", () => {
            requestAnimationFrame(renderGuardedExerciseProgress);
        });
        attachOnce(document.getElementById("lifting-tab"), "click", () => {
            requestAnimationFrame(renderGuardedExerciseProgress);
        });

        requestAnimationFrame(renderGuardedExerciseProgress);
    };

    refresh();

    if (content) {
        const observer = new MutationObserver(refresh);
        observer.observe(content, { childList: true, subtree: true });
    }
}

function attachOnce(element, eventName, handler) {
    if (!element) return;
    const key = `zeroGuard${eventName}`;
    if (element.dataset[key]) return;
    element.dataset[key] = "1";
    element.addEventListener(eventName, handler);
}

function renderGuardedExerciseProgress() {
    const select = document.getElementById("exercise-progress-select");
    const canvas = document.getElementById("exercise-strength-chart");
    const history = document.getElementById("exercise-history-body");

    if (!select || !canvas || !history) return;

    const exerciseId = select.value;
    const records = getValidExerciseRecords(getFilteredSessions(), exerciseId);

    drawPositiveOnlyLineChart(canvas, records.map(record => ({
        label: formatShortDate(record.date),
        value: record.estimatedOneRepMax
    })));

    if (!records.length) {
        history.innerHTML = `
            <p class="empty-state">
                No completed sets with reps above 0 for this exercise yet.
            </p>
        `;
        return;
    }

    history.innerHTML = [...records]
        .reverse()
        .map(record => `
            <div class="exercise-history-row">
                <span>${formatDate(record.date)}</span>
                <strong>${formatSet(record.bestSet)}</strong>
                <span>${record.estimatedOneRepMax.toFixed(1)}</span>
                <span>${record.completedSets}</span>
            </div>
        `)
        .join("");
}

function getValidExerciseRecords(sessions, exerciseId) {
    if (!exerciseId) return [];

    return sessions
        .map(session => {
            // A plan can contain duplicate exercise entries. Check all matching entries,
            // not just the first one, and ignore every set where reps are 0/missing.
            const matchingExercises = Array.isArray(session.exercises)
                ? session.exercises.filter(item => item?.exerciseId === exerciseId)
                : [];

            const validSets = matchingExercises
                .flatMap(exercise => Array.isArray(exercise.sets) ? exercise.sets : [])
                .filter(isPerformedSet);

            if (!validSets.length) return null;

            const scoredSets = validSets
                .map(set => ({
                    set,
                    estimate: estimateOneRepMax(set)
                }))
                .filter(item => Number.isFinite(item.estimate) && item.estimate > 0)
                .sort((a, b) => b.estimate - a.estimate);

            if (!scoredSets.length) return null;

            return {
                date: session.date,
                bestSet: scoredSets[0].set,
                estimatedOneRepMax: scoredSets[0].estimate,
                completedSets: validSets.length
            };
        })
        .filter(record =>
            record &&
            Number.isFinite(record.estimatedOneRepMax) &&
            record.estimatedOneRepMax > 0
        );
}

function isPerformedSet(set) {
    if (!set) return false;

    const reps = Number(set.reps);
    const weight = Number(set.weight);

    // Core rule: reps of 0 means the set was not performed, therefore NO DATA.
    // Blank, null, undefined, NaN, negative reps, and zero reps are all excluded.
    return Number.isFinite(reps) &&
        reps > 0 &&
        Number.isFinite(weight) &&
        weight > 0;
}

function estimateOneRepMax(set) {
    const weight = Number(set.weight);
    const reps = Number(set.reps);

    if (!Number.isFinite(weight) || weight <= 0) return NaN;
    if (!Number.isFinite(reps) || reps <= 0) return NaN;

    return weight * (1 + reps / 30);
}

function getFilteredSessions() {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return [];

    let sessions;
    try {
        sessions = JSON.parse(stored);
    }
    catch {
        return [];
    }

    if (!Array.isArray(sessions)) return [];

    const days = Number(document.getElementById("progress-range")?.value || 0);
    let filtered = sessions;

    if (days > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        filtered = sessions.filter(session =>
            new Date(`${session.date}T23:59:59`) >= cutoff
        );
    }

    return filtered.sort((a, b) =>
        String(a.date || "").localeCompare(String(b.date || ""))
    );
}

function drawPositiveOnlyLineChart(canvas, incomingPoints) {
    // Final fail-safe: a zero/non-finite point is physically incapable of reaching the graph.
    const points = incomingPoints.filter(point =>
        Number.isFinite(Number(point.value)) && Number(point.value) > 0
    );

    const context = prepareCanvas(canvas);
    if (!context) return;

    const width = canvas.clientWidth || 700;
    const height = canvas.clientHeight || 300;

    context.strokeStyle = "#333";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(40, 20);
    context.lineTo(40, height - 40);
    context.lineTo(width - 15, height - 40);
    context.stroke();

    context.fillStyle = "#a0a0a0";
    context.font = "12px Arial";
    context.textAlign = "left";
    context.fillText("Epley Estimated 1RM (lb)", 45, 15);

    if (!points.length) {
        context.textAlign = "center";
        context.fillText("No performed sets to plot", width / 2, height / 2);
        return;
    }

    const padding = { top: 35, right: 20, bottom: 45, left: 55 };
    const values = points.map(point => Number(point.value));
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const rawRange = maximum - minimum;
    const margin = Math.max(5, rawRange * 0.15);
    const axisMinimum = Math.max(0, Math.floor((minimum - margin) / 5) * 5);
    let axisMaximum = Math.ceil((maximum + margin) / 5) * 5;
    if (axisMaximum <= axisMinimum) axisMaximum = axisMinimum + 10;
    const axisRange = axisMaximum - axisMinimum;

    for (let tick = 0; tick <= 4; tick++) {
        const value = axisMinimum + axisRange * tick / 4;
        const y = height - padding.bottom -
            (value - axisMinimum) / axisRange *
            (height - padding.top - padding.bottom);

        context.strokeStyle = "#2f2f2f";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();

        context.fillStyle = "#a0a0a0";
        context.font = "11px Arial";
        context.textAlign = "right";
        context.fillText(value.toFixed(0), padding.left - 8, y + 4);
    }

    const coordinates = points.map((point, index) => ({
        ...point,
        x: padding.left + (points.length === 1
            ? (width - padding.left - padding.right) / 2
            : index / (points.length - 1) * (width - padding.left - padding.right)),
        y: height - padding.bottom -
            (Number(point.value) - axisMinimum) / axisRange *
            (height - padding.top - padding.bottom)
    }));

    context.strokeStyle = "#e10600";
    context.lineWidth = 3;
    context.beginPath();
    coordinates.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
    });
    context.stroke();

    coordinates.forEach((point, index) => {
        context.fillStyle = "#ffffff";
        context.beginPath();
        context.arc(point.x, point.y, 4, 0, Math.PI * 2);
        context.fill();

        const showLabel = coordinates.length <= 8 ||
            index === 0 ||
            index === coordinates.length - 1 ||
            index % Math.ceil(coordinates.length / 6) === 0;

        if (showLabel) {
            context.fillStyle = "#a0a0a0";
            context.font = "11px Arial";
            context.textAlign = "center";
            context.fillText(point.label, point.x, height - 18);
        }
    });
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
    return context;
}

function formatSet(set) {
    return `${Number(set.weight)} × ${Number(set.reps)}`;
}

function formatDate(value) {
    if (!value) return "Unknown";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(new Date(`${value}T00:00:00`));
}

function formatShortDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
    }).format(new Date(`${value}T00:00:00`));
}
