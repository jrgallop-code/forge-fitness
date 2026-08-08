import {
    navigate
}
from "../core/router.js?v=router-workout-flow-5";

import {
    deleteCompletedWorkout,
    discardActiveWorkout,
    getActiveWorkout,
    getWorkoutSessions,
    openActiveWorkout,
    openCompletedWorkoutForEdit
}
from "./workout-session.js?v=workout-session-4";


export function renderWorkoutHistory() {

    const active =
        getActiveWorkout();
    const sessions =
        getWorkoutSessions()
            .sort((a, b) =>
                String(
                    b.completedAt || b.date || ""
                ).localeCompare(
                    String(a.completedAt || a.date || "")
                )
            );


    return `
        <section class="dashboard-welcome">
            <div>
                <span class="eyebrow">TRAINING RECORDS</span>
                <h2>Workout History</h2>
                <p>Resume unfinished training or correct a previously saved workout.</p>
            </div>
        </section>

        ${active
            ? `
                <section class="section-card history-active-workout">
                    <span class="eyebrow">IN PROGRESS</span>
                    <h3>${escapeHtml(active.planName || "Active Workout")}</h3>
                    <p>${escapeHtml(active.trainingDayName || "Training day")} • ${formatDate(active.date)}</p>
                    <p>${formatProgress(active)} recorded • ${formatDuration(getActiveDuration(active))}</p>
                    <div class="builder-footer">
                        <button id="history-resume-active" class="primary-btn" type="button">Resume Workout</button>
                        <button id="history-discard-active" class="secondary-btn" type="button">Discard</button>
                    </div>
                </section>
            `
            : ""}

        <section class="history-workout-grid">
            ${sessions.length
                ? sessions.map(renderHistoryCard).join("")
                : `
                    <div class="workout-empty-state">
                        <div class="empty-state-icon">＋</div>
                        <h4>No completed workouts yet</h4>
                        <p>Completed sessions will appear here automatically.</p>
                    </div>
                `}
        </section>
    `;

}


export function initializeWorkoutHistory() {

    document
        .getElementById("history-resume-active")
        ?.addEventListener(
            "click",
            () => {
                navigate("workout");
                openActiveWorkout();
            }
        );

    document
        .getElementById("history-discard-active")
        ?.addEventListener(
            "click",
            () => {
                if (discardActiveWorkout()) {
                    refreshHistory();
                }
            }
        );

    document
        .querySelectorAll(".edit-history-workout")
        .forEach(button =>
            button.addEventListener(
                "click",
                () => {
                    navigate("workout");
                    openCompletedWorkoutForEdit(
                        button.dataset.sessionId
                    );
                }
            )
        );

    document
        .querySelectorAll(".delete-history-workout")
        .forEach(button =>
            button.addEventListener(
                "click",
                () => {
                    if (deleteCompletedWorkout(
                        button.dataset.sessionId
                    )) {
                        refreshHistory();
                    }
                }
            )
        );

}


function refreshHistory() {
    const content =
        document.getElementById("content");
    if (content) {
        content.innerHTML =
            renderWorkoutHistory();
        initializeWorkoutHistory();
    }
}


function renderHistoryCard(session) {

    return `
        <article class="history-workout-card">
            <div class="history-workout-card-top">
                <span class="history-status completed">Completed</span>
                <time datetime="${escapeHtml(session.date || "")}">${formatDate(session.date)}</time>
            </div>
            <h3>${escapeHtml(session.planName || "Workout")}</h3>
            <p>${escapeHtml(session.trainingDayName || "Training day")}</p>
            <div class="history-workout-metrics">
                <span>${formatProgress(session)}</span>
                <span>${formatSavedDuration(session)}</span>
            </div>
            <div class="builder-footer">
                <button class="edit-history-workout primary-btn" type="button" data-session-id="${escapeHtml(session.id)}">Edit Workout</button>
                <button class="delete-history-workout secondary-btn" type="button" data-session-id="${escapeHtml(session.id)}">Delete</button>
            </div>
        </article>
    `;

}


function formatProgress(session) {

    const sets =
        (session.exercises || [])
            .flatMap(exercise =>
                exercise.sets || []
            );
    const completed =
        sets.filter(set =>
            set.completed ||
            set.weight !== null ||
            set.reps !== null
        ).length;
    const notes =
        (session.exercises || [])
            .filter(exercise =>
                exercise.trackingType === "notes" &&
                exercise.notes
            ).length;

    if (!sets.length) {
        return `${notes} ${notes === 1 ? "entry" : "entries"}`;
    }
    return `${completed}/${sets.length} sets`;

}


function formatSavedDuration(session) {
    const duration =
        Number(session.durationMs) ||
        Number(session.durationMinutes) * 60000;
    return duration > 0
        ? formatDuration(duration)
        : "Duration not recorded";
}


function getActiveDuration(session) {
    const accumulated =
        Number(session.accumulatedMs) || 0;
    if (!session.startedAt || session.pausedAt) {
        return accumulated;
    }
    return accumulated +
        Math.max(
            0,
            Date.now() - new Date(session.startedAt).getTime()
        );
}


function formatDuration(milliseconds) {
    const totalMinutes =
        Math.max(0, Math.round(milliseconds / 60000));
    const hours =
        Math.floor(totalMinutes / 60);
    const minutes =
        totalMinutes % 60;
    return hours
        ? `${hours}h ${minutes}m`
        : `${minutes} min`;
}


function formatDate(value) {
    if (!value) {
        return "Unknown date";
    }
    return new Date(`${value}T12:00:00`)
        .toLocaleDateString(
            undefined,
            { month: "short", day: "numeric", year: "numeric" }
        );
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
