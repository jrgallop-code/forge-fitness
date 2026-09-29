import test from "node:test";
import assert from "node:assert/strict";
import { evaluateLiveWorkoutPrs } from "../js/workouts/workout-pr-badges.js";
globalThis.localStorage = { getItem: () => null };
const { calculatePerformance } = await import("../js/dashboard/workout-performance.js");

const session = (weight, reps, date = "2026-09-29") => ({
    id: date,
    completedAt: `${date}T12:00:00Z`,
    exercises: [{ exerciseId: "barbell-curl", sets: [{ weight, reps, completed: true }] }]
});

test("the dashboard and logger distinguish weight and estimated 1RM records", () => {
    const previous = session(100, 5, "2026-09-20");
    for (const [weight, reps, expected] of [
        [105, 3, ["weight"]],
        [95, 10, ["estimated1rm"]],
        [105, 10, ["weight", "estimated1rm"]]
    ]) {
        const current = session(weight, reps);
        const live = evaluateLiveWorkoutPrs(current, [previous]);
        assert.deepEqual(live.details.get("barbell-curl")?.types, expected);
        const dashboard = calculatePerformance(current, [current, previous]);
        assert.deepEqual(dashboard.exercises[0].prTypes, expected);
    }
});
