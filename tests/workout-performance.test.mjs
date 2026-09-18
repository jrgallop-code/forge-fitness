import test from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = {
  getItem() { return null; },
  setItem() {}
};

const { calculatePerformance } = await import("../js/dashboard/workout-performance.js");

const completedSet = (weight, reps) => ({ weight, reps, completed: true });

test("lift performance follows an exercise across different plans and workout days", () => {
  const previous = {
    id: "old-arm-session",
    planId: "old-plan",
    trainingDayIndex: 1,
    completedAt: "2026-09-01T12:00:00Z",
    exercises: [{ exerciseId: "barbell-curl", sets: [completedSet(50, 10)] }]
  };
  const current = {
    id: "new-arms-and-abs-session",
    planId: "new-arms-and-abs-plan",
    trainingDayIndex: 0,
    completedAt: "2026-09-08T12:00:00Z",
    exercises: [{ exerciseId: "barbell-curl", sets: [completedSet(55, 10)] }]
  };

  const result = calculatePerformance(current, [current, previous]);

  assert.equal(result.improved, 1);
  assert.equal(result.exercises[0].status, "Improved");
  assert.match(result.exercises[0].detail, /Previous 50 × 10/);
});

test("machine-specific lift comparisons do not mix equipment profiles", () => {
  const previous = {
    id: "old-machine-session",
    completedAt: "2026-09-01T12:00:00Z",
    exercises: [{ exerciseId: "machine-chest-press", equipmentProfileId: "gym-a", sets: [completedSet(100, 10)] }]
  };
  const current = {
    id: "new-machine-session",
    completedAt: "2026-09-08T12:00:00Z",
    exercises: [{ exerciseId: "machine-chest-press", equipmentProfileId: "gym-b", sets: [completedSet(110, 10)] }]
  };

  const result = calculatePerformance(current, [current, previous]);

  assert.equal(result.score, null);
  assert.equal(result.exercises[0].status, "New");
});
