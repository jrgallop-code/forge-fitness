const DAY_MS = 24 * 60 * 60 * 1000;

export function parseRepRange(value) {
    const values = String(value || "")
        .match(/\d+(?:\.\d+)?/g)
        ?.map(Number)
        .filter(Number.isFinite) || [];
    if (!values.length) return null;
    return { lower: Math.min(...values), upper: Math.max(...values) };
}

export function completedSets(exercise) {
    return (exercise?.sets || []).filter(set =>
        set?.completed || Number(set?.reps) > 0
    );
}

export function exerciseScore(exercise) {
    const sets = completedSets(exercise);
    if (!sets.length) return null;
    const weighted = sets
        .map(set => {
            const weight = Number(set.weight);
            const reps = Number(set.reps);
            if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
            return weight * (1 + reps / 30);
        })
        .filter(Number.isFinite);
    if (weighted.length) return Math.max(...weighted);
    const reps = sets.map(set => Number(set.reps)).filter(value => Number.isFinite(value) && value > 0);
    return reps.length ? Math.max(...reps) : null;
}

export function compareMusclePerformance(current, previous, muscle, getExercise) {
    if (!current || !previous || !muscle) return "unknown";
    const previousById = new Map((previous.exercises || []).map(item => [item.exerciseId, item]));
    const ratios = [];

    (current.exercises || []).forEach(item => {
        if (getExercise(item.exerciseId)?.muscleGroup !== muscle) return;
        const prior = previousById.get(item.exerciseId);
        const currentScore = exerciseScore(item);
        const previousScore = exerciseScore(prior);
        if (!Number.isFinite(currentScore) || !Number.isFinite(previousScore) || previousScore <= 0) return;
        ratios.push(currentScore / previousScore);
    });

    if (!ratios.length) return "unknown";
    const average = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
    if (average >= 1.02) return "improved";
    if (average <= 0.97) return "declined";
    return "steady";
}

export function getMuscleRirStats(session, muscle, getExercise) {
    const values = [];
    (session?.exercises || []).forEach(item => {
        if (getExercise(item.exerciseId)?.muscleGroup !== muscle) return;
        completedSets(item).forEach(set => {
            if (set.rir === null || set.rir === "" || set.rir === undefined) return;
            const value = Number(set.rir);
            if (Number.isFinite(value)) values.push(Math.min(4, Math.max(0, value)));
        });
    });
    if (!values.length) return { count: 0, average: null, failureSets: 0 };
    return {
        count: values.length,
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
        failureSets: values.filter(value => value === 0).length
    };
}

export function getTrainedMuscles(session, getExercise) {
    const muscles = new Set();
    (session?.exercises || []).forEach(item => {
        if (!completedSets(item).length) return;
        const muscle = getExercise(item.exerciseId)?.muscleGroup;
        if (muscle) muscles.add(muscle);
    });
    return [...muscles];
}

export function countAccumulationWeeks(sessions, planId, cycleStartedAt) {
    const start = new Date(cycleStartedAt || 0).getTime();
    if (!Number.isFinite(start) || start <= 0) return 0;
    const weeks = new Set();
    (sessions || []).forEach(session => {
        if (session?.planId !== planId || session?.adaptiveGuidance?.isDeload) return;
        const timestamp = new Date(session.completedAt || session.date || 0).getTime();
        if (!Number.isFinite(timestamp) || timestamp < start) return;
        const elapsedDays = Math.floor((timestamp - start) / DAY_MS);
        weeks.add(Math.max(0, Math.floor(elapsedDays / 7)));
    });
    return weeks.size;
}

export function calculateDeloadTarget(previousSet, weightRatio, repRatio = 0.67, increment = 5) {
    const weight = Number(previousSet?.weight);
    const reps = Number(previousSet?.reps);
    const roundedWeight = Number.isFinite(weight) && weight > 0
        ? Math.max(increment, Math.round((weight * weightRatio) / increment) * increment)
        : null;
    const reducedReps = Number.isFinite(reps) && reps > 0
        ? Math.max(1, Math.floor(reps * repRatio))
        : null;
    return { weight: roundedWeight, reps: reducedReps };
}

