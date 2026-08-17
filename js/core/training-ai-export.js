import { getExerciseById } from "../workouts/exercise-library.js";
import { createGeneratedExerciseGuide } from "../workouts/exercise-guide-generator.js?v=full-library-guides-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const PLAN_STORAGE_KEY = "forge_workout_plans";
const SCHEDULE_STORAGE_KEY = "level_up_workout_schedule_v1";
const ANALYSIS_TYPE = "overall_progress";
const MAX_DAYS = 56;
const MAX_EXERCISE_SESSIONS = 8;
const SECONDARY_SET_CREDIT = 0.5;

export function buildTrainingAIExport({
    userId,
    startDate,
    endDate,
    analysisType = ANALYSIS_TYPE
} = {}) {
    // userId is accepted for future architecture but intentionally never read or exported.
    void userId;

    if (analysisType !== ANALYSIS_TYPE) {
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }

    const allSessions = getSessions();
    const resolvedEndDate = resolveEndDate(allSessions, endDate);
    const resolvedStartDate = startDate || shiftDate(resolvedEndDate, -(MAX_DAYS - 1));
    const sessions = allSessions.filter(session =>
        session.date >= resolvedStartDate && session.date <= resolvedEndDate
    );

    const actualStartDate = sessions[0]?.date || resolvedStartDate;
    const actualEndDate = sessions[sessions.length - 1]?.date || resolvedEndDate;
    const rangeDays = sessions.length ? dateSpanDays(actualStartDate, actualEndDate) : MAX_DAYS;
    const analysisWeeks = Math.max(1, rangeDays / 7);
    const exerciseHistory = buildExerciseHistory(sessions);
    const workingSetCount = sessions.reduce((sum, session) => sum + countWorkingSets(session), 0);
    const muscleVolume = buildAverageWeeklyMuscleVolume(sessions, analysisWeeks);
    const program = getProgramInfo(sessions);

    const metadata = {
        analysisType,
        startDate: actualStartDate,
        endDate: actualEndDate,
        workoutCount: sessions.length,
        exerciseCount: exerciseHistory.length,
        workingSetCount,
        analysisWeeks: round1(analysisWeeks)
    };

    return {
        title: "Level Up Training Analysis",
        prompt: buildPrompt({
            exerciseHistory,
            muscleVolume,
            program,
            metadata
        }),
        metadata
    };
}

function getSessions() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(session => session && session.isDemo !== true && isDateValue(session.date))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }
    catch {
        return [];
    }
}

function resolveEndDate(sessions, requestedEndDate) {
    if (isDateValue(requestedEndDate)) return requestedEndDate;
    return sessions[sessions.length - 1]?.date || toDateValue(new Date());
}

function buildPrompt({ exerciseHistory, muscleVolume, program, metadata }) {
    if (!metadata.workoutCount) return "";

    const sections = [
        `I use a hypertrophy training app called Level Up.\n\nPlease analyze my training over the period shown below.\n\nMy primary goal is muscle hypertrophy.\n\nPlease evaluate:\n\n1. Whether my major exercises are progressing.\n\n2. Exercises where performance appears stalled or declining.\n\n3. Whether any muscle groups appear undertrained or disproportionately trained.\n\n4. Patterns in load, repetitions, sets, and RIR.\n\n5. Any obvious recovery or fatigue trends that are actually supported by the data.\n\n6. The three most useful changes I could consider over my next few weeks.\n\nPlease do not invent information that is not contained in the training data.\n\nIf there is not enough information to make a conclusion, say so.\n\nHere is my Level Up training data:`,
        buildTrainingPeriod(metadata),
        buildSummary(metadata)
    ];

    if (program) sections.push(buildProgramSection(program));
    if (muscleVolume.length) sections.push(buildMuscleVolumeSection(muscleVolume));
    if (exerciseHistory.length) sections.push(buildExerciseHistorySection(exerciseHistory));

    return sections.filter(Boolean).join("\n\n");
}

