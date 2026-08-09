const SESSION_STORAGE_KEY = "forge_workout_sessions";

function estimateOneRepMax(set) {
    return Number(set?.weight) * (1 + Number(set?.reps) / 30);
}

function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}

function getFilteredSessions() {
    const days = Number(document.getElementById("progress-range")?.value || 0);
    const cutoff = new Date();
    if (days) cutoff.setDate(cutoff.getDate() - days);

    return getSessions()
        .filter(session => {
            if (!days) return true;
            return new Date(`${session.date}T23:59:59`) >= cutoff;
        })
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function getExerciseRecords(exerciseId) {
    if (!exerciseId) return [];

    return getFilteredSessions()
        .map(session => {
            const exercise = session.exercises?.find(item => item.exerciseId === exerciseId);
            if (!exercise) return null;

            const completed = (exercise.sets || []).filter(set =>
                Number(set.weight) > 0 && Number(set.reps) > 0
            );
            if (!completed.length) return null;

            const bestSet = [...completed].sort(
                (a, b) => estimateOneRepMax(b) - estimateOneRepMax(a)
            )[0];

            return {
                date: session.date,
                estimatedOneRepMax: estimateOneRepMax(bestSet)
            };
        })
        .filter(Boolean);
}

function formatShortDate(value) {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
    }).format(new Date(`${value}T00:00:00`));
}

function getDurationLabel(startDate, endDate) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const days = Math.max(0, Math.round((end - start) / 86400000));

    if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
    const weeks = Math.max(1, Math.round(days / 7));
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
}

function ensureSummaryElement() {
    const canvas = document.getElementById("exercise-strength-chart");
    if (!canvas) return null;

    let summary = document.getElementById("exercise-strength-trend-summary");
    if (summary) return summary;

    summary = document.createElement("div");
    summary.id = "exercise-strength-trend-summary";
    summary.className = "exercise-strength-trend-summary";
    canvas.insertAdjacentElement("beforebegin", summary);
    return summary;
}

function renderStrengthTrendSummary() {
    const select = document.getElementById("exercise-progress-select");
    const summary = ensureSummaryElement();
    if (!select || !summary) return;

    const records = getExerciseRecords(select.value);

    if (records.length < 2) {
        summary.className = "exercise-strength-trend-summary is-neutral";
        summary.innerHTML = `
            <span class="strength-trend-label">Estimated strength change</span>
            <strong>More data needed</strong>
            <small>Complete this exercise at least twice to calculate a trend.</small>
        `;
        return;
    }

    const first = records[0];
    const last = records[records.length - 1];
    const change = last.estimatedOneRepMax - first.estimatedOneRepMax;
    const percent = first.estimatedOneRepMax > 0
        ? change / first.estimatedOneRepMax * 100
        : 0;
    const direction = change > 0 ? "increase" : change < 0 ? "decrease" : "neutral";
    const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "→";
    const sign = change > 0 ? "+" : "";

    summary.className = `exercise-strength-trend-summary is-${direction}`;
    summary.innerHTML = `
        <span class="strength-trend-label">Estimated strength change</span>
        <strong>${arrow} ${sign}${change.toFixed(1)} lb <span>(${sign}${percent.toFixed(1)}%)</span></strong>
        <small>From ${formatShortDate(first.date)} to ${formatShortDate(last.date)} · ${getDurationLabel(first.date, last.date)}</small>
    `;
}

function initializeStrengthTrendSummary() {
    document.addEventListener("change", event => {
        if (event.target?.id === "exercise-progress-select") {
            requestAnimationFrame(renderStrengthTrendSummary);
        }
    });

    document.addEventListener("click", event => {
        if (
            event.target?.closest("[data-view='exercises']") ||
            event.target?.id === "lifting-tab" ||
            event.target?.id === "load-training-demo" ||
            event.target?.id === "remove-training-demo"
        ) {
            setTimeout(renderStrengthTrendSummary, 50);
        }
    });

    const content = document.getElementById("content");
    if (content) {
        new MutationObserver(() => {
            if (
                document.getElementById("exercise-strength-chart") &&
                !document.getElementById("exercise-strength-trend-summary")
            ) {
                renderStrengthTrendSummary();
            }
        }).observe(content, { childList: true, subtree: true });
    }

    renderStrengthTrendSummary();
}

initializeStrengthTrendSummary();
