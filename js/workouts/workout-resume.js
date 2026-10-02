const copy = value => JSON.parse(JSON.stringify(value));

export function createResumedWorkout(completed, plan, now = new Date().toISOString()) {
    const active = copy(completed);
    active.resumedFromSessionId = completed.id;
    active.resumedCompletedSnapshot = copy(completed);
    active.progressionCutoff = completed.completedAt || `${completed.date}T23:59:59.999`;
    active.status = "in_progress";
    active.planSnapshot = copy(plan);
    active.accumulatedMs = Math.max(0, Number(completed.durationMs) || Number(completed.durationMinutes) * 60000 || 0);
    active.startedAt = now;
    active.pausedAt = null;
    active.restTimer = null;
    delete active.completedAt;
    delete active.durationMs;
    delete active.durationMinutes;
    active.currentExerciseIndex = 0;
    active.currentSetIndex = 0;
    for (let index = 0; index < (active.exercises || []).length; index++) {
        const setIndex = (active.exercises[index].sets || []).findIndex(set => !set.completed);
        if (setIndex >= 0) { active.currentExerciseIndex = index; active.currentSetIndex = setIndex; break; }
    }
    return active;
}

export function resumeProgressionHistory(sessions, active) {
    if (!Array.isArray(sessions)) return [];
    if (!active?.resumedFromSessionId) return sessions;
    const cutoff = new Date(active.progressionCutoff).getTime();
    return sessions.filter(session => session.id !== active.resumedFromSessionId &&
        (!Number.isFinite(cutoff) || new Date(session.completedAt || `${session.date}T23:59:59.999`).getTime() < cutoff));
}
