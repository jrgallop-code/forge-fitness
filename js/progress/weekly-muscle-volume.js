import { getExerciseById } from "../workouts/exercise-library.js";
import { createGeneratedExerciseGuide } from "../workouts/exercise-guide-generator.js?v=full-library-guides-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const PLAN_STORAGE_KEY = "forge_workout_plans";
const SCHEDULE_STORAGE_KEY = "level_up_workout_schedule_v1";
const MAX_WEEKS = 10;
const BASELINE_WEEKS = 4;
const MIN_BASELINE_WEEKS = 3;
const SECONDARY_SET_CREDIT = 0.5;
const HEATMAP_NORMALIZATION_SETS = 12;

export function initializeWeeklyMuscleVolume() {
    const liftingTab = document.getElementById("lifting-tab");

    liftingTab?.addEventListener("click", () =>
        requestAnimationFrame(renderTrainingVolumeAnalytics)
    );

    document
        .querySelectorAll('.training-progress-tab[data-view="training"]')
        .forEach(button => {
            button.addEventListener("click", () =>
                requestAnimationFrame(renderTrainingVolumeAnalytics)
            );
        });

    ["load-training-demo", "remove-training-demo"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", () => {
            setTimeout(renderTrainingVolumeAnalytics, 0);
        });
    });

    renderTrainingVolumeAnalytics();
}

function renderTrainingVolumeAnalytics() {
    const oldCanvas = document.getElementById("weekly-sets-chart");
    const muscleDistribution = document.getElementById("muscle-distribution");
    if (!muscleDistribution) return;

    let weeklyCard = document.getElementById("weekly-muscle-volume-card");

    if (!weeklyCard && oldCanvas) {
        weeklyCard = oldCanvas.closest(".analytics-card");
        if (weeklyCard) weeklyCard.id = "weekly-muscle-volume-card";
    }

    const trendsCard = muscleDistribution.closest(".analytics-card");
    if (!weeklyCard || !trendsCard) return;

    weeklyCard.querySelector("h4")?.replaceChildren(document.createTextNode("Weekly Sets by Muscle Group"));
    trendsCard.querySelector("h4")?.replaceChildren(document.createTextNode("Volume Trends"));

    oldCanvas?.remove();
    muscleDistribution.innerHTML = "";
    ensureAnalyticsCards(trendsCard);

    const allSessions = getSessions();
    const weeks = buildRecentWeekRange(allSessions);
    const sessions = filterSessionsToWeeks(allSessions, weeks);
    const muscleData = buildMuscleData(sessions, weeks);
    const rollingSevenDay = getRollingSevenDayVolume(allSessions);
    const completedBaselineWeeks = getCompletedBaselineWeeks(weeks);
    const baseline = getBaselineVolume(muscleData, completedBaselineWeeks);
    const plan = getPreferredPlan(allSessions);
    const planned = plan ? getWeeklyPlanVolume(plan) : new Map();

    renderWeeklyMuscleChart(weeklyCard, muscleData, weeks);
    renderVolumeTrends(muscleDistribution, rollingSevenDay, baseline, completedBaselineWeeks, planned, plan);
    renderFrequency(muscleData, completedBaselineWeeks);
    renderOverallWeeklySets(sessions, weeks);
}

