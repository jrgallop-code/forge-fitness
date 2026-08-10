import { getExerciseById } from "../workouts/exercise-library.js";

const SESSION_KEY = "forge_workout_sessions";
let completionHandlerBound = false;

export function renderWorkoutPerformanceDashboard() {
    const sessions = getSessions();
    const latest = sessions[0];
    if (!latest) return "";
    const result = calculatePerformance(latest, sessions);
    return `<section class="section-card performance-dashboard-card">
        <div class="performance-compact-head">
            <div><span class="eyebrow">LAST WORKOUT</span><h2>Workout Performance</h2></div>
            ${renderScore(result)}
        </div>
        <div class="performance-title-line"><strong>${escapeHtml(result.label)}</strong><span>${escapeHtml(latest.trainingDayName || latest.planName || "Workout")} · ${formatRelativeDate(latest)}</span></div>
        ${renderStatusStrip(result)}
        ${result.topImprovement ? `<div class="performance-top"><span>Top improvement</span><strong>${escapeHtml(result.topImprovement.name)}</strong><small>${escapeHtml(result.topImprovement.detail)}</small></div>` : ""}
        <button class="performance-toggle" type="button" data-performance-toggle aria-expanded="false" ${result.exercises.length ? "" : "hidden"}>View exercise breakdown</button>
        <div class="performance-breakdown" data-performance-panel hidden>${result.exercises.map(renderExerciseRow).join("")}</div>
        <p class="performance-note">Score compares completed working sets with the previous matching workout. New exercises are not scored.</p>
    </section>`;
}

export function initializeWorkoutPerformance() {
    bindToggles(document);
    if (completionHandlerBound) return;
    completionHandlerBound = true;
    document.addEventListener("click", event => {
        const button = event.target.closest?.("#save-session-btn");
        const logger = button?.closest("#workout-session-logger");
        if (!button || !logger || logger.dataset.editingSessionId) return;
        setTimeout(() => showCompletedSummary(logger), 0);
    }, true);
}

function showCompletedSummary(logger) {
    if (!document.body.contains(logger)) return;
    const sessions = getSessions();
    const latest = sessions[0];
    if (!latest || latest.status === "in_progress") return;
    const result = calculatePerformance(latest, sessions);
    logger.innerHTML = `<div class="performance-complete-card">
        <div class="performance-complete-kicker">WORKOUT COMPLETE</div>
        <div class="performance-compact-head">
            <div><h3>${escapeHtml(latest.trainingDayName || latest.planName || "Workout")}</h3><p>${escapeHtml(result.label)}</p></div>
            ${renderScore(result)}
        </div>
        ${renderStatusStrip(result)}
        <div class="performance-facts"><span><strong>${result.completedSets}</strong> working sets</span><span><strong>${result.prs}</strong> PR${result.prs === 1 ? "" : "s"}</span><span><strong>${formatDuration(latest)}</strong> duration</span></div>
        ${result.topImprovement ? `<div class="performance-top"><span>Top improvement</span><strong>${escapeHtml(result.topImprovement.name)}</strong><small>${escapeHtml(result.topImprovement.detail)}</small></div>` : ""}
        <button class="performance-toggle" type="button" data-performance-toggle aria-expanded="false" ${result.exercises.length ? "" : "hidden"}>View exercise breakdown</button>
        <div class="performance-breakdown" data-performance-panel hidden>${result.exercises.map(renderExerciseRow).join("")}</div>
        <p class="performance-note">This is a session comparison, not a judgment of effort. Normal day-to-day changes are expected.</p>
        <button class="primary-btn performance-done" type="button" data-performance-done>Done</button>
    </div>`;
    bindToggles(logger);
    logger.querySelector("[data-performance-done]")?.addEventListener("click", () => logger.remove());
    logger.scrollIntoView({ behavior: "smooth", block: "start" });
}