function buildTrainingPeriod(metadata) {
    return `TRAINING PERIOD\n\n${formatDateRange(metadata.startDate, metadata.endDate)}`;
}

function buildSummary(metadata) {
    const averageWorkouts = round1(metadata.workoutCount / Math.max(1, metadata.analysisWeeks));
    return `SUMMARY\n\nWorkouts: ${metadata.workoutCount}\nAverage workouts per week: ${formatNumber(averageWorkouts)}\nTotal working sets: ${metadata.workingSetCount}\nExercises recorded: ${metadata.exerciseCount}`;
}

function buildProgramSection(program) {
    const lines = ["CURRENT ROUTINE / PROGRAM", "", `Plan: ${program.name}`];
    if (Number.isFinite(program.daysPerWeek) && program.daysPerWeek > 0) {
        lines.push(`Scheduled training days: ${program.daysPerWeek} per week`);
    }
    return lines.join("\n");
}

function buildMuscleVolumeSection(entries) {
    return [
        "WEEKLY MUSCLE VOLUME",
        "",
        "Average muscle set credits per week over this training period. Primary muscles receive 1.0 credit per working set and secondary muscles receive 0.5.",
        "",
        ...entries.map(entry => `${entry.muscle}: ${formatNumber(entry.average)} set credits/week`)
    ].join("\n");
}

function buildExerciseHistorySection(exercises) {
    const blocks = exercises.map(exercise => {
        const displayed = exercise.records.slice(-MAX_EXERCISE_SESSIONS);
        const lines = ["", exercise.name];

        if (exercise.recommendedReps) {
            lines.push(`Target rep range: ${exercise.recommendedReps}`);
        }
        if (exercise.records.length > displayed.length) {
            lines.push(`Showing latest ${displayed.length} of ${exercise.records.length} recorded sessions.`);
        }

        displayed.forEach(record => {
            lines.push("", formatDate(record.date));
            record.sets.forEach((set, index) => {
                lines.push(`Set ${index + 1}: ${formatWorkingSet(set)}`);
            });
        });

        lines.push("", "TREND", buildExerciseTrend(displayed));
        return lines.join("\n");
    });

    return `EXERCISE HISTORY\n${blocks.join("\n\n------------------------------\n")}`;
}

function buildExerciseHistory(sessions) {
    const byExercise = new Map();

    sessions.forEach(session => {
        (session.exercises || []).forEach(exercise => {
            const sets = getWorkingSets(exercise);
            if (!sets.length) return;

            const definition = getExerciseById(exercise?.exerciseId || exercise?.id);
            const key = String(exercise?.exerciseId || exercise?.id || exercise?.name || exercise?.exerciseName || "exercise");
            if (!byExercise.has(key)) {
                byExercise.set(key, {
                    key,
                    name: getExerciseName(exercise, definition),
                    recommendedReps: getRecommendedReps(exercise, definition),
                    records: []
                });
            }

            byExercise.get(key).records.push({
                date: session.date,
                sets
            });
        });
    });

    return [...byExercise.values()]
        .map(exercise => ({
            ...exercise,
            records: exercise.records.sort((a, b) => a.date.localeCompare(b.date))
        }))
        .sort((a, b) => b.records.length - a.records.length || a.name.localeCompare(b.name));
}

function getWorkingSets(exercise) {
    return (Array.isArray(exercise?.sets) ? exercise.sets : [])
        .filter(isWorkingSet)
        .map(set => ({
            reps: positiveNumber(set?.reps),
            load: getLoad(set),
            rir: getRir(set)
        }));
}

function isWorkingSet(set) {
    if (!set || typeof set !== "object") return false;
    if (set.isWarmup === true || set.warmup === true || String(set.type || "").toLowerCase() === "warmup") return false;
    return positiveNumber(set.reps) !== null || (set.completed === true && getLoad(set) !== null);
}