export function buildAdaptiveRecommendations({
    session,
    sessions,
    plan,
    getExercise,
    accumulationWeeks = 0
}) {
    const guidance = session?.adaptiveGuidance || {};
    const recovery = guidance.recovery || {};
    const priorSessions = [...(sessions || [])]
        .filter(item => item?.id !== session?.id)
        .sort((a, b) => String(b?.completedAt || b?.date || "").localeCompare(String(a?.completedAt || a?.date || "")));
    const recommendations = [];
    let repeatedFatigue = 0;
    let decliningMuscles = 0;

    Object.entries(recovery).forEach(([muscle, entry]) => {
        if (!entry?.status || entry.status === "skipped") return;
        const previousGuided = priorSessions.find(item => item?.adaptiveGuidance?.recovery?.[muscle]?.status);
        const previousExposure = entry.previousSessionId
            ? priorSessions.find(item => item.id === entry.previousSessionId)
            : priorSessions.find(item => getTrainedMuscles(item, getExercise).includes(muscle));
        const trend = compareMusclePerformance(session, previousExposure, muscle, getExercise);
        const rir = getMuscleRirStats(session, muscle, getExercise);
        const sameStatusTwice = previousGuided?.adaptiveGuidance?.recovery?.[muscle]?.status === entry.status;

        if (entry.status === "fatigued" && sameStatusTwice) repeatedFatigue += 1;
        if (trend === "declined") decliningMuscles += 1;

        const target = findVolumeTarget(plan, previousExposure, muscle, getExercise);
        if (!target) return;

        if (entry.status === "fatigued" && sameStatusTwice && trend === "declined" && target.currentSets > 1) {
            recommendations.push({
                id: recommendationId(session.id, muscle, "reduce"),
                type: "volume",
                muscle,
                delta: -1,
                title: `Reduce ${muscle.toLowerCase()} by 1 set?`,
                reason: "Recovery and performance declined twice.",
                ...target,
                newSets: target.currentSets - 1
            });
            return;
        }

        const easyEnough = guidance.difficulty === "easy" || (rir.count > 0 && rir.average >= 3);
        const weeklySets = weeklyDirectSets(plan, muscle, getExercise);
        if (entry.status === "fresh" && sameStatusTwice && trend === "improved" && easyEnough && rir.count > 0 && weeklySets < 20) {
            recommendations.push({
                id: recommendationId(session.id, muscle, "add"),
                type: "volume",
                muscle,
                delta: 1,
                title: `Add 1 ${muscle.toLowerCase()} set?`,
                reason: "Fully recovered and progressing twice.",
                ...target,
                newSets: target.currentSets + 1
            });
        }
    });

    const discomfort = guidance.discomfort;
    if (discomfort === "minor" || discomfort === "significant") {
        const exerciseId = guidance.discomfortExerciseId || null;
        const exercise = exerciseId ? getExercise(exerciseId) : null;
        recommendations.unshift({
            id: recommendationId(session.id, exerciseId || "workout", "discomfort"),
            type: "hold",
            exerciseId,
            title: exercise ? `Hold ${exercise.name}` : "Hold progression",
            reason: discomfort === "significant" ? "Significant discomfort reported." : "Minor discomfort reported."
        });
    }

    const adaptiveDeload = accumulationWeeks >= 4 && repeatedFatigue >= 2 && (
        decliningMuscles >= 2 || guidance.difficulty === "too-hard"
    );
    const fixedDeload = accumulationWeeks >= 8;
    if (adaptiveDeload || fixedDeload) {
        recommendations.push({
            id: recommendationId(session.id, "plan", "deload"),
            type: "deload",
            planId: session.planId,
            title: "Recovery week recommended",
            reason: fixedDeload
                ? `${accumulationWeeks} accumulation weeks completed.`
                : "Recovery and performance are declining."
        });
    }

    if (!recommendations.length) {
        const recoveryRecorded = Object.values(recovery).some(entry => entry?.status && entry.status !== "skipped");
        const postWorkoutRecorded = ["easy", "right", "too-hard"].includes(guidance.difficulty)
            || ["none", "minor", "significant"].includes(guidance.discomfort);
        const rirRecorded = (session?.exercises || []).some(item => completedSets(item).some(set =>
            set.rir !== null && set.rir !== "" && set.rir !== undefined && Number.isFinite(Number(set.rir))
        ));
        const feedbackRecorded = recoveryRecorded || postWorkoutRecorded || rirRecorded;

        recommendations.push({
            id: recommendationId(session.id, "plan", feedbackRecorded ? "keep" : "no-feedback"),
            type: "status",
            title: feedbackRecorded ? "Keep your plan unchanged" : "No guidance this time",
            reason: feedbackRecorded
                ? "No clear adjustment yet. Your feedback was recorded."
                : "No feedback was recorded."
        });
    }

    return recommendations;
}

function weeklyDirectSets(plan, muscle, getExercise) {
    return (plan?.days || []).reduce((total, day) => total + (day?.exercises || []).reduce((dayTotal, item) =>
        getExercise(item.id)?.muscleGroup === muscle ? dayTotal + Math.max(1, Number(item.sets) || 1) : dayTotal
    , 0), 0);
}

function findVolumeTarget(plan, previousExposure, muscle, getExercise) {
    const dayIndex = Number(previousExposure?.trainingDayIndex);
    const day = plan?.days?.[Number.isFinite(dayIndex) ? dayIndex : -1];
    if (!day) return null;
    const candidates = (day.exercises || [])
        .map(item => ({ item, exercise: getExercise(item.id) }))
        .filter(({ exercise }) => exercise?.muscleGroup === muscle);
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
        const isolationDifference = Number(b.exercise?.type === "isolation") - Number(a.exercise?.type === "isolation");
        if (isolationDifference) return isolationDifference;
        return (Number(b.item.sets) || 1) - (Number(a.item.sets) || 1);
    });
    const selected = candidates[0];
    return {
        targetDayIndex: dayIndex,
        targetExerciseId: selected.item.id,
        targetExerciseName: selected.exercise?.name || "Exercise",
        currentSets: Math.max(1, Number(selected.item.sets) || 1)
    };
}

function recommendationId(sessionId, subject, action) {
    return `${sessionId || "session"}:${subject}:${action}`;
}
