import "./exercise-library-expansion.js?v=exercise-library-expansion-1";
import { getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";

export function isPlaceholderExerciseName(value) {
    return !String(value || "").trim() || /^exercise(?:\s+\d+)?$/i.test(String(value).trim());
}

function isPlaceholderExerciseId(value) {
    return !String(value || "").trim() || /^exercise(?:[-_\s]+\d+)?$/i.test(String(value).trim());
}

function meaningful(value) {
    const text = String(value || "").trim();
    return text && !/^other$/i.test(text) ? text : "";
}

export function resolveSessionExerciseIdentity(exercise = {}, plannedExercise = {}) {
    const savedId = exercise.exerciseId || exercise.id || "";
    const plannedId = plannedExercise.id || plannedExercise.exerciseId || "";
    const savedDefinition = savedId ? getExerciseById(savedId) : null;
    const plannedDefinition = plannedId ? getExerciseById(plannedId) : null;
    const definition = savedDefinition || plannedDefinition;
    const storedName = exercise.name || exercise.exerciseName || "";
    const plannedName = plannedExercise.name || plannedExercise.exerciseName || "";
    const name = isPlaceholderExerciseName(storedName)
        ? definition?.name || (!isPlaceholderExerciseName(plannedName) ? plannedName : "") || "Exercise"
        : storedName;
    const exerciseId = !isPlaceholderExerciseId(savedId) && savedDefinition
        ? savedId
        : plannedDefinition
            ? plannedId
            : savedId || plannedId;

    return {
        exerciseId,
        name,
        exerciseName: name,
        muscleGroup: meaningful(exercise.muscleGroup) || meaningful(definition?.muscleGroup) || meaningful(plannedExercise.muscleGroup),
        type: meaningful(exercise.type) || meaningful(definition?.type) || meaningful(plannedExercise.type),
        equipment: meaningful(exercise.equipment) || meaningful(definition?.equipment) || meaningful(plannedExercise.equipment),
        trackingType: exercise.trackingType || definition?.trackingType || plannedExercise.trackingType || "reps"
    };
}

export function repairWorkoutSessionExerciseIdentities(session) {
    if (!session || !Array.isArray(session.exercises)) return { session, changed: false };
    const dayIndex = Math.max(0, Number(session.trainingDayIndex) || 0);
    const plannedExercises = session.planSnapshot?.days?.[dayIndex]?.exercises || [];
    let changed = false;
    const exercises = session.exercises.map((exercise, index) => {
        const identity = resolveSessionExerciseIdentity(exercise, plannedExercises[index] || {});
        const next = { ...exercise, ...identity };
        if (["exerciseId", "name", "exerciseName", "muscleGroup", "type", "equipment", "trackingType"]
            .some(key => String(next[key] || "") !== String(exercise?.[key] || ""))) {
            changed = true;
        }
        return next;
    });
    return { session: changed ? { ...session, exercises } : session, changed };
}

export function repairWorkoutSessionList(sessions) {
    let changed = false;
    const repaired = (Array.isArray(sessions) ? sessions : []).map(session => {
        const result = repairWorkoutSessionExerciseIdentities(session);
        changed ||= result.changed;
        return result.session;
    });
    return { sessions: repaired, changed };
}