function calculatePerformance(session, allSessions) {
    const previous = allSessions.find(item =>
        item.id !== session.id &&
        item.planId === session.planId &&
        Number(item.trainingDayIndex) === Number(session.trainingDayIndex) &&
        getSessionTime(item) < getSessionTime(session)
    );
    const previousById = new Map((previous?.exercises || []).map(item => [item.exerciseId, item]));
    const older = allSessions.filter(item => item.id !== session.id && getSessionTime(item) < getSessionTime(session));
    const exercises = [];
    let completedSets = 0;
    let plannedSets = 0;
    let prs = 0;

    (session.exercises || []).forEach(current => {
        const definition = getExerciseById(current.exerciseId);
        if (definition?.trackingType === "notes" || current.trackingType === "notes") return;
        const currentSets = completedSetsOnly(current.sets);
        const previousSets = completedSetsOnly(previousById.get(current.exerciseId)?.sets);
        plannedSets += Array.isArray(current.sets) ? current.sets.length : 0;
        completedSets += currentSets.length;
        if (!currentSets.length) {
            exercises.push({ name: definition?.name || "Exercise", status: "Incomplete", detail: "No completed working sets" });
            return;
        }
        if (!previousSets.length) {
            exercises.push({ name: definition?.name || "Exercise", status: "New", detail: formatBestSet(currentSets) });
            return;
        }

        const currentMetric = getSetMetric(currentSets);
        const previousMetric = getSetMetric(previousSets);
        const change = previousMetric.score > 0 ? (currentMetric.score - previousMetric.score) / previousMetric.score : 0;
        let status = "Maintained";
        if (change > 0.015) status = "Improved";
        else if (change < -0.03) status = "Declined";

        const historicalBest = Math.max(0, ...older.flatMap(item =>
            (item.exercises || [])
                .filter(exercise => exercise.exerciseId === current.exerciseId)
                .map(exercise => getSetMetric(completedSetsOnly(exercise.sets)).score)
        ));
        const isPr = historicalBest > 0 && currentMetric.score > historicalBest * 1.005;
        if (isPr) prs += 1;
        exercises.push({
            name: definition?.name || "Exercise",
            status,
            isPr,
            change,
            detail: `${formatBestSet(currentSets)} · Previous ${formatBestSet(previousSets)}`
        });
    });

    const comparable = exercises.filter(item => ["Improved", "Maintained", "Declined"].includes(item.status));
    const improved = comparable.filter(item => item.status === "Improved").length;
    const maintained = comparable.filter(item => item.status === "Maintained").length;
    const declined = comparable.filter(item => item.status === "Declined").length;
    let score = null;
    if (comparable.length) {
        const progression = comparable.reduce((sum, item) => sum + (item.status === "Improved" ? 1 : item.status === "Maintained" ? 0.7 : 0.25), 0) / comparable.length;
        const completion = plannedSets ? Math.min(1, completedSets / plannedSets) : 0;
        const prRate = Math.min(1, prs / comparable.length);
        const consistency = exercises.length ? exercises.filter(item => item.status !== "Incomplete").length / exercises.length : 0;
        score = Math.round(progression * 50 + completion * 25 + prRate * 15 + consistency * 10);
    }
    const topImprovement = exercises
        .filter(item => item.status === "Improved")
        .sort((a, b) => b.change - a.change)[0] || null;

    return { score, label: getLabel(score), improved, maintained, declined, prs, completedSets, exercises, topImprovement };
}

function renderScore(result) {
    return `<div class="performance-score ${result.score === null ? "performance-baseline" : ""}"><strong>${result.score ?? "—"}</strong><span>${result.score === null ? "Baseline" : "Score"}</span></div>`;
}
function renderStatusStrip(result) {
    return `<div class="performance-status-strip"><span class="is-improved">↑ ${result.improved} improved</span><span class="is-maintained">= ${result.maintained} maintained</span><span class="is-declined">↓ ${result.declined} declined</span></div>`;
}
function renderExerciseRow(item) {
    const className = item.status.toLowerCase().replace(/\s+/g, "-");
    return `<div class="performance-row"><div><strong>${escapeHtml(item.name)}${item.isPr ? ' <span class="performance-pr">PR</span>' : ""}</strong><small>${escapeHtml(item.detail)}</small></div><span class="performance-row-status is-${className}">${item.status === "Improved" ? "↑" : item.status === "Maintained" ? "=" : item.status === "Declined" ? "↓" : "·"} ${escapeHtml(item.status)}</span></div>`;
}
function bindToggles(root) {
    root.querySelectorAll?.("[data-performance-toggle]").forEach(button => {
        if (button.dataset.bound) return;
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
            const panel = button.nextElementSibling;
            if (!panel) return;
            panel.hidden = !panel.hidden;
            button.setAttribute("aria-expanded", String(!panel.hidden));
            button.textContent = panel.hidden ? "View exercise breakdown" : "Hide exercise breakdown";
        });
    });
}
function completedSetsOnly(sets) {
    return (Array.isArray(sets) ? sets : []).filter(set => set?.completed && Number(set.weight) >= 0 && Number(set.reps) > 0);
}
function getSetMetric(sets) {
    return sets.reduce((best, set) => {
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        const score = weight > 0 ? weight * (1 + reps / 30) : reps;
        return score > best.score ? { score, weight, reps } : best;
    }, { score: 0, weight: 0, reps: 0 });
}
function formatBestSet(sets) {
    const best = getSetMetric(sets);
    if (!best.score) return "No completed sets";
    return best.weight > 0 ? `${formatNumber(best.weight)} × ${best.reps}` : `${best.reps} reps`;
}
function getLabel(score) {
    if (score === null) return "Baseline Session";
    if (score >= 90) return "Exceptional";
    if (score >= 75) return "Strong Session";
    if (score >= 60) return "Solid Session";
    if (score >= 40) return "Below Baseline";
    return "Limited Session";
}
function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
        return (Array.isArray(parsed) ? parsed : []).sort((a, b) => getSessionTime(b) - getSessionTime(a));
    } catch { return []; }
}
function getSessionTime(session) {
    const value = session?.completedAt || (session?.date ? `${session.date}T12:00:00` : "");
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
}
function formatRelativeDate(session) {
    const days = Math.floor(Math.max(0, Date.now() - getSessionTime(session)) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
}
function formatDuration(session) {
    const minutes = Math.max(0, Math.round((Number(session?.durationMs) || Number(session?.durationMinutes) * 60000 || 0) / 60000));
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
function formatNumber(value) { return Number.isInteger(value) ? String(value) : Number(value).toFixed(1); }
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
