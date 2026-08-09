import { getExerciseById } from "../workouts/exercise-library.js";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const TARGET_MIN = 10;
const TARGET_MAX = 20;

export function initializeWeeklyMuscleVolume() {
    const range = document.getElementById("progress-range");
    const liftingTab = document.getElementById("lifting-tab");

    range?.addEventListener("change", renderTrainingVolumeAnalytics);
    liftingTab?.addEventListener("click", () => requestAnimationFrame(renderTrainingVolumeAnalytics));

    document
        .querySelectorAll('.training-progress-tab[data-view="training"]')
        .forEach(button => {
            button.addEventListener("click", () => requestAnimationFrame(renderTrainingVolumeAnalytics));
        });

    renderTrainingVolumeAnalytics();
}

function renderTrainingVolumeAnalytics() {
    const canvas = document.getElementById("weekly-sets-chart");
    const muscleDistribution = document.getElementById("muscle-distribution");

    if (!canvas || !muscleDistribution) return;

    const trainingView = canvas.closest('.training-progress-view[data-view="training"]');
    const weeklyCard = canvas.closest(".analytics-card");
    const averageCard = muscleDistribution.closest(".analytics-card");

    if (!trainingView || !weeklyCard || !averageCard) return;

    const weeklyHeading = weeklyCard.querySelector("h4");
    const averageHeading = averageCard.querySelector("h4");

    if (weeklyHeading) weeklyHeading.textContent = "Weekly Sets by Muscle Group";
    if (averageHeading) averageHeading.textContent = "Average Weekly Sets by Muscle Group";

    canvas.hidden = true;
    muscleDistribution.innerHTML = "";

    ensureAnalyticsCards(trainingView, averageCard);

    const days = Number(document.getElementById("progress-range")?.value || 0);
    const sessions = getFilteredSessions(days);
    const weeks = buildWeekRange(days, sessions);
    const muscleData = buildMuscleData(sessions, weeks);

    renderWeeklyMuscleChart(weeklyCard, muscleData, weeks);
    renderAverageWeeklySets(averageCard, muscleData, weeks);
    renderFrequency(muscleData, weeks);
    renderOverallWeeklySets(sessions, weeks);
    renderVolumeStatus(muscleData, weeks);
}

function ensureAnalyticsCards(trainingView, averageCard) {
    if (!document.getElementById("muscle-frequency-card")) {
        averageCard.insertAdjacentHTML("afterend", `
            <div class="analytics-card" id="muscle-frequency-card">
                <h4>Training Frequency by Muscle Group</h4>
                <div id="muscle-frequency"></div>
            </div>

            <div class="analytics-card" id="overall-weekly-sets-card">
                <h4>Overall Weekly Working Sets</h4>
                <div id="overall-weekly-sets"></div>
            </div>

            <div class="analytics-card" id="hypertrophy-volume-status-card">
                <h4>Hypertrophy Volume Status</h4>
                <div id="hypertrophy-volume-status"></div>
            </div>
        `);
    }
}

function renderWeeklyMuscleChart(card, muscleData, weeks) {
    let container = document.getElementById("weekly-muscle-volume");

    if (!container) {
        container = document.createElement("div");
        container.id = "weekly-muscle-volume";
        container.className = "weekly-muscle-volume";
        card.appendChild(container);
    }

    const muscles = Object.keys(muscleData)
        .filter(muscle => muscle !== "Other")
        .sort((a, b) => a.localeCompare(b));

    if (!weeks.length || !muscles.length) {
        container.innerHTML = '<p class="empty-state">Complete working sets to populate weekly muscle-group volume.</p>';
        return;
    }

    container.innerHTML = `
        <p class="weekly-volume-note">
            Completed working sets by week. Sets with 0 reps are treated as no data.
        </p>
        <div class="volume-heatmap-wrap">
            <div class="volume-heatmap" style="--week-count:${weeks.length}">
                <div class="volume-heatmap-corner">Muscle</div>
                ${weeks.map(week => `<div class="volume-week-label">${escapeHtml(formatWeekLabel(week))}</div>`).join("")}
                ${muscles.map(muscle => `
                    <div class="volume-muscle-label">${escapeHtml(muscle)}</div>
                    ${weeks.map(week => {
                        const value = muscleData[muscle]?.weeks?.[week] || 0;
                        return `<div class="volume-cell ${getVolumeClass(value)}" title="${escapeHtml(muscle)} · ${escapeHtml(formatWeekLabel(week))}: ${value} sets">${value}</div>`;
                    }).join("")}
                `).join("")}
            </div>
        </div>
        <div class="volume-legend">
            <span><i class="legend-low"></i> Under 10</span>
            <span><i class="legend-target"></i> 10–20</span>
            <span><i class="legend-high"></i> Over 20</span>
        </div>
    `;
}