function ensureAnalyticsCards(trendsCard) {
    document.getElementById("hypertrophy-volume-status-card")?.remove();

    let frequencyCard = document.getElementById("muscle-frequency-card");
    if (!frequencyCard) {
        trendsCard.insertAdjacentHTML("afterend", `
            <div class="analytics-card" id="muscle-frequency-card">
                <h4>Training Frequency by Muscle Group</h4>
                <div id="muscle-frequency"></div>
            </div>
        `);
        frequencyCard = document.getElementById("muscle-frequency-card");
    }

    if (!document.getElementById("overall-weekly-sets-card")) {
        frequencyCard?.insertAdjacentHTML("afterend", `
            <div class="analytics-card training-bar-card" id="overall-weekly-sets-card">
                <span class="training-chart-kicker">Training volume</span>
                <h4>Overall Weekly Working Sets</h4>
                <div id="overall-weekly-sets"></div>
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

    const windowText = weeks.length === MAX_WEEKS
        ? `Showing the latest ${MAX_WEEKS} weeks of training data.`
        : `Showing ${weeks.length} week${weeks.length === 1 ? "" : "s"} of available training data.`;

    container.innerHTML = `
        <p class="weekly-volume-note">
            ${windowText} Completed muscle-set credits are grouped by Monday–Sunday training week. Primary muscles receive 1.0 credit per completed set and secondary muscles receive 0.5.
        </p>
        <div class="volume-heatmap-wrap">
            <div class="volume-heatmap" style="--week-count:${weeks.length}">
                <div class="volume-heatmap-corner">Muscle</div>
                ${weeks.map(week => `<div class="volume-week-label">${escapeHtml(formatWeekLabel(week))}</div>`).join("")}
                ${muscles.map(muscle => `
                    <div class="volume-muscle-label">${escapeHtml(muscle)}</div>
                    ${weeks.map(week => {
                        const value = muscleData[muscle]?.weeks?.[week] || 0;
                        return renderHeatmapCell(muscle, week, value);
                    }).join("")}
                `).join("")}
            </div>
        </div>
        <div class="volume-legend volume-intensity-legend">
            <span><i class="legend-none"></i> None</span>
            <span><i class="legend-some"></i> Lower</span>
            <span><i class="legend-more"></i> Higher</span>
        </div>
    `;
}

function renderHeatmapCell(muscle, week, value) {
    const intensity = clamp(value / HEATMAP_NORMALIZATION_SETS, 0, 1);
    const backgroundAlpha = value > 0 ? 0.08 + intensity * 0.38 : 0.045;
    const borderAlpha = value > 0 ? 0.12 + intensity * 0.38 : 0.08;
    const color = value > 0 ? "#dff8e7" : "#c6c6cc";
    return `<div class="volume-cell" style="background:rgba(69,203,117,${backgroundAlpha.toFixed(3)});border-color:rgba(69,203,117,${borderAlpha.toFixed(3)});color:${color}" title="${escapeHtml(muscle)} · ${escapeHtml(formatWeekLabel(week))}: ${formatSets(value)} set credits">${formatSets(value)}</div>`;
}

function renderVolumeTrends(container, rollingSevenDay, baseline, completedBaselineWeeks, planned, plan) {
    if (!container) return;

    const baselineReady = completedBaselineWeeks.length >= MIN_BASELINE_WEEKS;
    const baselineLabel = baselineReady
        ? `${Math.min(BASELINE_WEEKS, completedBaselineWeeks.length)}-Wk Avg`
        : "Recent Avg";
    const muscles = new Set([
        ...rollingSevenDay.volume.keys(),
        ...(baselineReady ? baseline.keys() : []),
        ...planned.keys()
    ]);

    const entries = [...muscles]
        .filter(muscle => muscle && muscle !== "Other")
        .map(muscle => ({
            muscle,
            current: rollingSevenDay.volume.get(muscle) || 0,
            average: baselineReady ? baseline.get(muscle) ?? null : null,
            planned: planned.has(muscle) ? planned.get(muscle) : null
        }))
        .filter(item => item.current > 0 || item.average > 0 || item.planned > 0)
        .sort((a, b) => b.current - a.current || (b.planned || 0) - (a.planned || 0) || a.muscle.localeCompare(b.muscle));

    if (!entries.length) {
        container.innerHTML = '<p class="empty-state">Complete working sets to build your volume trends.</p>';
        return;
    }

    const baselineNote = baselineReady
        ? `${baselineLabel} uses completed Monday–Sunday weeks only and excludes the current partial week.`
        : `Your personal baseline will appear after ${MIN_BASELINE_WEEKS} completed training weeks. The app will use up to the latest ${BASELINE_WEEKS} completed weeks.`;
    const planNote = plan
        ? `Planned volume comes from your scheduled plan: ${escapeHtml(plan.name || "Workout Plan")}.`
        : "Set a workout schedule to add a Planned comparison.";

    container.innerHTML = `
        <p class="weekly-volume-note volume-trends-note">
            <strong>Use Last 7 Days for what you are doing now.</strong> ${baselineNote} ${planNote}
            Primary sets count 1.0 and secondary sets count 0.5. Use performance and recovery before changing volume.
        </p>
        <div class="volume-trends-header" aria-hidden="true">
            <span>Muscle</span><span>Last 7 Days</span><span>${escapeHtml(baselineLabel)}</span><span>Planned</span>
        </div>
        <div class="volume-trends-list">
            ${entries.map(item => renderTrendRow(item, baselineReady)).join("")}
        </div>
    `;
}

function renderTrendRow(item, baselineReady) {
    const insight = getVolumeInsight(item.current, baselineReady ? item.average : null, item.planned);
    return `
        <article class="volume-trend-row ${insight.className}">
            <div class="volume-trend-muscle">
                <strong>${escapeHtml(item.muscle)}</strong>
                <small>${escapeHtml(insight.label)}</small>
            </div>
            <div class="volume-trend-metric primary"><span>Last 7 Days</span><strong>${formatSets(item.current)}</strong></div>
            <div class="volume-trend-metric"><span>Recent Avg</span><strong>${item.average === null ? "—" : formatSets(item.average)}</strong></div>
            <div class="volume-trend-metric"><span>Planned</span><strong>${item.planned === null ? "—" : formatSets(item.planned)}</strong></div>
        </article>
    `;
}

function getVolumeInsight(current, average, planned) {
    if (Number.isFinite(planned)) {
        const delta = current - planned;
        const tolerance = Math.max(1, planned * 0.1);
        if (Math.abs(delta) <= tolerance) {
            return addBaselineContext({ label: "Right on plan", className: "is-on-plan" }, current, average);
        }
        if (delta < 0) {
            const label = Math.abs(delta) >= 2.5
                ? `${formatSets(Math.abs(delta))} set credits below plan`
                : "Slightly below plan";
            return addBaselineContext({ label, className: "is-below-plan" }, current, average);
        }
        const label = delta >= 2.5
            ? `${formatSets(delta)} set credits above plan`
            : "Slightly above plan";
        return addBaselineContext({ label, className: "is-above-plan" }, current, average);
    }

    if (Number.isFinite(average)) {
        const tolerance = Math.max(1, average * 0.15);
        const delta = current - average;
        if (Math.abs(delta) <= tolerance) return { label: "Close to your recent normal", className: "is-on-plan" };
        if (delta < 0) return { label: "Below your recent normal", className: "is-below-plan" };
        return { label: "Above your recent normal", className: "is-above-plan" };
    }

    return { label: "Building your personal baseline", className: "is-building" };
}

function addBaselineContext(insight, current, average) {
    if (!Number.isFinite(average) || average <= 0) return insight;
    const tolerance = Math.max(1, average * 0.15);
    const delta = current - average;
    if (Math.abs(delta) <= tolerance) return { ...insight, label: `${insight.label} · close to usual` };
    if (delta > 0) return { ...insight, label: `${insight.label} · above usual` };
    return { ...insight, label: `${insight.label} · below usual` };
}

function renderFrequency(muscleData, completedBaselineWeeks) {
    const container = document.getElementById("muscle-frequency");
    if (!container) return;

    const weeks = completedBaselineWeeks.slice(-BASELINE_WEEKS);
    if (weeks.length < MIN_BASELINE_WEEKS) {
        container.innerHTML = renderBuildingAverageMessage(`Training frequency will appear after ${MIN_BASELINE_WEEKS} completed training weeks.`);
        return;
    }

    const entries = Object.entries(muscleData)
        .filter(([muscle]) => muscle !== "Other")
        .map(([muscle, data]) => {
            const sessions = weeks.reduce((total, week) => total + (data.sessionsByWeek?.[week] || 0), 0);
            return [muscle, sessions / weeks.length];
        })
        .filter(([, frequency]) => frequency > 0)
        .sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
        container.innerHTML = '<p class="empty-state">Training frequency will appear after workouts are logged.</p>';
        return;
    }

    const maximum = Math.max(1, ...entries.map(([, frequency]) => frequency));
    container.innerHTML = `
        <p class="weekly-volume-note">Average sessions per completed week in which each muscle received at least one primary or secondary set credit, using the same recent baseline window.</p>
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
        if (week in totals) totals[week] += countCompletedSets(session);
    });

    const maximum = Math.max(1, ...Object.values(totals));
    container.innerHTML = `
        <p class="weekly-volume-note">Raw completed working sets across all exercises each Monday–Sunday week. This chart is not fractional muscle credit.</p>
        <div class="overall-week-chart">
            ${weeks.map((week, index) => `
                <div class="overall-week-column${index === weeks.length - 1 ? " is-latest" : ""}">
                    <span class="overall-week-value">${formatSets(totals[week])}</span>
                    <div class="overall-week-bar-wrap"><div class="overall-week-bar" style="height:${totals[week] / maximum * 100}%"></div></div>
                    <small>${escapeHtml(formatWeekLabel(week))}</small>
                </div>
            `).join("")}
        </div>
    `;
}

