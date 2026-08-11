import { navigate } from "../core/router.js?v=router-workout-flow-5";
import { deleteCompletedWorkout, discardActiveWorkout, getActiveWorkout, getWorkoutSessions, openActiveWorkout, openCompletedWorkoutForEdit } from "./workout-session.js?v=workout-session-4";

export function renderWorkoutHistory() {
    const active = getActiveWorkout();
    const sessions = getWorkoutSessions().sort((a, b) => String(b.completedAt || b.date || "").localeCompare(String(a.completedAt || a.date || "")));

    return `
        <section class="dashboard-welcome"><div><span class="eyebrow">TRAINING RECORDS</span><h2>Workout History</h2><p>Tap a completed workout to review its summary and training details.</p></div></section>
        ${active ? `<section class="section-card history-active-workout"><span class="eyebrow">${isOneOff(active) ? "ONE-OFF WORKOUT • IN PROGRESS" : "IN PROGRESS"}</span><h3>${escapeHtml(active.planName || "Active Workout")}</h3><p>${escapeHtml(active.trainingDayName || "Training day")} • ${formatDate(active.date)}</p><p>${formatProgress(active)} recorded • ${formatDuration(getActiveDuration(active))}</p><div class="builder-footer"><button id="history-resume-active" class="primary-btn" type="button">Resume Workout</button><button id="history-discard-active" class="secondary-btn" type="button">Discard</button></div></section>` : ""}
        <section class="history-workout-grid">${sessions.length ? sessions.map(renderHistoryCard).join("") : `<div class="workout-empty-state"><div class="empty-state-icon">＋</div><h4>No completed workouts yet</h4><p>Completed sessions will appear here automatically.</p></div>`}</section>`;
}

export function initializeWorkoutHistory() {
    document.getElementById("history-resume-active")?.addEventListener("click", () => { navigate("workout"); openActiveWorkout(); });
    document.getElementById("history-discard-active")?.addEventListener("click", () => { if (discardActiveWorkout()) refreshHistory(); });

    document.querySelectorAll(".history-workout-card[data-session-id]").forEach(card => {
        card.addEventListener("click", event => {
            if (event.target.closest("button")) return;
            openWorkoutPreview(card.dataset.sessionId);
        });
        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openWorkoutPreview(card.dataset.sessionId); }
        });
    });

    document.querySelectorAll(".delete-history-workout").forEach(button => button.addEventListener("click", event => {
        event.stopPropagation();
        if (deleteCompletedWorkout(button.dataset.sessionId)) refreshHistory();
    }));
}

function openWorkoutPreview(sessionId) {
    const session = getWorkoutSessions().find(item => String(item.id) === String(sessionId));
    if (!session) return;
    document.getElementById("workout-history-preview")?.remove();
    document.body.insertAdjacentHTML("beforeend", renderWorkoutPreview(session));
    const modal = document.getElementById("workout-history-preview");
    const close = () => modal?.remove();
    modal?.querySelector("[data-preview-close]")?.addEventListener("click", close);
    modal?.addEventListener("click", event => { if (event.target === modal) close(); });
    modal?.querySelector("[data-preview-edit]")?.addEventListener("click", () => { close(); navigate("workout"); openCompletedWorkoutForEdit(session.id); });
}

function renderWorkoutPreview(session) {
    const exercises = (session.exercises || []).filter(hasRecordedExerciseData);
    const volume = calculateVolume(session);
    return `<div class="workout-history-preview-backdrop" id="workout-history-preview" role="dialog" aria-modal="true" aria-labelledby="workout-preview-title">
        <section class="workout-history-preview-sheet">
            <div class="workout-preview-header"><button class="workout-preview-close" data-preview-close type="button" aria-label="Close">×</button><div><span class="eyebrow">${isOneOff(session) ? "ONE-OFF WORKOUT" : "WORKOUT SUMMARY"}</span><h2 id="workout-preview-title">${escapeHtml(session.planName || "Workout")}</h2><p>${escapeHtml(session.trainingDayName || "Training day")} • ${formatDate(session.date)}</p></div><button class="workout-preview-edit" data-preview-edit type="button">Edit</button></div>
            <div class="workout-preview-stats"><div><span>Duration</span><strong>${formatSavedDuration(session)}</strong></div><div><span>Volume</span><strong>${volume > 0 ? `${formatNumber(volume)} lb` : "—"}</strong></div><div><span>Completed</span><strong>${formatProgress(session)}</strong></div></div>
            <div class="workout-preview-exercises">${exercises.length ? exercises.map(renderPreviewExercise).join("") : `<p class="workout-preview-empty">No recorded exercise data in this workout.</p>`}</div>
        </section>
    </div>`;
}

