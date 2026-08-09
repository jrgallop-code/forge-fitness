const SESSION_STORAGE_KEY = "forge_workout_sessions";

let installed = false;

export function installWorkoutSessionSanitizer() {
    // Do not monkey-patch localStorage.setItem. On some browsers Storage uses
    // named properties, so assigning localStorage.setItem can accidentally
    // create a persistent key named "setItem". Sanitization is intentionally
    // explicit and limited to existing workout-session data.
    installed = true;
    return sanitizeExistingWorkoutSessions();
}

export function sanitizeExistingWorkoutSessions() {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!stored) {
        return [];
    }

    try {
        const parsed = JSON.parse(stored);
        const sanitized = sanitizeSessions(parsed);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sanitized));
        return sanitized;
    }
    catch {
        return [];
    }
}

function sanitizeSessions(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map(sanitizeSession);
}

function sanitizeSession(session) {
    if (!session || typeof session !== "object") {
        return session;
    }

    const exercises = Array.isArray(session.exercises)
        ? session.exercises
            .map(sanitizeExercise)
            .filter(Boolean)
        : [];

    return {
        ...session,
        exercises
    };
}

function sanitizeExercise(exercise) {
    if (!exercise || typeof exercise !== "object") {
        return null;
    }

    const trackingType = exercise.trackingType || "reps";

    if (trackingType === "notes") {
        return {
            ...exercise,
            sets: []
        };
    }

    const sets = Array.isArray(exercise.sets)
        ? exercise.sets.filter(isPerformedSet)
        : [];

    if (!sets.length) {
        return null;
    }

    return {
        ...exercise,
        sets
    };
}

function isPerformedSet(set) {
    if (!set || typeof set !== "object") {
        return false;
    }

    const reps = Number(set.reps);
    return Number.isFinite(reps) && reps > 0;
}
