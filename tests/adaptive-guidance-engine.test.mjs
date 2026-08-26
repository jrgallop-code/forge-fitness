import test from "node:test";
import assert from "node:assert/strict";
import {
    buildAdaptiveRecommendations,
    calculateDeloadTarget,
    countAccumulationWeeks,
    parseRepRange
} from "../js/workouts/adaptive-guidance-engine.js";

const catalogue = {
    bench: { id: "bench", name: "Bench Press", muscleGroup: "Chest", type: "compound" },
    fly: { id: "fly", name: "Cable Fly", muscleGroup: "Chest", type: "isolation" },
    row: { id: "row", name: "Cable Row", muscleGroup: "Back", type: "compound" }
};
const getExercise = id => catalogue[id] || null;
const plan = {
    id: "plan-1",
    days: [{
        name: "Push",
        exercises: [
            { id: "bench", sets: 3, reps: "8-12" },
            { id: "fly", sets: 2, reps: "10-15" }
        ]
    }]
};

function exercise(exerciseId, weight, reps, rir = null, setCount = 2) {
    return {
        exerciseId,
        sets: Array.from({ length: setCount }, () => ({ weight, reps, rir, completed: true }))
    };
}

function priorSession(status) {
    return {
        id: "prior",
        planId: "plan-1",
        trainingDayIndex: 0,
        completedAt: "2026-08-18T12:00:00.000Z",
        adaptiveGuidance: { recovery: { Chest: { status } } },
        exercises: [exercise("bench", 100, 10, 2), exercise("fly", 40, 12, 2)]
    };
}

test("parses target ranges and calculates rounded RP-style deload targets", () => {
    assert.deepEqual(parseRepRange("8-12"), { lower: 8, upper: 12 });
    assert.deepEqual(calculateDeloadTarget({ weight: 100, reps: 12 }, .85, .67, 5), { weight: 85, reps: 8 });
});

test("recommends one-set reduction only after repeated fatigue and declining performance", () => {
    const prior = priorSession("fatigued");
    const current = {
        id: "current",
        planId: "plan-1",
        trainingDayIndex: 0,
        adaptiveGuidance: {
            recovery: { Chest: { status: "fatigued", previousSessionId: prior.id } },
            difficulty: "too-hard"
        },
        exercises: [exercise("bench", 95, 8, 0), exercise("fly", 35, 10, 0)]
    };
    const recommendations = buildAdaptiveRecommendations({
        session: current,
        sessions: [prior, current],
        plan,
        getExercise,
        accumulationWeeks: 3
    });
    const volume = recommendations.find(item => item.type === "volume");
    assert.equal(volume?.delta, -1);
    assert.equal(volume?.targetExerciseId, "fly");
    assert.equal(volume?.newSets, 1);
});

test("requires RIR before recommending an added set", () => {
    const prior = priorSession("fresh");
    const withoutRir = {
        id: "current-no-rir",
        planId: "plan-1",
        trainingDayIndex: 0,
        adaptiveGuidance: {
            recovery: { Chest: { status: "fresh", previousSessionId: prior.id } },
            difficulty: "easy"
        },
        exercises: [exercise("bench", 105, 11), exercise("fly", 45, 13)]
    };
    const noRirRecommendations = buildAdaptiveRecommendations({
        session: withoutRir,
        sessions: [prior, withoutRir],
        plan,
        getExercise,
        accumulationWeeks: 3
    });
    assert.equal(noRirRecommendations.some(item => item.delta === 1), false);

    const withRir = {
        ...withoutRir,
        id: "current-with-rir",
        exercises: [exercise("bench", 105, 11, 3), exercise("fly", 45, 13, 3)]
    };
    const withRirRecommendations = buildAdaptiveRecommendations({
        session: withRir,
        sessions: [prior, withRir],
        plan,
        getExercise,
        accumulationWeeks: 3
    });
    assert.equal(withRirRecommendations.some(item => item.delta === 1), true);
});