function renderPreviewExercise(exercise) {
    if (exercise.trackingType === "notes") {
        const details = [Number(exercise.durationMinutes) > 0 ? `${Number(exercise.durationMinutes)} min` : "", String(exercise.distance || "").trim(), String(exercise.notes || "").trim()].filter(Boolean);
        return `<section class="workout-preview-exercise"><h3>${escapeHtml(exercise.name || "Cardio")}</h3><p class="workout-preview-cardio">${details.map(escapeHtml).join(" • ") || "Recorded"}</p></section>`;
    }
    const sets = (exercise.sets || []).filter(set => set.completed || set.weight !== null || set.reps !== null).filter(set => Number.isFinite(Number(set.weight)) || Number.isFinite(Number(set.reps)));
    return `<section class="workout-preview-exercise"><h3>${escapeHtml(exercise.name || "Exercise")}</h3><div class="workout-preview-set-list">${sets.map((set, index) => `<div><span>${index + 1}</span><strong>${formatSet(set)}</strong></div>`).join("") || `<p>No completed sets</p>`}</div></section>`;
}

function renderHistoryCard(session) {
    return `<article class="history-workout-card history-workout-card-clickable" data-session-id="${escapeHtml(session.id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(session.planName || "workout")} summary">
        <div class="history-workout-card-top"><span class="history-status completed">${isOneOff(session) ? "One-Off Workout" : "Completed"}</span><time datetime="${escapeHtml(session.date || "")}">${formatDate(session.date)}</time></div>
        <h3>${escapeHtml(session.planName || "Workout")}</h3><p>${escapeHtml(session.trainingDayName || "Training day")}</p>
        <div class="history-workout-metrics"><span>${formatProgress(session)}</span><span>${formatSavedDuration(session)}</span></div>
        <div class="history-card-actions"><span class="history-view-summary">View Summary ›</span><button class="delete-history-workout secondary-btn" type="button" data-session-id="${escapeHtml(session.id)}">Delete</button></div>
    </article>`;
}

function hasRecordedExerciseData(exercise) {
    if (exercise?.trackingType === "notes") return Number(exercise.durationMinutes) > 0 || String(exercise.distance || "").trim() || String(exercise.notes || "").trim();
    return (exercise?.sets || []).some(set => set.completed || set.weight !== null || set.reps !== null);
}

function calculateVolume(session) {
    return (session.exercises || []).flatMap(exercise => exercise.sets || []).reduce((sum, set) => {
        const weight = Number(set.weight); const reps = Number(set.reps);
        return Number.isFinite(weight) && weight > 0 && Number.isFinite(reps) && reps > 0 ? sum + weight * reps : sum;
    }, 0);
}

function formatSet(set) {
    const weight = Number(set.weight); const reps = Number(set.reps);
    if (Number.isFinite(weight) && weight > 0 && Number.isFinite(reps)) return `${weight} lb × ${reps}`;
    if (Number.isFinite(reps)) return `${reps} reps`;
    if (Number.isFinite(weight) && weight > 0) return `${weight} lb`;
    return "Recorded";
}

function formatNumber(value) { return Math.round(value).toLocaleString(); }
function refreshHistory() { const content = document.getElementById("content"); if (content) { content.innerHTML = renderWorkoutHistory(); initializeWorkoutHistory(); } }
function isOneOff(session) { return Boolean(session?.isOneOff || session?.planSnapshot?.isOneOff || String(session?.planId || "").startsWith("one-off-")); }
function formatProgress(session) {
    const sets = (session.exercises || []).flatMap(exercise => exercise.sets || []);
    const completed = sets.filter(set => set.completed || set.weight !== null || set.reps !== null).length;
    const cardioEntries = (session.exercises || []).filter(exercise => exercise.trackingType === "notes" && (Number(exercise.durationMinutes) > 0 || String(exercise.distance || "").trim() || String(exercise.notes || "").trim())).length;
    if (!sets.length) return `${cardioEntries} ${cardioEntries === 1 ? "entry" : "entries"}`;
    return `${completed}/${sets.length} sets`;
}
function formatSavedDuration(session) { const duration = Number(session.durationMs) || Number(session.durationMinutes) * 60000; return duration > 0 ? formatDuration(duration) : "Not recorded"; }
function getActiveDuration(session) { const accumulated = Number(session.accumulatedMs) || 0; if (!session.startedAt || session.pausedAt) return accumulated; return accumulated + Math.max(0, Date.now() - new Date(session.startedAt).getTime()); }
function formatDuration(milliseconds) { const totalMinutes = Math.max(0, Math.round(milliseconds / 60000)); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return hours ? `${hours}h ${minutes}m` : `${minutes} min`; }
function formatDate(value) { if (!value) return "Unknown date"; return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
