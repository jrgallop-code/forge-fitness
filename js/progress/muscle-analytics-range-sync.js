import { getExerciseById } from "../workouts/exercise-library.js";
import { createGeneratedExerciseGuide } from "../workouts/exercise-guide-generator.js?v=full-library-guides-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const PLAN_STORAGE_KEY = "forge_workout_plans";
const SCHEDULE_STORAGE_KEY = "level_up_workout_schedule_v1";
const RANGE_STORAGE_KEY = "level_up_training_analytics_range";
const SECONDARY_SET_CREDIT = 0.5;
const HEATMAP_NORMALIZATION_SETS = 12;
const DAY_MS = 86400000;
const BASELINE_WEEKS = 4;
const MIN_BASELINE_WEEKS = 3;

const RANGE_OPTIONS = {
    "1w": { label: "1W", days: 7 },
    "1m": { label: "1M", days: 30 },
    "3m": { label: "3M", days: 90 },
    "6m": { label: "6M", days: 180 },
    "1y": { label: "1Y", days: 365 },
    all: { label: "ALL", days: 0 }
};

let renderTimer = null;

function readRange() {
    const saved = String(localStorage.getItem(RANGE_STORAGE_KEY) || "3m").toLowerCase();
    return RANGE_OPTIONS[saved] ? saved : "3m";
}

function readSessions() {
    try {
        const sessions = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        return Array.isArray(sessions)
            ? sessions
                .filter(session => session && /^\d{4}-\d{2}-\d{2}$/.test(String(session.date || "")))
                .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            : [];
    }
    catch {
        return [];
    }
}

function getRangeWindow(range, sessions) {
    const option = RANGE_OPTIONS[range] || RANGE_OPTIONS["3m"];
    const endDate = localDateValue();

    if (!option.days) {
        return {
            range,
            label: option.label,
            startDate: sessions[0]?.date || endDate,
            endDate
        };
    }

    return {
        range,
        label: option.label,
        startDate: shiftDate(endDate, -(option.days - 1)),
        endDate
    };
}

function filterSessionsToWindow(sessions, window) {
    return sessions.filter(session =>
        session.date >= window.startDate && session.date <= window.endDate
    );
}

function buildWeeks(window) {
    const firstWeek = getWeekStart(window.startDate);
    const lastWeek = getWeekStart(window.endDate);
    if (!firstWeek || !lastWeek) return [];

    const weeks = [];
    for (let week = firstWeek; week <= lastWeek; week = shiftDate(week, 7)) {
        weeks.push(week);
    }
    return weeks;
}

function selectedWeekEquivalent(window) {
    const start = new Date(`${window.startDate}T12:00:00`).getTime();
    const end = new Date(`${window.endDate}T12:00:00`).getTime();
    const inclusiveDays = Math.max(1, Math.round((end - start) / DAY_MS) + 1);
    return Math.max(1, inclusiveDays / 7);
}

function renderMuscleRangeAnalytics() {
    const weeklyContainer = document.getElementById("weekly-muscle-volume");
    const trendsContainer = document.getElementById("muscle-distribution");
    const frequencyContainer = document.getElementById("muscle-frequency");
    const overallContainer = document.getElementById("overall-weekly-sets");

    if (!weeklyContainer || !trendsContainer || !overallContainer) return;

    const range = readRange();
    const allSessions = readSessions();
    const window = getRangeWindow(range, allSessions);
    const sessions = filterSessionsToWindow(allSessions, window);
    const weeks = buildWeeks(window);
    const muscleData = buildMuscleData(sessions, weeks);
    const weekEquivalent = selectedWeekEquivalent(window);
    const selectedSummary = buildSelectedSummary(muscleData, weekEquivalent);
    const baseline = buildRecentBaseline(allSessions);
    const plan = getPreferredPlan(allSessions);
    const planned = plan ? getWeeklyPlanVolume(plan) : new Map();

    renderWeeklyHeatmap(weeklyContainer, muscleData, weeks, window);
    renderSelectedVolumeTrends(trendsContainer, selectedSummary, baseline, planned, plan, window);
    if (frequencyContainer) renderSelectedFrequency(frequencyContainer, muscleData, weekEquivalent, window);
    renderSelectedOverallSets(overallContainer, sessions, weeks, window);
}