test("confirms recorded feedback when no plan change is justified", () => {
    const current = {
        id: "current",
        planId: "plan-1",
        trainingDayIndex: 0,
        adaptiveGuidance: {
            recovery: { Chest: { status: "ready" } },
            difficulty: "right",
            discomfort: "none"
        },
        exercises: [exercise("bench", 100, 10, 2)]
    };
    const recommendations = buildAdaptiveRecommendations({
        session: current,
        sessions: [current],
        plan,
        getExercise,
        accumulationWeeks: 1
    });
    assert.deepEqual(recommendations.map(item => item.title), ["Keep your plan unchanged"]);
    assert.match(recommendations[0].reason, /feedback was recorded/i);
});

test("does not imply feedback was analyzed when all guidance was skipped", () => {
    const current = {
        id: "current-skipped",
        planId: "plan-1",
        trainingDayIndex: 0,
        adaptiveGuidance: { recoverySkipped: true, postSkipped: true },
        exercises: [exercise("bench", 100, 10)]
    };
    const recommendations = buildAdaptiveRecommendations({
        session: current,
        sessions: [current],
        plan,
        getExercise,
        accumulationWeeks: 1
    });
    assert.deepEqual(recommendations.map(item => item.title), ["No guidance this time"]);
});

test("turns minor discomfort into a concise hold-progression caution", () => {
    const current = {
        id: "current-discomfort",
        planId: "plan-1",
        trainingDayIndex: 0,
        adaptiveGuidance: {
            discomfort: "minor",
            discomfortExerciseId: "bench"
        },
        exercises: [exercise("bench", 100, 10, 2)]
    };
    const recommendations = buildAdaptiveRecommendations({
        session: current,
        sessions: [current],
        plan,
        getExercise,
        accumulationWeeks: 1
    });
    const hold = recommendations.find(item => item.type === "hold");
    assert.equal(hold?.title, "Hold progression");
    assert.equal(hold?.exerciseId, "bench");
    assert.match(hold?.reason || "", /same load and sets next time/i);
});

test("offers a fixed deload after eight accumulation weeks", () => {
    const prior = priorSession("ready");
    const current = {
        id: "current",
        planId: "plan-1",
        trainingDayIndex: 0,
        adaptiveGuidance: { recovery: { Chest: { status: "ready", previousSessionId: prior.id } } },
        exercises: [exercise("bench", 100, 10, 2)]
    };
    const recommendations = buildAdaptiveRecommendations({
        session: current,
        sessions: [prior, current],
        plan,
        getExercise,
        accumulationWeeks: 8
    });
    assert.equal(recommendations.some(item => item.type === "deload"), true);
});

test("counts unique accumulation weeks and excludes deload sessions", () => {
    const sessions = [
        { planId: "plan-1", completedAt: "2026-08-01T12:00:00.000Z" },
        { planId: "plan-1", completedAt: "2026-08-03T12:00:00.000Z" },
        { planId: "plan-1", completedAt: "2026-08-09T12:00:00.000Z" },
        { planId: "plan-1", completedAt: "2026-08-16T12:00:00.000Z", adaptiveGuidance: { isDeload: true } }
    ];
    assert.equal(countAccumulationWeeks(sessions, "plan-1", "2026-08-01T00:00:00.000Z"), 2);
});

test("offers an adaptive deload after repeated multi-muscle fatigue", () => {
    const prior = {
        id: "prior-multi",
        planId: "plan-1",
        trainingDayIndex: 0,
        completedAt: "2026-08-18T12:00:00.000Z",
        adaptiveGuidance: { recovery: { Chest: { status: "fatigued" }, Back: { status: "fatigued" } } },
        exercises: [exercise("bench", 100, 10, 2), exercise("row", 100, 10, 2)]
    };
    const current = {
        id: "current-multi",
        planId: "plan-1",
        trainingDayIndex: 0,
        adaptiveGuidance: {
            recovery: {
                Chest: { status: "fatigued", previousSessionId: prior.id },
                Back: { status: "fatigued", previousSessionId: prior.id }
            },
            difficulty: "too-hard"
        },
        exercises: [exercise("bench", 95, 8, 0), exercise("row", 95, 8, 0)]
    };
    const recommendations = buildAdaptiveRecommendations({
        session: current,
        sessions: [prior, current],
        plan,
        getExercise,
        accumulationWeeks: 4
    });
    assert.equal(recommendations.some(item => item.type === "deload"), true);
});