function renderAverageWeeklySets(card, muscleData, weeks) {
    const container = document.getElementById("muscle-distribution");
    if (!container) return;

    const divisor = Math.max(1, weeks.length);
    const entries = Object.entries(muscleData)
        .filter(([muscle]) => muscle !== "Other")
        .map(([muscle, data]) => [muscle, Math.floor(data.totalSets / divisor)])
        .filter(([, average]) => average > 0)
        .sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
        container.innerHTML = '<p class="empty-state">Average weekly sets will appear after workouts are logged.</p>';
        return;
    }

    const maximum = Math.max(TARGET_MAX, ...entries.map(([, average]) => average));

    container.innerHTML = `
        <p class="weekly-volume-note">Average completed sets per week across the selected date range. Decimals are rounded down.</p>
        <div class="weekly-volume-bars">
            ${entries.map(([muscle, average]) => `
                <div class="weekly-volume-row">
                    <div class="weekly-volume-row-top">
                        <strong>${escapeHtml(muscle)}</strong>
                        <span>${average} sets/wk</span>
                    </div>
                    <div class="weekly-volume-track">
                        <div class="weekly-volume-target-zone" style="left:${TARGET_MIN / maximum * 100}%; width:${(TARGET_MAX - TARGET_MIN) / maximum * 100}%"></div>
                        <div class="weekly-volume-fill ${getVolumeClass(average)}" style="width:${Math.min(100, average / maximum * 100)}%"></div>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function renderFrequency(muscleData, weeks) {
    const container = document.getElementById("muscle-frequency");
    if (!container) return;

    const divisor = Math.max(1, weeks.length);
    const entries = Object.entries(muscleData)
        .filter(([muscle]) => muscle !== "Other")
        .map(([muscle, data]) => [muscle, data.sessionCount / divisor])
        .filter(([, frequency]) => frequency > 0)
        .sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
        container.innerHTML = '<p class="empty-state">Training frequency will appear after workouts are logged.</p>';
        return;
    }

    const maximum = Math.max(1, ...entries.map(([, frequency]) => frequency));

    container.innerHTML = `
        <p class="weekly-volume-note">Average number of sessions per week in which each muscle received at least one completed working set.</p>
        <div class="frequency-bars">
            ${entries.map(([muscle, frequency]) => `
                <div class="frequency-row">
                    <span>${escapeHtml(muscle)}</span>
                    <div class="frequency-track"><div class="frequency-fill" style="width:${frequency / maximum * 100}%"></div></div>
                    <strong>${formatFrequency(frequency)}×/wk</strong>
                </div>
            `).join("")}
        </div>
    `;
}

function renderOverallWeeklySets(sessions, weeks) {
    const container = document.getElementById("overall-weekly-sets");
    if (!container) return;

    if (!weeks.length) {
        container.innerHTML = '<p class="empty-state">Overall weekly working sets will appear after workouts are logged.</p>';
        return;
    }

    const totals = Object.fromEntries(weeks.map(week => [week, 0]));

    sessions.forEach(session => {
        const week = getWeekStart(session.date);
        if (!(week in totals)) return;
        totals[week] += countCompletedSets(session);
    });

    const maximum = Math.max(1, ...Object.values(totals));

    container.innerHTML = `
        <p class="weekly-volume-note">Total completed working sets across all exercises each week.</p>
        <div class="overall-week-chart">
            ${weeks.map(week => `
                <div class="overall-week-column">
                    <span class="overall-week-value">${totals[week]}</span>
                    <div class="overall-week-bar-wrap">
                        <div class="overall-week-bar" style="height:${totals[week] / maximum * 100}%"></div>
                    </div>
                    <small>${escapeHtml(formatWeekLabel(week))}</small>
                </div>
            `).join("")}
        </div>
    `;
}

