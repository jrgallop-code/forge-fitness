import { getExerciseById } from "../workouts/exercise-library.js";

const SESSION_STORAGE_KEY = "forge_workout_sessions";

export function initializeWeeklyMuscleVolume() {
    const range = document.getElementById("progress-range");
    const liftingTab = document.getElementById("lifting-tab");

    range?.addEventListener("change", renderWeeklyMuscleVolume);
    liftingTab?.addEventListener("click", () => requestAnimationFrame(renderWeeklyMuscleVolume));

    document
        .querySelectorAll('.training-progress-tab[data-view="training"]')
        .forEach(button => {
            button.addEventListener("click", () => requestAnimationFrame(renderWeeklyMuscleVolume));
        });

    renderWeeklyMuscleVolume();
}

function renderWeeklyMuscleVolume() {
    const canvas = document.getElementById("weekly-sets-chart");
    if (!canvas) return;

    const card = canvas.closest(".analytics-card");
    if (!card) return;

    const heading = card.querySelector("h4");
    if (heading) heading.textContent = "Average Weekly Sets by Muscle Group";

    canvas.hidden = true;

    let container = document.getElementById("weekly-muscle-volume");
    if (!container) {
        container = document.createElement("div");
        container.id = "weekly-muscle-volume";
        container.className = "weekly-muscle-volume";
        canvas.insertAdjacentElement("afterend", container);
    }

    const days = Number(document.getElementById("progress-range")?.value || 0);
    const sessions = getFilteredSessions(days);
    const weekDivisor = getWeekDivisor(days, sessions);
    const totals = getMuscleSetTotals(sessions);

    const entries = Object.entries(totals)
        .map(([muscle, sets]) => [muscle, Math.floor(sets / weekDivisor)])
        .filter(([, average]) => average > 0)
        .sort((a, b) => b[1] - a[1]);

    const periodLabel = days
        ? `${formatWeeks(days)} selected weeks`
        : `${formatWeeksFromDivisor(weekDivisor)} weeks of logged data`;

    if (!entries.length) {
        container.innerHTML = `
            <p class="weekly-volume-note">Average completed working sets per muscle group per week · ${periodLabel}</p>
            <p class="empty-state">Complete sets with reps greater than 0 to populate this view.</p>
        `;
        return;
    }

    const maximum = Math.max(1, ...entries.map(([, average]) => average));

    container.innerHTML = `
        <p class="weekly-volume-note">
            Average completed working sets per muscle group per week · ${periodLabel}. Decimals are rounded down.
        </p>
        <div class="weekly-volume-bars">
            ${entries.map(([muscle, average]) => `
                <div class="weekly-volume-row">
                    <div class="weekly-volume-row-top">
                        <strong>${escapeHtml(muscle)}</strong>
                        <span>${average} sets/wk</span>
                    </div>
                    <div class="weekly-volume-track" aria-hidden="true">
                        <div class="weekly-volume-fill" style="width:${Math.max(4, (average / maximum) * 100)}%"></div>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function getFilteredSessions(days) {
    const sessions = getSessions();
    if (!days) return sessions.sort(sortByDate);

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days + 1);

    return sessions
        .filter(session => {
            const date = new Date(`${session.date}T23:59:59`);
            return !Number.isNaN(date.getTime()) && date >= cutoff;
        })
        .sort(sortByDate);
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

function getMuscleSetTotals(sessions) {
    const totals = {};

    sessions.forEach(session => {
        session.exercises?.forEach(exercise => {
            const muscle = getExerciseById(exercise.exerciseId)?.muscleGroup || "Other";
            const completedSets = exercise.sets?.filter(set => Number(set.reps) > 0).length || 0;

            if (completedSets > 0) {
                totals[muscle] = (totals[muscle] || 0) + completedSets;
            }
        });
    });

    return totals;
}

function getWeekDivisor(days, sessions) {
    if (days > 0) {
        return Math.max(1, days / 7);
    }

    if (!sessions.length) return 1;

    const first = new Date(`${sessions[0].date}T00:00:00`);
    const last = new Date(`${sessions[sessions.length - 1].date}T00:00:00`);

    if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return 1;

    const spanDays = Math.max(1, Math.floor((last - first) / 86400000) + 1);
    return Math.max(1, spanDays / 7);
}

function formatWeeks(days) {
    const weeks = days / 7;
    return Number.isInteger(weeks) ? String(weeks) : weeks.toFixed(1);
}

function formatWeeksFromDivisor(weeks) {
    return weeks < 10 ? weeks.toFixed(1) : Math.round(weeks).toString();
}

function sortByDate(a, b) {
    return String(a?.date || "").localeCompare(String(b?.date || ""));
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