function countWorkingSets(session) {
    return (session.exercises || []).reduce((sum, exercise) => sum + getWorkingSets(exercise).length, 0);
}

function getLoad(set) {
    for (const value of [set?.weight, set?.load]) {
        if (value === null || value === undefined || value === "") continue;
        const number = Number(value);
        if (Number.isFinite(number) && number >= 0) return number;
    }
    return null;
}

function getRir(set) {
    for (const value of [set?.rir, set?.RIR, set?.repsInReserve]) {
        if (value === null || value === undefined || value === "") continue;
        const number = Number(value);
        if (Number.isFinite(number) && number >= 0 && number <= 10) return number;
    }
    return null;
}

function formatWorkingSet(set) {
    const parts = [];
    if (set.reps !== null) parts.push(`${formatNumber(set.reps)} reps`);
    if (set.load !== null) parts.push(`${formatNumber(set.load)} lb`);
    if (!parts.length) parts.push("completed working set");
    const base = parts.join(" @ ");
    return set.rir === null ? base : `${base} @ ${formatNumber(set.rir)} RIR`;
}

function buildExerciseTrend(records) {
    if (records.length < 2) return "Not enough history to determine a trend.";

    const first = records[0];
    const last = records[records.length - 1];
    const firstPerformance = getSessionPerformance(first);
    const lastPerformance = getSessionPerformance(last);
    const statements = [];

    if (firstPerformance.maxLoad !== null && lastPerformance.maxLoad !== null) {
        if (lastPerformance.maxLoad > firstPerformance.maxLoad + 0.01) {
            statements.push(`Top working load increased from ${formatNumber(firstPerformance.maxLoad)} lb to ${formatNumber(lastPerformance.maxLoad)} lb.`);
        }
        else if (lastPerformance.maxLoad < firstPerformance.maxLoad - 0.01) {
            statements.push(`Top working load decreased from ${formatNumber(firstPerformance.maxLoad)} lb to ${formatNumber(lastPerformance.maxLoad)} lb.`);
        }
        else {
            const load = lastPerformance.maxLoad;
            const firstReps = repsAtLoad(first, load);
            const lastReps = repsAtLoad(last, load);
            if (firstReps !== null && lastReps !== null && firstReps !== lastReps) {
                statements.push(`At ${formatNumber(load)} lb, total recorded reps changed from ${formatNumber(firstReps)} to ${formatNumber(lastReps)}.`);
            }
        }
    }

    if (firstPerformance.bestE1rm !== null && lastPerformance.bestE1rm !== null && firstPerformance.bestE1rm > 0) {
        const percent = ((lastPerformance.bestE1rm - firstPerformance.bestE1rm) / firstPerformance.bestE1rm) * 100;
        if (percent >= 2) statements.push(`Best-set estimated 1RM increased by ${formatNumber(round1(percent))}% across the shown sessions.`);
        else if (percent <= -2) statements.push(`Best-set estimated 1RM decreased by ${formatNumber(round1(Math.abs(percent)))}% across the shown sessions.`);
        else statements.push("Best-set estimated performance remained approximately unchanged (within about 2%).");
    }
    else {
        const firstReps = firstPerformance.totalReps;
        const lastReps = lastPerformance.totalReps;
        if (firstReps !== null && lastReps !== null) {
            if (lastReps > firstReps) statements.push(`Total recorded reps increased from ${formatNumber(firstReps)} to ${formatNumber(lastReps)}.`);
            else if (lastReps < firstReps) statements.push(`Total recorded reps decreased from ${formatNumber(firstReps)} to ${formatNumber(lastReps)}.`);
            else statements.push("Total recorded reps were unchanged between the first and latest shown session.");
        }
    }

    return statements.length ? statements.join(" ") : "Not enough comparable load and repetition data to determine a trend.";
}

