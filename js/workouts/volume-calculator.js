// Level Up logs the weight of one dumbbell; each logged rep uses two dumbbells here.
const TWO_DUMBBELL_EXERCISE_IDS = new Set([
    "dumbbell-bench-press",
    "incline-dumbbell-press",
    "dumbbell-shoulder-press",
    "lateral-raise",
    "rear-delt-fly",
    "dumbbell-curl",
    "hammer-curl",
    "incline-dumbbell-curl",
    "bulgarian-split-squat",
    "lunge",
    "step-up",
    "single-leg-romanian-deadlift"
]);

function exerciseId(exercise) {
    if (typeof exercise === "string") return exercise;
    return String(exercise?.exerciseId || exercise?.id || "");
}

export function getVolumeLoadMultiplier(exercise) {
    return TWO_DUMBBELL_EXERCISE_IDS.has(exerciseId(exercise)) ? 2 : 1;
}

function loadRepetitionVolume(entry) {
    const weight = Number(entry?.weight);
    const reps = Number(entry?.reps);
    return Number.isFinite(weight) && weight > 0 && Number.isFinite(reps) && reps > 0
        ? weight * reps
        : 0;
}

export function calculateSetVolume(set, exercise) {
    const multiplier = getVolumeLoadMultiplier(exercise);
    const workingVolume = loadRepetitionVolume(set);
    const dropVolume = (Array.isArray(set?.dropSets) ? set.dropSets : [])
        .reduce((sum, drop) => sum + loadRepetitionVolume(drop), 0);
    return (workingVolume + dropVolume) * multiplier;
}

export function calculateExerciseVolume(exercise) {
    return (exercise?.sets || []).reduce(
        (sum, set) => sum + calculateSetVolume(set, exercise),
        0
    );
}

export function calculateWorkoutVolume(session) {
    return (session?.exercises || []).reduce(
        (sum, exercise) => sum + calculateExerciseVolume(exercise),
        0
    );
}
