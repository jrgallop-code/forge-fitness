import { getExerciseById } from "../workouts/exercise-library.js";
import {
    countPerformedWorkingSets,
    filterSessionsByDateWindow,
    getPerformedWorkingSets,
    getRollingDateWindow,
    getSessionTimestamp,
    getTrainingSessions,
    readJson
} from "./training-data.js";
import {
    addExerciseCredits,
    getPlannedSetCount
} from "./muscle-credit.js";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const SCHEDULE_STORAGE_KEY = "level_up_workout_schedule_v1";

function getPlans() {
    const plans = readJson(PLAN_STORAGE_KEY, []);
    return Array.isArray(plans) ? plans : [];
}

function getSchedule() {
    const schedule = readJson(SCHEDULE_STORAGE_KEY, null);
    return schedule && typeof schedule === "object" && !Array.isArray(schedule) ? schedule : null;
}

export function getActiveProgramContext() {
    const schedule = getSchedule();
    if (!schedule?.planId) return null;

    const plan = getPlans().find(item => item?.id === schedule.planId) || null;
    if (!plan) return null;

    const assignedDayIndices = Object.values(schedule.weekly || {})
        .filter(value => value !== null && value !== undefined && value !== "")
        .map(Number)
        .filter(index => Number.isInteger(index) && index >= 0 && plan?.days?.[index]);

    const effectiveDayIndices = assignedDayIndices.length
        ? assignedDayIndices
        : (Array.isArray(plan.days) ? plan.days.map((_, index) => index) : []);

    const plannedMuscleVolume = new Map();
    let plannedRawSets = 0;
    let plannedExercises = 0;

    effectiveDayIndices.forEach(dayIndex => {
        const exercises = Array.isArray(plan?.days?.[dayIndex]?.exercises)
            ? plan.days[dayIndex].exercises
            : [];
        plannedExercises += exercises.length;
        exercises.forEach(exercise => {
            const sets = getPlannedSetCount(exercise);
            plannedRawSets += sets;
            addExerciseCredits(plannedMuscleVolume, exercise, sets);
        });
    });

    return {
        schedule,
        plan,
        assignedDayIndices: effectiveDayIndices,
        targets: {
            workouts: effectiveDayIndices.length,
            rawSets: plannedRawSets,
            exercises: plannedExercises,
            muscleVolume: plannedMuscleVolume
        }
    };
}

function summarizeSessions(sessions) {
    const exerciseIds = new Set();
    let rawSets = 0;
    const muscleVolume = new Map();

    sessions.forEach(session => {
        (session?.exercises || []).forEach(exercise => {
            const definition = getExerciseById(exercise?.exerciseId || exercise?.id);
            const sets = countPerformedWorkingSets(exercise, definition);
            if (!sets) return;
            rawSets += sets;
            if (exercise?.exerciseId || exercise?.id) exerciseIds.add(exercise.exerciseId || exercise.id);
            addExerciseCredits(muscleVolume, exercise, sets);
        });
    });

    return {
        workouts: sessions.length,
        rawSets,
        exercises: exerciseIds.size,
        muscleVolume,
        totalMuscleCredits: sumMap(muscleVolume)
    };
}

function exerciseMetric(exercise) {
    const definition = getExerciseById(exercise?.exerciseId || exercise?.id);
    const sets = getPerformedWorkingSets(exercise, definition);
    if (!sets.length) return null;

    let best = null;
    sets.forEach(set => {
        const reps = Number(set.reps);
        const weight = Number(set.weight);
        const score = Number.isFinite(weight) && weight > 0
            ? weight * (1 + reps / 30)
            : reps;
        if (!Number.isFinite(score) || score <= 0) return;
        if (!best || score > best.score) best = { score, weight: Number.isFinite(weight) ? weight : 0, reps };
    });
    return best;
}

