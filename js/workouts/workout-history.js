import { navigate } from "../core/router.js?v=adaptive-guidance-1";
import { exercises } from "./exercise-library.js?v=exercise-library-cardio-3";
import { calculatePrCounts } from "./workout-pr-badges.js?v=workout-pr-badges-2";
import { deleteCompletedWorkout, discardActiveWorkout, getActiveWorkout, getWorkoutSessions, openActiveWorkout, openCompletedWorkoutForEdit } from "./workout-session.js?v=adaptive-completion-1";
import { calculateWorkoutVolume } from "./volume-calculator.js?v=two-dumbbells-1";

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
    const allSessions = getWorkoutSessions();
    const session = allSessions.find(item => String(item.id) === String(sessionId));
    if (!session) return;
    const prCount = calculatePrCounts(allSessions).get(session.id) || 0;
    document.getElementById("workout-history-preview")?.remove();
    document.body.classList.add("workout-history-preview-open");
    document.body.insertAdjacentHTML("beforeend", renderWorkoutPreview(session, prCount));
    const modal = document.getElementById("workout-history-preview");
    const close = () => {
        modal?.remove();
        document.body.classList.remove("workout-history-preview-open");
    };
    modal?.querySelector("[data-preview-close]")?.addEventListener("click", close);
    modal?.addEventListener("click", event => { if (event.target === modal) close(); });
    modal?.querySelector("[data-preview-edit]")?.addEventListener("click", () => { close(); navigate("workout"); openCompletedWorkoutForEdit(session.id); });
}

function renderWorkoutPreview(session, prCount) {
    const recordedExercises = (session.exercises || []).filter(hasRecordedExerciseData);
    const volume = calculateWorkoutVolume(session);
    return `<div class="workout-history-preview-backdrop" id="workout-history-preview" role="dialog" aria-modal="true" aria-labelledby="workout-preview-title">
        <section class="workout-history-preview-sheet">
            <div class="workout-preview-header"><button class="workout-preview-close" data-preview-close type="button" aria-label="Close">×</button><div><span class="eyebrow">${isOneOff(session) ? "ONE-OFF WORKOUT" : "WORKOUT SUMMARY"}</span><h2 id="workout-preview-title">${escapeHtml(session.planName || "Workout")}</h2><p>${escapeHtml(session.trainingDayName || "Training day")} • ${formatDate(session.date)}</p></div><button class="workout-preview-edit" data-preview-edit type="button">Edit</button></div>
            <div class="workout-preview-stats"><div><span>Duration</span><strong>${formatSavedDuration(session)}</strong></div><div><span>Volume</span><strong>${volume > 0 ? `${formatNumber(volume)} lb` : "—"}</strong></div><div><span>Completed</span><strong>${formatProgress(session)}</strong></div><div class="workout-preview-pr-stat"><span>Personal Records</span><strong>${prCount > 0 ? `${trophyIcon()} PR · ${prCount}` : "—"}</strong></div></div>
            <div class="workout-preview-exercises">${recordedExercises.length ? recordedExercises.map(renderPreviewExercise).join("") : `<p class="workout-preview-empty">No recorded exercise data in this workout.</p>`}</div>
        </section>
    </div>`;
}

function renderPreviewExercise(exercise) {
    const details = resolveExerciseDetails(exercise);
    if (exercise.trackingType === "notes" || details.trackingType === "notes") {
        const cardioDetails = [Number(exercise.durationMinutes) > 0 ? `${Number(exercise.durationMinutes)} min` : "", String(exercise.distance || "").trim(), String(exercise.notes || "").trim()].filter(Boolean);
        return `<section class="workout-preview-exercise"><div class="workout-preview-exercise-heading"><div><h3>${escapeHtml(details.name)}</h3><p class="workout-preview-exercise-meta">${escapeHtml(formatExerciseMeta(details, true))}</p></div><span class="workout-preview-type-pill">Cardio</span></div><p class="workout-preview-cardio">${cardioDetails.map(escapeHtml).join(" • ") || "Recorded"}</p></section>`;
    }
    const sets = (exercise.sets || []).filter(set => set.completed || set.weight !== null || set.reps !== null).filter(set => Number.isFinite(Number(set.weight)) || Number.isFinite(Number(set.reps)));
    return `<section class="workout-preview-exercise"><div class="workout-preview-exercise-heading"><div><h3>${escapeHtml(details.name)}</h3><p class="workout-preview-exercise-meta">${escapeHtml(formatExerciseMeta(details, false))}</p></div><span class="workout-preview-type-pill">${escapeHtml(capitalize(details.type || "Resistance"))}</span></div><div class="workout-preview-set-list">${sets.map((set, index) => renderPreviewSet(set, index)).join("") || `<p>No completed sets</p>`}</div></section>`;
}