function renderVolumeStatus(muscleData, weeks) {
    const container = document.getElementById("hypertrophy-volume-status");
    if (!container) return;

    const divisor = Math.max(1, weeks.length);
    const entries = Object.entries(muscleData)
        .filter(([muscle]) => muscle !== "Other")
        .map(([muscle, data]) => ({
            muscle,
            average: Math.floor(data.totalSets / divisor)
        }))
        .filter(item => item.average > 0)
        .sort((a, b) => b.average - a.average);

    if (!entries.length) {
        container.innerHTML = '<p class="empty-state">Volume status will appear after workouts are logged.</p>';
        return;
    }

    container.innerHTML = `
        <p class="weekly-volume-note">Uses the current 10–20 completed sets/week coaching range. This is a planning guide, not a hard rule.</p>
        <div class="volume-status-grid">
            ${entries.map(item => {
                const status = getVolumeStatus(item.average);
                return `
                    <div class="volume-status-card ${status.className}">
                        <span>${escapeHtml(item.muscle)}</span>
                        <strong>${item.average} sets/wk</strong>
                        <small>${status.label}</small>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function buildMuscleData(sessions, weeks) {
    const data = {};

    sessions.forEach(session => {
        const week = getWeekStart(session.date);
        if (!weeks.includes(week)) return;

        const sessionMuscles = new Set();

        session.exercises?.forEach(exercise => {
            const completedSets = exercise.sets?.filter(set => Number(set.reps) > 0).length || 0;
            if (!completedSets) return;

            const muscle = getExerciseById(exercise.exerciseId)?.muscleGroup || "Other";

            if (!data[muscle]) {
                data[muscle] = {
                    totalSets: 0,
                    sessionCount: 0,
                    weeks: Object.fromEntries(weeks.map(item => [item, 0]))
                };
            }

            data[muscle].totalSets += completedSets;
            data[muscle].weeks[week] += completedSets;
            sessionMuscles.add(muscle);
        });

        sessionMuscles.forEach(muscle => {
            data[muscle].sessionCount += 1;
        });
    });

    return data;
}

function buildWeekRange(days, sessions) {
    const end = new Date();
    end.setHours(0, 0, 0, 0);

    let start;

    if (days > 0) {
        start = new Date(end);
        start.setDate(start.getDate() - days + 1);
    }
    else if (sessions.length) {
        start = new Date(`${sessions[0].date}T00:00:00`);
    }
    else {
        return [];
    }

    const firstWeek = new Date(`${getWeekStart(toDateValue(start))}T00:00:00`);
    const lastWeek = new Date(`${getWeekStart(toDateValue(end))}T00:00:00`);
    const weeks = [];

    for (let cursor = new Date(firstWeek); cursor <= lastWeek; cursor.setDate(cursor.getDate() + 7)) {
        weeks.push(toDateValue(cursor));
    }

    return weeks;
}

function getFilteredSessions(days) {
    const sessions = getSessions().sort(sortByDate);
    if (!days) return sessions;

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days + 1);

    return sessions.filter(session => {
        const date = new Date(`${session.date}T23:59:59`);
        return !Number.isNaN(date.getTime()) && date >= cutoff;
    });
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

function countCompletedSets(session) {
    return session.exercises?.reduce((total, exercise) => {
        return total + (exercise.sets?.filter(set => Number(set.reps) > 0).length || 0);
    }, 0) || 0;
}

function getVolumeClass(value) {
    if (value >= TARGET_MIN && value <= TARGET_MAX) return "volume-target";
    if (value > TARGET_MAX) return "volume-high";
    return "volume-low";
}

function getVolumeStatus(value) {
    if (value < TARGET_MIN) return { label: "Below target", className: "status-low" };
    if (value > TARGET_MAX) return { label: "Above target", className: "status-high" };
    return { label: "In target range", className: "status-target" };
}

function formatFrequency(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getWeekStart(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return toDateValue(date);
}

function formatWeekLabel(value) {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
    }).format(new Date(`${value}T00:00:00`));
}

function toDateValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
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
