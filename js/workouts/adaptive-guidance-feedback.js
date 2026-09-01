const RECOVERY_STATUSES = new Set(["fatigued", "ready", "fresh"]);
const DIFFICULTY_STATUSES = new Set(["easy", "right", "too-hard"]);
const DISCOMFORT_STATUSES = new Set(["none", "minor", "significant"]);

export function applyAdaptiveFeedbackEdits(session, edits = {}, editedAt = new Date().toISOString()) {
    const current = session?.adaptiveGuidance && typeof session.adaptiveGuidance === "object"
        ? session.adaptiveGuidance
        : {};
    const recovery = { ...(current.recovery || {}) };

    Object.entries(edits.recovery || {}).forEach(([muscle, status]) => {
        if (!muscle || !RECOVERY_STATUSES.has(status)) return;
        recovery[muscle] = {
            ...(recovery[muscle] || {}),
            status,
            recordedAt: recovery[muscle]?.recordedAt || editedAt,
            editedAt
        };
    });

    const difficulty = DIFFICULTY_STATUSES.has(edits.difficulty) ? edits.difficulty : null;
    const discomfort = DISCOMFORT_STATUSES.has(edits.discomfort) ? edits.discomfort : null;
    const recoveryRecorded = Object.values(recovery).some(entry => RECOVERY_STATUSES.has(entry?.status));
    const postRecorded = Boolean(difficulty || discomfort);

    return {
        ...session,
        adaptiveGuidance: {
            ...current,
            recovery,
            difficulty,
            discomfort,
            discomfortExerciseId: discomfort && discomfort !== "none"
                ? (edits.discomfortExerciseId || null)
                : null,
            recoveryCompleted: current.recoveryCompleted || recoveryRecorded,
            recoverySkipped: recoveryRecorded ? false : Boolean(current.recoverySkipped),
            postCompleted: true,
            postSkipped: postRecorded ? false : Boolean(current.postSkipped),
            feedbackEditedAt: editedAt
        }
    };
}
