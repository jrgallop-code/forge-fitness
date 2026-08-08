const SESSION_STORAGE_KEY = "forge_workout_sessions";

let observerStarted = false;

export function initializeExerciseProgressV2() {
    if (observerStarted) return;
    observerStarted = true;

    const content = document.getElementById("content");
    if (!content) return;

    const initializeIfPresent = () => {
        const oldCanvas = document.getElementById("exercise-strength-chart");
        const existingHost = document.getElementById("exercise-strength-chart-v2");

        if (oldCanvas && !existingHost) {
            const host = document.createElement("div");
            host.id = "exercise-strength-chart-v2";
            host.className = oldCanvas.className || "";
            host.style.width = "100%";
            host.style.minHeight = "300px";
            host.setAttribute("aria-label", "Exercise estimated 1RM chart");

            oldCanvas.replaceWith(host);
            bindControls();
            renderExerciseProgressV2();
        }
        else if (existingHost) {
            bindControls();
            renderExerciseProgressV2();
        }
    };

    initializeIfPresent();

    const observer = new MutationObserver(initializeIfPresent);
    observer.observe(content, { childList: true, subtree: true });
}

function bindControls() {
    bindOnce(document.getElementById("exercise-progress-select"), "change", renderExerciseProgressV2);
    bindOnce(document.getElementById("progress-range"), "change", renderExerciseProgressV2);
    bindOnce(document.getElementById("lifting-tab"), "click", () => requestAnimationFrame(renderExerciseProgressV2));
}

function bindOnce(element, eventName, handler) {
    if (!element) return;
    const key = `epv2${eventName}`;
    if (element.dataset[key]) return;
    element.dataset[key] = "1";
    element.addEventListener(eventName, handler);
}

function renderExerciseProgressV2() {
    const host = document.getElementById("exercise-strength-chart-v2");
    const select = document.getElementById("exercise-progress-select");
    const history = document.getElementById("exercise-history-body");

    if (!host || !select || !history) return;

    const exerciseId = select.value;
    const records = getValidRecords(exerciseId);

    renderSvgChart(host, records);
    renderHistory(history, records);
}

function getValidRecords(exerciseId) {
    if (!exerciseId) return [];

    return getFilteredSessions()
        .map(session => {
            const matchingExercises = Array.isArray(session.exercises)
                ? session.exercises.filter(exercise => exercise?.exerciseId === exerciseId)
                : [];

            const performedSets = matchingExercises
                .flatMap(exercise => Array.isArray(exercise.sets) ? exercise.sets : [])
                .filter(isPerformedSet);

            if (!performedSets.length) return null;

            const ranked = performedSets
                .map(set => ({ set, oneRepMax: estimateOneRepMax(set) }))
                .filter(item => Number.isFinite(item.oneRepMax) && item.oneRepMax > 0)
                .sort((a, b) => b.oneRepMax - a.oneRepMax);

            if (!ranked.length) return null;

            return {
                date: session.date,
                bestSet: ranked[0].set,
                estimatedOneRepMax: ranked[0].oneRepMax,
                completedSets: performedSets.length
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

    // Business rule: zero reps means the set did not happen.
    if (!Number.isFinite(reps) || reps <= 0) return false;

    // Estimated 1RM requires a positive external load.
    if (!Number.isFinite(weight) || weight <= 0) return false;

    return true;
}

function estimateOneRepMax(set) {
    const weight = Number(set.weight);
    const reps = Number(set.reps);
    return weight * (1 + reps / 30);
}

function getFilteredSessions() {
    let sessions = [];

    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        sessions = Array.isArray(parsed) ? parsed : [];
    }
    catch {
        sessions = [];
    }

    const days = Number(document.getElementById("progress-range")?.value || 0);

    if (days > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        sessions = sessions.filter(session => {
            if (!session?.date) return false;
            const date = new Date(`${session.date}T23:59:59`);
            return Number.isFinite(date.getTime()) && date >= cutoff;
        });
    }

    return sessions.sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));
}

function renderHistory(container, records) {
    if (!records.length) {
        container.innerHTML = '<p class="empty-state">No performed sets with reps above 0 for this exercise.</p>';
        return;
    }

    container.innerHTML = [...records]
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

function renderSvgChart(host, records) {
    const width = Math.max(320, Math.round(host.clientWidth || 700));
    const height = 300;
    const padding = { top: 34, right: 18, bottom: 46, left: 56 };

    if (!records.length) {
        host.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" width="100%" height="300" role="img" aria-label="No exercise progress data">
                <text x="${padding.left}" y="18" fill="#a0a0a0" font-size="12">Epley Estimated 1RM (lb)</text>
                <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#333" />
                <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#333" />
                <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#a0a0a0" font-size="12">No performed sets to plot</text>
            </svg>
        `;
        return;
    }

    const values = records.map(record => record.estimatedOneRepMax);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = Math.max(5, maxValue - minValue);

    // Deliberately never use 0 as the graph minimum. This chart is only for performed data.
    let axisMin = Math.floor((minValue - spread * 0.15) / 5) * 5;
    axisMin = Math.max(1, axisMin);
    let axisMax = Math.ceil((maxValue + spread * 0.15) / 5) * 5;
    if (axisMax <= axisMin) axisMax = axisMin + 10;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const coords = records.map((record, index) => {
        const x = records.length === 1
            ? padding.left + chartWidth / 2
            : padding.left + (index / (records.length - 1)) * chartWidth;
        const y = padding.top + (axisMax - record.estimatedOneRepMax) / (axisMax - axisMin) * chartHeight;
        return { ...record, x, y };
    });

    const ticks = Array.from({ length: 5 }, (_, i) => axisMin + (axisMax - axisMin) * i / 4);
    const polyline = coords.map(point => `${point.x},${point.y}`).join(" ");

    host.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="300" role="img" aria-label="Estimated one rep max progress">
            <text x="${padding.left}" y="18" fill="#a0a0a0" font-size="12">Epley Estimated 1RM (lb)</text>
            ${ticks.map(tick => {
                const y = padding.top + (axisMax - tick) / (axisMax - axisMin) * chartHeight;
                return `
                    <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#2f2f2f" />
                    <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="#a0a0a0" font-size="11">${Math.round(tick)}</text>
                `;
            }).join("")}
            <polyline points="${polyline}" fill="none" stroke="#e10600" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
            ${coords.map((point, index) => {
                const showLabel = coords.length <= 8 || index === 0 || index === coords.length - 1 || index % Math.ceil(coords.length / 6) === 0;
                return `
                    <circle cx="${point.x}" cy="${point.y}" r="4" fill="#ffffff" />
                    ${showLabel ? `<text x="${point.x}" y="${height - 18}" text-anchor="middle" fill="#a0a0a0" font-size="11">${formatShortDate(point.date)}</text>` : ""}
                `;
            }).join("")}
        </svg>
    `;
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