function buildMuscleData(sessions, weeks) {
    const data = {};

    sessions.forEach(session => {
        const week = getWeekStart(session.date);
        if (!weeks.includes(week)) return;

        const sessionMuscles = new Set();
        (session.exercises || []).forEach(exercise => {
            const completedSets = completedSetCount(exercise);
            if (!completedSets) return;

            getExerciseImpacts(exercise).forEach((credit, muscle) => {
                if (!data[muscle]) {
                    data[muscle] = {
                        totalCredits: 0,
                        totalSessions: 0,
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
            if (!data[muscle]) return;
            data[muscle].totalSessions += 1;
            data[muscle].sessionsByWeek[week] += 1;
        });
    });

    return data;
}

function buildSelectedSummary(muscleData, weekEquivalent) {
    return new Map(
        Object.entries(muscleData)
            .filter(([muscle]) => muscle && muscle !== "Other")
            .map(([muscle, data]) => [muscle, {
                total: data.totalCredits || 0,
                average: (data.totalCredits || 0) / weekEquivalent
            }])
    );
}

function buildRecentBaseline(sessions) {
    const currentWeek = getWeekStart(localDateValue());
    const firstRecordedWeek = sessions.length ? getWeekStart(sessions[0].date) : "";
    const completedWeeks = [];

    for (let offset = BASELINE_WEEKS; offset >= 1; offset--) {
        const week = shiftDate(currentWeek, -7 * offset);
        if (!firstRecordedWeek || week >= firstRecordedWeek) completedWeeks.push(week);
    }

    if (completedWeeks.length < MIN_BASELINE_WEEKS) {
        return { ready: false, weeks: completedWeeks, volume: new Map() };
    }

    const data = buildMuscleData(
        sessions.filter(session => completedWeeks.includes(getWeekStart(session.date))),
        completedWeeks
    );
    const volume = new Map();

    Object.entries(data).forEach(([muscle, values]) => {
        const total = completedWeeks.reduce(
            (sum, week) => sum + (values.weeks?.[week] || 0),
            0
        );
        volume.set(muscle, total / completedWeeks.length);
    });

    return { ready: true, weeks: completedWeeks, volume };
}

function renderWeeklyHeatmap(container, muscleData, weeks, window) {
    const muscles = Object.keys(muscleData)
        .filter(muscle => muscle && muscle !== "Other")
        .sort((a, b) => a.localeCompare(b));

    if (!weeks.length || !muscles.length) {
        container.innerHTML = `<p class="empty-state">No completed muscle-set credits in the selected ${escapeHtml(window.label)} timeframe.</p>`;
        return;
    }

    container.innerHTML = `
        <p class="weekly-volume-note">
            <strong>${escapeHtml(window.label)} selected.</strong> Weekly muscle-set credits are grouped Monday–Sunday across the selected timeframe. Primary muscles receive 1.0 credit per completed set and secondary muscles receive 0.5.
        </p>
        <div class="volume-heatmap-wrap">
            <div class="volume-heatmap" style="--week-count:${weeks.length}">
                <div class="volume-heatmap-corner">Muscle</div>
                ${weeks.map(week => `<div class="volume-week-label">${escapeHtml(formatWeekLabel(week))}</div>`).join("")}
                ${muscles.map(muscle => `
                    <div class="volume-muscle-label">${escapeHtml(muscle)}</div>
                    ${weeks.map(week => renderHeatmapCell(
                        muscle,
                        week,
                        muscleData[muscle]?.weeks?.[week] || 0
                    )).join("")}
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

    return `<div class="volume-cell" style="background:rgba(69,203,117,${backgroundAlpha.toFixed(3)});border-color:rgba(69,203,117,${borderAlpha.toFixed(3)});color:${color}" title="${escapeHtml(muscle)} · ${escapeHtml(formatWeekLabel(week))}: ${formatNumber(value)} set credits">${formatNumber(value)}</div>`;
}

function renderSelectedVolumeTrends(container, selectedSummary, baseline, planned, plan, window) {
    const muscles = new Set([
        ...selectedSummary.keys(),
        ...(baseline.ready ? baseline.volume.keys() : []),
        ...planned.keys()
    ]);

    const entries = [...muscles]
        .filter(muscle => muscle && muscle !== "Other")
        .map(muscle => {
            const selected = selectedSummary.get(muscle) || { average: 0, total: 0 };
            return {
                muscle,
                average: selected.average,
                total: selected.total,
                recentAverage: baseline.ready ? baseline.volume.get(muscle) ?? null : null,
                planned: planned.has(muscle) ? planned.get(muscle) : null
            };
        })
        .filter(item => item.total > 0 || item.recentAverage > 0 || item.planned > 0)
        .sort((a, b) => b.average - a.average || b.total - a.total || a.muscle.localeCompare(b.muscle));

    if (!entries.length) {
        container.innerHTML = `<p class="empty-state">No muscle volume in the selected ${escapeHtml(window.label)} timeframe.</p>`;
        return;
    }

    const baselineText = baseline.ready
        ? `Your latest ${baseline.weeks.length}-week completed baseline is used only for the context note.`
        : `A recent baseline will appear after at least ${MIN_BASELINE_WEEKS} completed weeks.`;
    const planText = plan
        ? `Planned is the weekly target from ${escapeHtml(plan.name || "your scheduled plan")}.`
        : "Set a workout schedule to add a weekly Planned comparison.";

    container.innerHTML = `
        <p class="weekly-volume-note volume-trends-note">
            <strong>${escapeHtml(window.label)} selected.</strong> Avg/Wk normalizes the selected period so different timeframes can be compared. Total is all muscle-set credits in the selected period. ${baselineText} ${planText}
        </p>
        <div class="volume-trends-header" aria-hidden="true">
            <span>Muscle</span><span>Avg/Wk</span><span>Total</span><span>Planned</span>
        </div>
        <div class="volume-trends-list">
            ${entries.map(renderTrendRow).join("")}
        </div>
    `;
}

function renderTrendRow(item) {
    const insight = getVolumeInsight(item.average, item.recentAverage, item.planned);

    return `
        <article class="volume-trend-row ${insight.className}">
            <div class="volume-trend-muscle">
                <strong>${escapeHtml(item.muscle)}</strong>
                <small>${escapeHtml(insight.label)}</small>
            </div>
            <div class="volume-trend-metric primary"><span>Avg/Wk</span><strong>${formatNumber(item.average)}</strong></div>
            <div class="volume-trend-metric"><span>Total</span><strong>${formatNumber(item.total)}</strong></div>
            <div class="volume-trend-metric"><span>Planned</span><strong>${item.planned === null ? "—" : formatNumber(item.planned)}</strong></div>
        </article>
    `;
}

function getVolumeInsight(average, recentAverage, planned) {
    if (Number.isFinite(planned)) {
        const delta = average - planned;
        const tolerance = Math.max(1, planned * 0.1);
        let insight;

        if (Math.abs(delta) <= tolerance) {
            insight = { label: "Average is close to plan", className: "is-on-plan" };
        }
        else if (delta < 0) {
            insight = { label: "Average is below plan", className: "is-below-plan" };
        }
        else {
            insight = { label: "Average is above plan", className: "is-above-plan" };
        }
        return addRecentContext(insight, average, recentAverage);
    }

    if (Number.isFinite(recentAverage)) {
        const tolerance = Math.max(1, recentAverage * 0.15);
        const delta = average - recentAverage;
        if (Math.abs(delta) <= tolerance) return { label: "Close to your recent normal", className: "is-on-plan" };
        if (delta < 0) return { label: "Below your recent normal", className: "is-below-plan" };
        return { label: "Above your recent normal", className: "is-above-plan" };
    }

    return { label: "Building your personal baseline", className: "is-building" };
}

function addRecentContext(insight, average, recentAverage) {
    if (!Number.isFinite(recentAverage) || recentAverage <= 0) return insight;
    const tolerance = Math.max(1, recentAverage * 0.15);
    const delta = average - recentAverage;
    if (Math.abs(delta) <= tolerance) return { ...insight, label: `${insight.label} · close to recent` };
    if (delta > 0) return { ...insight, label: `${insight.label} · above recent` };
    return { ...insight, label: `${insight.label} · below recent` };
}

function renderSelectedFrequency(container, muscleData, weekEquivalent, window) {
    const entries = Object.entries(muscleData)
        .filter(([muscle]) => muscle && muscle !== "Other")
        .map(([muscle, data]) => [muscle, (data.totalSessions || 0) / weekEquivalent])
        .filter(([, frequency]) => frequency > 0)
        .sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
        container.innerHTML = `<p class="empty-state">No muscle training frequency in the selected ${escapeHtml(window.label)} timeframe.</p>`;
        return;
    }

    const maximum = Math.max(1, ...entries.map(([, frequency]) => frequency));
    container.innerHTML = `
        <p class="weekly-volume-note"><strong>${escapeHtml(window.label)} selected.</strong> Average sessions per week in which each muscle received at least one primary or secondary set credit.</p>
        <div class="frequency-bars">
            ${entries.map(([muscle, frequency]) => `
                <div class="frequency-row">
                    <span>${escapeHtml(muscle)}</span>
                    <div class="frequency-track"><div class="frequency-fill" style="width:${frequency / maximum * 100}%"></div></div>
                    <strong>${formatNumber(frequency)}×/wk</strong>
                </div>
            `).join("")}
        </div>
    `;
}

function renderSelectedOverallSets(container, sessions, weeks, window) {
    if (!weeks.length) {
        container.innerHTML = `<p class="empty-state">No weekly working-set data in the selected ${escapeHtml(window.label)} timeframe.</p>`;
        return;
    }

    const totals = Object.fromEntries(weeks.map(week => [week, 0]));
    sessions.forEach(session => {
        const week = getWeekStart(session.date);
        if (week in totals) totals[week] += countCompletedSets(session);
    });

    const maximum = Math.max(1, ...Object.values(totals));
    container.innerHTML = `
        <p class="weekly-volume-note"><strong>${escapeHtml(window.label)} selected.</strong> Raw completed working sets across all exercises by Monday–Sunday week. This chart is not fractional muscle credit.</p>
        <div class="overall-week-chart">
            ${weeks.map(week => `
                <div class="overall-week-column">
                    <span class="overall-week-value">${formatNumber(totals[week])}</span>
                    <div class="overall-week-bar-wrap"><div class="overall-week-bar" style="height:${totals[week] / maximum * 100}%"></div></div>
                    <small>${escapeHtml(formatWeekLabel(week))}</small>
                </div>
            `).join("")}
        </div>
    `;
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
    return (session.exercises || []).reduce(
        (total, exercise) => total + completedSetCount(exercise),
        0
    );
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
    const plans = readPlans();
    if (!plans.length) return null;

    const schedule = readSchedule();
    if (schedule?.planId) {
        const scheduled = plans.find(plan => plan?.id === schedule.planId);
        if (scheduled) return scheduled;
    }

    const recentPlanId = [...sessions].reverse().find(session => session?.planId)?.planId;
    return recentPlanId ? plans.find(plan => plan?.id === recentPlanId) || null : null;
}

function readPlans() {
    try {
        const plans = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
        return Array.isArray(plans) ? plans : [];
    }
    catch {
        return [];
    }
}

function readSchedule() {
    try {
        const schedule = JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY) || "null");
        return schedule && typeof schedule === "object" ? schedule : null;
    }
    catch {
        return null;
    }
}

function getWeekStart(dateValue) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ""))) return "";
    const date = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return localDateValue(date);
}

function localDateValue(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDate(dateValue, days) {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localDateValue(date);
}

function formatWeekLabel(value) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
        .format(new Date(`${value}T12:00:00`));
}

function formatNumber(value) {
    const rounded = Math.round(Number(value || 0) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function scheduleRender(delay = 70) {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(() => requestAnimationFrame(renderMuscleRangeAnalytics), delay);
}

document.addEventListener("click", event => {
    if (
        event.target.closest("[data-training-analytics-range]") ||
        event.target.closest('.training-progress-tab[data-view="training"]') ||
        event.target.closest("#lifting-tab") ||
        event.target.closest("#load-training-demo") ||
        event.target.closest("#remove-training-demo")
    ) {
        scheduleRender(110);
    }
}, true);

document.addEventListener("change", event => {
    if (event.target?.id === "progress-range") scheduleRender(80);
});

window.addEventListener("storage", event => {
    if (event.key === RANGE_STORAGE_KEY || event.key === SESSION_STORAGE_KEY) scheduleRender(80);
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => scheduleRender(90)).observe(content, { childList: true });
}

scheduleRender(100);
