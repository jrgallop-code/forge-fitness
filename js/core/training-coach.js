import { getRecoveryStates } from "../progress/recovery-secondary-muscles.js?v=recovery-secondary-7";
import { buildTrainingDecisionSnapshot } from "./training-metrics.js";

function summarizeRecovery(snapshot) {
    const states = getRecoveryStates();
    const relevantMuscles = [...snapshot.all.muscleVolume.keys()]
        .filter(muscle => snapshot.all.muscleVolume.get(muscle) > 0 && states.has(muscle));
    const values = relevantMuscles
        .map(muscle => states.get(muscle)?.percent)
        .filter(value => Number.isFinite(value));

    if (!values.length) {
        return { tracked: 0, average: null, lowCount: 0, readyCount: 0 };
    }

    return {
        tracked: values.length,
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
        lowCount: values.filter(value => value < 50).length,
        readyCount: values.filter(value => value >= 100).length
    };
}

function chooseDecision(snapshot, recovery) {
    const workouts = snapshot.all.workouts;
    const targetWorkouts = snapshot.activeProgram?.targets?.workouts || 0;
    const adherence = snapshot.adherenceRatio;
    const volume = snapshot.volumeRatio;
    const performance = snapshot.performance;
    const plateau = snapshot.plateaus?.[0] || null;
    const enoughPerformance = performance.comparable >= 3;
    const declineRate = enoughPerformance ? performance.declined / performance.comparable : 0;
    const performanceConcern = enoughPerformance && performance.declined >= 2 && declineRate >= 0.4;
    const recoveryConcern = recovery.tracked >= 2 && recovery.average < 55;
    const lowExecution = (
        Number.isFinite(adherence) && adherence < 0.75
    ) || (
        Number.isFinite(volume) && volume < 0.7
    );
    const highVolume = Number.isFinite(volume) && volume > 1.25;

    if (!workouts) {
        return {
            code: "no-training",
            tone: "neutral",
            label: "BUILDING",
            title: targetWorkouts ? "Get the week started" : "Building your training picture",
            message: targetWorkouts
                ? "No completed lifting sessions are recorded in the last 7 days. Complete your scheduled training before Level Up judges the program."
                : "Log a few lifting sessions and set a workout schedule to unlock plan-aware training decisions."
        };
    }

    if (performanceConcern && recoveryConcern && (!Number.isFinite(volume) || volume >= 0.9)) {
        return {
            code: "possible-fatigue",
            tone: "warning",
            label: "POSSIBLE FATIGUE",
            title: "Recovery may be limiting performance",
            message: "Several recent exercise comparisons declined while current recovery is low. Avoid adding volume right now; maintain the plan and consider trimming optional work if the pattern continues."
        };
    }

    if (lowExecution) {
        return {
            code: "execution-below-plan",
            tone: "attention",
            label: "EXECUTION BELOW PLAN",
            title: "Complete more of the plan before changing it",
            message: "Recent training is materially below your scheduled workload. Level Up needs better plan execution before deciding that the program itself needs more volume or different exercises."
        };
    }

    if (highVolume) {
        return {
            code: "volume-above-plan",
            tone: recoveryConcern || performanceConcern ? "warning" : "attention",
            label: "VOLUME ABOVE PLAN",
            title: recoveryConcern || performanceConcern ? "Extra volume may be costing recovery" : "You are training above the plan",
            message: recoveryConcern || performanceConcern
                ? "Completed muscle volume is well above planned volume and another signal is also under pressure. Pull back optional extra work before adding anything else."
                : "Completed muscle volume is well above the plan, but current performance and recovery do not show a clear problem. There is no reason to add more volume right now."
        };
    }

    if (plateau && !recoveryConcern && !performanceConcern) {
        return {
            code: "possible-plateau",
            tone: "attention",
            label: "POSSIBLE PLATEAU",
            title: `${plateau.name} may be stalling`,
            message: `Estimated performance has stayed essentially flat across the last ${plateau.exposures} exposures over about ${plateau.spanDays} days. Keep volume unchanged for now and use your programmed rep-range progression before considering extra sets.`
        };
    }

    if (!enoughPerformance) {
        return {
            code: "building-performance",
            tone: "neutral",
            label: "BUILDING SIGNAL",
            title: "Volume is trackable; performance needs more history",
            message: "Level Up can compare your workload with the plan now, but it needs at least 3 comparable recent exercise exposures before using performance to guide a training change."
        };
    }

    return {
        code: "stay-course",
        tone: "good",
        label: "STAY THE COURSE",
        title: "Your current training does not need a change",
        message: "Plan execution, recent performance, and recovery do not show a strong reason to change the program. Keep progressing within your programmed rep ranges and let more data accumulate."
    };
}

function topMuscleSignals(snapshot) {
    return snapshot.muscleComparisons
        .filter(item => item.planned > 0)
        .slice(0, 3)
        .map(item => {
            const tolerance = Math.max(1, item.planned * 0.1);
            let label = "On plan";
            if (item.delta < -tolerance) label = `${formatSets(Math.abs(item.delta))} below plan`;
            else if (item.delta > tolerance) label = `${formatSets(item.delta)} above plan`;
            return {
                muscle: item.muscle,
                actual: item.actual,
                planned: item.planned,
                label,
                status: item.status
            };
        });
}

export function getTrainingReview() {
    const snapshot = buildTrainingDecisionSnapshot();
    const recovery = summarizeRecovery(snapshot);
    const decision = chooseDecision(snapshot, recovery);
    const hasPlannedVolume = snapshot.plannedCredits > 0;

    return {
        ...decision,
        window: snapshot.window,
        programName: snapshot.activeProgram?.plan?.name || null,
        workouts: {
            completed: snapshot.program.workouts,
            all: snapshot.all.workouts,
            target: snapshot.activeProgram?.targets?.workouts || null
        },
        volume: {
            actual: hasPlannedVolume ? snapshot.actualComparableCredits : snapshot.all.totalMuscleCredits,
            planned: hasPlannedVolume ? snapshot.plannedCredits : null,
            ratio: snapshot.volumeRatio
        },
        performance: snapshot.performance,
        plateau: snapshot.plateaus?.[0] || null,
        recovery,
        muscleSignals: topMuscleSignals(snapshot)
    };
}

function formatSets(value) {
    const rounded = Math.round(Number(value || 0) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