function renderPreviewSet(set, index) {
    const drops = (Array.isArray(set.dropSets) ? set.dropSets : [])
        .filter(drop => drop.weight !== null || drop.reps !== null);
    return `<div class="workout-preview-parent-set"><span>${index + 1}</span><strong>${formatSet(set)}</strong>${drops.length ? `<div class="workout-preview-drop-list">${drops.map((drop, dropIndex) => `<small>↳ Drop ${dropIndex + 1}</small><b>${formatSet(drop)}</b>`).join("")}</div>` : ""}</div>`;
}

function resolveExerciseDetails(exercise) {
    const id = exercise?.exerciseId || exercise?.id;
    const libraryExercise = id ? exercises.find(item => String(item.id) === String(id)) : null;
    return {
        name: exercise?.name || exercise?.exerciseName || libraryExercise?.name || (exercise?.trackingType === "notes" ? "Cardio" : "Exercise"),
        muscleGroup: exercise?.muscleGroup || libraryExercise?.muscleGroup || "",
        type: exercise?.type || libraryExercise?.type || (exercise?.trackingType === "notes" ? "cardio" : "resistance"),
        equipment: exercise?.equipment || libraryExercise?.equipment || "",
        trackingType: exercise?.trackingType || libraryExercise?.trackingType || "reps"
    };
}

function formatExerciseMeta(details, cardio) {
    const parts = [];
    if (details.muscleGroup) parts.push(details.muscleGroup);
    if (details.equipment) parts.push(details.equipment);
    if (!parts.length) parts.push(cardio ? "Cardio exercise" : "Resistance exercise");
    return parts.join(" • ");
}

function trophyIcon() {
    return `<svg class="workout-pr-trophy" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3.5c0 3.2-1.7 5.5-4 5.5s-4-2.3-4-5.5V4Z"/><path d="M8 6H4.5v1.3c0 2.4 1.5 4.2 3.9 4.5M16 6h3.5v1.3c0 2.4-1.5 4.2-3.9 4.5"/><path d="M12 13v4M8.5 20h7M10 17h4"/></svg>`;
}

function renderHistoryCard(session) {
    const dropSetCount = countRecordedDropSets(session);
    return `<article class="history-workout-card history-workout-card-clickable" data-session-id="${escapeHtml(session.id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(session.planName || "workout")} summary">
        <div class="history-workout-card-top"><span class="history-status completed">${isOneOff(session) ? "One-Off Workout" : "Completed"}</span><time datetime="${escapeHtml(session.date || "")}">${formatDate(session.date)}</time></div>
        <h3>${escapeHtml(session.planName || "Workout")}</h3><p>${escapeHtml(session.trainingDayName || "Training day")}</p>
        <div class="history-workout-metrics"><span>${formatProgress(session)}</span><span>${formatSavedDuration(session)}</span>${dropSetCount ? `<span>${dropSetCount} drop ${dropSetCount === 1 ? "set" : "sets"}</span>` : ""}</div>
        <div class="history-card-actions"><span class="history-view-summary">View Summary ›</span><button class="delete-history-workout secondary-btn" type="button" data-session-id="${escapeHtml(session.id)}">Delete</button></div>
    </article>`;
}

function countRecordedDropSets(session) {
    return (session.exercises || []).flatMap(exercise => exercise.sets || []).reduce((count, set) =>
        count + (Array.isArray(set.dropSets) ? set.dropSets : []).filter(drop =>
            drop.completed || drop.weight !== null || drop.reps !== null
        ).length, 0);
}

function hasRecordedExerciseData(exercise) {
    if (exercise?.trackingType === "notes") return Number(exercise.durationMinutes) > 0 || String(exercise.distance || "").trim() || String(exercise.notes || "").trim();
    return (exercise?.sets || []).some(set => set.completed || set.weight !== null || set.reps !== null);
}

function formatSet(set) {
    const weight = Number(set.weight); const reps = Number(set.reps);
    if (Number.isFinite(weight) && weight > 0 && Number.isFinite(reps)) return `${weight} lb × ${reps}`;
    if (Number.isFinite(reps)) return `${reps} reps`;
    if (Number.isFinite(weight) && weight > 0) return `${weight} lb`;
    return "Recorded";
}

function capitalize(value) { const text = String(value || ""); return text ? text.charAt(0).toUpperCase() + text.slice(1) : ""; }
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