function renderBuildingAverageMessage(message) {
    return `
        <div class="average-building-state">
            <strong>Building your baseline</strong>
            <p>${escapeHtml(message)}</p>
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
            const completedSets = completedSetCount(exercise);
            if (!completedSets) return;

            getExerciseImpacts(exercise).forEach((credit, muscle) => {
                if (!data[muscle]) {
                    data[muscle] = {
                        totalCredits: 0,
                        weeks: Object.fromEntries(weeks.map(item => [item, 0])),
                        sessionsByWeek: Object.fromEntries(weeks.map(item => [item, 0]))
                    };
                }
                const credits = completedSets * credit;
                data[muscle].totalCredits += credits;
                data[muscle].weeks[week] += credits;
                sessionMuscles.add(muscle);
            });
        });

        sessionMuscles.forEach(muscle => {
            if (data[muscle]) data[muscle].sessionsByWeek[week] += 1;
        });
    });

    return data;
}

function getExerciseImpacts(exercise) {
    const definition = getExerciseById(exercise?.exerciseId || exercise?.id);
    let primary = [];
    let secondary = [];

    try {
        const guide = definition ? createGeneratedExerciseGuide(definition) : null;
        primary = Array.isArray(guide?.primary) ? guide.primary : [];
        secondary = Array.isArray(guide?.secondary) ? guide.secondary : [];
    }
    catch {
        primary = [];
        secondary = [];
    }

    if (!primary.length && !secondary.length) {
        const fallback = normalizeMuscle(definition?.muscleGroup || exercise?.muscleGroup);
        return fallback ? new Map([[fallback, 1]]) : new Map();
    }

    const impacts = new Map();
    secondary.forEach(muscle => {
        const group = normalizeMuscle(muscle);
        if (group) impacts.set(group, SECONDARY_SET_CREDIT);
    });
    primary.forEach(muscle => {
        const group = normalizeMuscle(muscle);
        if (group) impacts.set(group, 1);
    });
    return impacts;
}

function normalizeMuscle(value) {
    const text = String(value || "").trim();
    if (!text || /cardio|other/i.test(text)) return "";

    const aliases = {
        Quadriceps: "Quads",
        Hamstring: "Hamstrings",
        Shoulder: "Shoulders",
        Glute: "Glutes",
        Calf: "Calves",
        Forearm: "Forearms",
        "Front Delts": "Shoulders",
        "Side Delts": "Shoulders",
        Lats: "Back",
        "Upper Back": "Back",
        "Spinal Erectors": "Back",
        "Rectus Abdominis": "Core",
        Obliques: "Core",
        "Deep Core": "Core",
        Abs: "Core",
        Abdominals: "Core"
    };

    return aliases[text] || text;
}

function completedSetCount(exercise) {
    if (!Array.isArray(exercise?.sets)) return 0;
    return exercise.sets.filter(set => Number(set?.reps) > 0 || set?.completed === true).length;
}

function countCompletedSets(session) {
    return session.exercises?.reduce((total, exercise) => total + completedSetCount(exercise), 0) || 0;
}

function getRollingSevenDayVolume(sessions) {
    const endDate = toDateValue(new Date());
    const startDate = shiftDate(endDate, -6);
    const volume = new Map();

    sessions.forEach(session => {
        if (session.date < startDate || session.date > endDate) return;
        session.exercises?.forEach(exercise => {
            const sets = completedSetCount(exercise);
            if (!sets) return;
            getExerciseImpacts(exercise).forEach((credit, muscle) => {
                volume.set(muscle, (volume.get(muscle) || 0) + sets * credit);
            });
        });
    });

    return { startDate, endDate, volume };
}

function getBaselineVolume(muscleData, completedWeeks) {
    const weeks = completedWeeks.slice(-BASELINE_WEEKS);
    const baseline = new Map();
    if (weeks.length < MIN_BASELINE_WEEKS) return baseline;

    Object.entries(muscleData).forEach(([muscle, data]) => {
        const total = weeks.reduce((sum, week) => sum + (data.weeks?.[week] || 0), 0);
        baseline.set(muscle, total / weeks.length);
    });
    return baseline;
}

function getCompletedBaselineWeeks(weeks) {
    const currentWeek = getWeekStart(toDateValue(new Date()));
    return weeks.filter(week => week < currentWeek).slice(-BASELINE_WEEKS);
}

function getWeeklyPlanVolume(plan) {
    const volume = new Map();
    const days = Array.isArray(plan?.days) ? plan.days : [];

    days.forEach(day => {
        (day?.exercises || []).forEach(exercise => {
            const sets = getPlannedSetCount(exercise);
            if (!sets) return;
            getExerciseImpacts(exercise).forEach((credit, muscle) => {
                volume.set(muscle, (volume.get(muscle) || 0) + sets * credit);
            });
        });
    });

    return volume;
}

function getPlannedSetCount(exercise) {
    if (Array.isArray(exercise?.sets)) return exercise.sets.length;
    const sets = Number(exercise?.sets);
    return Number.isFinite(sets) && sets > 0 ? sets : 0;
}

function getPreferredPlan(sessions) {
    const plans = getPlans();
    if (!plans.length) return null;

    const schedule = getSchedule();
    if (schedule?.planId) {
        const scheduled = plans.find(plan => plan?.id === schedule.planId);
        if (scheduled) return scheduled;
    }

    const recentPlanId = [...sessions].reverse().find(session => session?.planId)?.planId;
    return recentPlanId ? plans.find(plan => plan?.id === recentPlanId) || null : null;
}

function getPlans() {
    try {
        const parsed = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}

function getSchedule() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY) || "null");
        return parsed && typeof parsed === "object" ? parsed : null;
    }
    catch {
        return null;
    }
}

function buildRecentWeekRange(sessions) {
    if (!sessions.length) return [];

    const currentWeek = getWeekStart(toDateValue(new Date()));
    const validWeekStarts = sessions
        .map(session => getWeekStart(session.date))
        .filter(Boolean)
        .sort();

    if (!validWeekStarts.length || !currentWeek) return [];

    const first = new Date(`${validWeekStarts[0]}T12:00:00`);
    const last = new Date(`${currentWeek}T12:00:00`);
    const weeks = [];

    for (let cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 7)) {
        weeks.push(toDateValue(cursor));
    }

    return weeks.slice(-MAX_WEEKS);
}

function filterSessionsToWeeks(sessions, weeks) {
    const allowed = new Set(weeks);
    return sessions.filter(session => allowed.has(getWeekStart(session.date)));
}

function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(session => session && isValidDateValue(session.date))
            .sort(sortByDate);
    }
    catch {
        return [];
    }
}

function isValidDateValue(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function getWeekStart(dateValue) {
    if (!isValidDateValue(dateValue)) return "";
    const date = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return toDateValue(date);
}

function shiftDate(dateValue, days) {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setDate(date.getDate() + days);
    return toDateValue(date);
}

function formatWeekLabel(value) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
        .format(new Date(`${value}T12:00:00`));
}

function formatFrequency(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatSets(value) {
    const rounded = Math.round(Number(value || 0) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toDateValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function sortByDate(a, b) {
    return String(a?.date || "").localeCompare(String(b?.date || ""));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
