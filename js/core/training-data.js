export const SESSION_STORAGE_KEY = "forge_workout_sessions";

export function readJson(key, fallback = null) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        return value ?? fallback;
    }
    catch {
        return fallback;
    }
}

export function localDateValue(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isValidDateValue(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

export function shiftDateValue(value, days) {
    if (!isValidDateValue(value)) return "";
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return "";
    date.setDate(date.getDate() + Number(days || 0));
    return localDateValue(date);
}

export function getSessionDate(session) {
    const stored = String(session?.date || "").slice(0, 10);
    if (isValidDateValue(stored)) return stored;

    for (const raw of [session?.completedAt, session?.endTime, session?.startedAt]) {
        if (!raw) continue;
        const date = new Date(raw);
        if (Number.isFinite(date.getTime())) return localDateValue(date);
    }
    return "";
}

export function getSessionTimestamp(session) {
    const dateValue = getSessionDate(session);
    for (const raw of [session?.completedAt, session?.endTime, session?.startedAt]) {
        if (!raw) continue;
        const date = new Date(raw);
        if (!Number.isFinite(date.getTime())) continue;
        if (!dateValue || localDateValue(date) === dateValue) return date.getTime();
    }
    if (!dateValue) return 0;
    return new Date(`${dateValue}T12:00:00`).getTime();
}

export function isPerformedWorkingSet(set) {
    if (!set) return false;
    const reps = Number(set.reps);
    return Number.isFinite(reps) && reps > 0;
}

export function getPerformedWorkingSets(exercise, definition = null) {
    const trackingType = String(definition?.trackingType || exercise?.trackingType || "").toLowerCase();
    if (trackingType === "notes") return [];
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    return sets.filter(isPerformedWorkingSet);
}

export function countPerformedWorkingSets(exercise, definition = null) {
    return getPerformedWorkingSets(exercise, definition).length;
}

export function getTrainingSessions() {
    const sessions = readJson(SESSION_STORAGE_KEY, []);
    if (!Array.isArray(sessions)) return [];
    return sessions
        .filter(session => session && getSessionDate(session))
        .sort((a, b) => getSessionTimestamp(a) - getSessionTimestamp(b));
}

export function getRollingDateWindow(days = 7, endDate = localDateValue()) {
    const length = Math.max(1, Number(days) || 1);
    return {
        startDate: shiftDateValue(endDate, -(length - 1)),
        endDate
    };
}

export function filterSessionsByDateWindow(sessions, startDate, endDate) {
    return (Array.isArray(sessions) ? sessions : []).filter(session => {
        const date = getSessionDate(session);
        return date && date >= startDate && date <= endDate;
    });
}