function findPreviousExerciseMetric(allSessions, currentSession, exerciseId) {
    const currentTime = getSessionTimestamp(currentSession);
    if (!currentTime || !exerciseId) return null;

    for (const session of [...allSessions].sort((a, b) => getSessionTimestamp(b) - getSessionTimestamp(a))) {
        if (session === currentSession || getSessionTimestamp(session) >= currentTime) continue;
        const exercise = (session?.exercises || []).find(item => (item?.exerciseId || item?.id) === exerciseId);
        if (!exercise) continue;
        const metric = exerciseMetric(exercise);
        if (metric) return metric;
    }
    return null;
}

function summarizeRecentPerformance(recentSessions, allSessions) {
    const comparisons = [];

    recentSessions.forEach(session => {
        (session?.exercises || []).forEach(exercise => {
            const exerciseId = exercise?.exerciseId || exercise?.id;
            if (!exerciseId) return;
            const current = exerciseMetric(exercise);
            if (!current) return;
            const previous = findPreviousExerciseMetric(allSessions, session, exerciseId);
            if (!previous?.score) return;

            const change = (current.score - previous.score) / previous.score;
            let status = "maintained";
            if (change > 0.015) status = "improved";
            else if (change < -0.03) status = "declined";

            comparisons.push({
                exerciseId,
                name: getExerciseById(exerciseId)?.name || exercise?.name || "Exercise",
                change,
                status,
                current,
                previous
            });
        });
    });

    return {
        comparable: comparisons.length,
        improved: comparisons.filter(item => item.status === "improved").length,
        maintained: comparisons.filter(item => item.status === "maintained").length,
        declined: comparisons.filter(item => item.status === "declined").length,
        comparisons
    };
}

function buildMuscleComparisons(actual, planned) {
    const muscles = new Set([...actual.keys(), ...planned.keys()]);
    return [...muscles]
        .map(muscle => {
            const actualValue = actual.get(muscle) || 0;
            const plannedValue = planned.get(muscle) || 0;
            const delta = actualValue - plannedValue;
            const tolerance = Math.max(1, plannedValue * 0.1);
            let status = "unplanned";
            if (plannedValue > 0) {
                if (Math.abs(delta) <= tolerance) status = "on-plan";
                else status = delta < 0 ? "below-plan" : "above-plan";
            }
            return { muscle, actual: actualValue, planned: plannedValue, delta, status };
        })
        .filter(item => item.actual > 0 || item.planned > 0)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.planned - a.planned || a.muscle.localeCompare(b.muscle));
}

export function buildTrainingDecisionSnapshot() {
    const allSessions = getTrainingSessions();
    const window = getRollingDateWindow(7);
    const recentSessions = filterSessionsByDateWindow(allSessions, window.startDate, window.endDate);
    const activeProgram = getActiveProgramContext();
    const programSessions = activeProgram
        ? recentSessions.filter(session => session?.planId === activeProgram.plan.id)
        : [];

    const allSummary = summarizeSessions(recentSessions);
    const programSummary = summarizeSessions(programSessions);
    const planned = activeProgram?.targets?.muscleVolume || new Map();
    const plannedCredits = sumMap(planned);
    const actualComparableCredits = [...planned.keys()]
        .reduce((sum, muscle) => sum + (allSummary.muscleVolume.get(muscle) || 0), 0);

    const performance = summarizeRecentPerformance(recentSessions, allSessions);
    const targetWorkouts = activeProgram?.targets?.workouts || 0;

    return {
        window,
        activeProgram,
        recentSessions,
        all: allSummary,
        program: programSummary,
        performance,
        plannedMuscleVolume: planned,
        muscleComparisons: buildMuscleComparisons(allSummary.muscleVolume, planned),
        adherenceRatio: targetWorkouts > 0 ? programSummary.workouts / targetWorkouts : null,
        volumeRatio: plannedCredits > 0 ? actualComparableCredits / plannedCredits : null,
        plannedCredits,
        actualComparableCredits
    };
}

export function sumMap(map) {
    return [...(map instanceof Map ? map.values() : [])].reduce((sum, value) => sum + (Number(value) || 0), 0);
}