function getSessionPerformance(record) {
    const loads = record.sets.map(set => set.load).filter(value => value !== null);
    const weighted = record.sets.filter(set => set.load !== null && set.load > 0 && set.reps !== null && set.reps > 0);
    const totalRepsValues = record.sets.map(set => set.reps).filter(value => value !== null);

    return {
        maxLoad: loads.length ? Math.max(...loads) : null,
        bestE1rm: weighted.length ? Math.max(...weighted.map(set => estimateOneRepMax(set.load, set.reps))) : null,
        totalReps: totalRepsValues.length ? totalRepsValues.reduce((sum, value) => sum + value, 0) : null
    };
}

function repsAtLoad(record, load) {
    const values = record.sets
        .filter(set => set.load !== null && Math.abs(set.load - load) < 0.01 && set.reps !== null)
        .map(set => set.reps);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function estimateOneRepMax(load, reps) {
    return Number(load) * (1 + Number(reps) / 30);
}

function buildAverageWeeklyMuscleVolume(sessions, analysisWeeks) {
    const totals = new Map();

    sessions.forEach(session => {
        (session.exercises || []).forEach(exercise => {
            const setCount = getWorkingSets(exercise).length;
            if (!setCount) return;
            getExerciseImpacts(exercise).forEach((credit, muscle) => {
                totals.set(muscle, (totals.get(muscle) || 0) + setCount * credit);
            });
        });
    });

    return [...totals.entries()]
        .map(([muscle, total]) => ({ muscle, average: round1(total / Math.max(1, analysisWeeks)) }))
        .filter(entry => entry.average > 0)
        .sort((a, b) => b.average - a.average || a.muscle.localeCompare(b.muscle));
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

function getProgramInfo(sessions) {
    const plans = readArray(PLAN_STORAGE_KEY);
    const schedule = readObject(SCHEDULE_STORAGE_KEY);
    const active = schedule?.planId ? plans.find(plan => plan?.id === schedule.planId) : null;

    if (active) {
        const daysPerWeek = Object.values(schedule?.weekly || {})
            .filter(value => value !== null && value !== undefined && value !== "")
            .length;
        return { name: String(active.name || "Workout Plan"), daysPerWeek };
    }

    const latest = [...sessions].reverse().find(session => session?.planName || session?.trainingDayName);
    if (!latest) return null;
    return { name: String(latest.planName || latest.trainingDayName || "Workout Plan"), daysPerWeek: null };
}

function getExerciseName(exercise, definition) {
    return String(definition?.name || exercise?.name || exercise?.exerciseName || exercise?.title || exercise?.exerciseId || exercise?.id || "Exercise");
}

function getRecommendedReps(exercise, definition) {
    const direct = exercise?.targetRepRange || exercise?.repRange || exercise?.recommendedReps || definition?.recommendedReps;
    if (direct !== null && direct !== undefined && String(direct).trim()) return String(direct).trim();

    const min = positiveNumber(exercise?.minReps ?? exercise?.repMin ?? exercise?.targetMinReps);
    const max = positiveNumber(exercise?.maxReps ?? exercise?.repMax ?? exercise?.targetMaxReps);
    return min !== null && max !== null ? `${formatNumber(min)}-${formatNumber(max)}` : "";
}

function readArray(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}

function readObject(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}

function positiveNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function isDateValue(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function shiftDate(dateValue, days) {
    const date = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(date.getTime())) return toDateValue(new Date());
    date.setDate(date.getDate() + days);
    return toDateValue(date);
}

function dateSpanDays(startDate, endDate) {
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function toDateValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" })
        .format(new Date(`${value}T12:00:00`));
}

function formatDateRange(startDate, endDate) {
    if (startDate === endDate) return formatDate(startDate);
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    const sameYear = start.getFullYear() === end.getFullYear();
    const startText = new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
        ...(sameYear ? {} : { year: "numeric" })
    }).format(start);
    const endText = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(end);
    return `${startText} – ${endText}`;
}

function round1(value) {
    return Math.round(Number(value || 0) * 10) / 10;
}

function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
}
