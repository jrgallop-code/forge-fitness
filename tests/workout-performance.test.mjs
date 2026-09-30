import test from "node:test";
import assert from "node:assert/strict";

let preferences = { bodyWeight: "lb", liftingWeight: "lb", distance: "km", length: "cm" };
globalThis.localStorage = {
  getItem(key) { return key === "level_up_unit_preferences_v2" ? JSON.stringify(preferences) : null; },
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
  assert.match(result.exercises[0].detail, /Previous 50 lb × 10/);
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


test("dashboard set comparisons follow lifting units independently of body weight", () => {
 const previous = {id:"old",completedAt:"2026-09-01T12:00:00Z",exercises:[{exerciseId:"barbell-curl",sets:[completedSet(100,10)]}]};
 const current = {id:"new",completedAt:"2026-09-08T12:00:00Z",exercises:[{exerciseId:"barbell-curl",sets:[completedSet(110,10)]}]};
 const before = calculatePerformance(current,[current,previous]);
 preferences = {...preferences, bodyWeight:"lb", liftingWeight:"kg"};
 const metric = calculatePerformance(current,[current,previous]);
 assert.equal(metric.exercises[0].detail,"49.9 kg × 10 · Previous 45.4 kg × 10");
 assert.equal(metric.score,before.score);
 assert.equal(metric.prs,before.prs);
 assert.equal(current.exercises[0].sets[0].weight,110);
 preferences = {...preferences, bodyWeight:"kg", liftingWeight:"lb"};
 assert.equal(calculatePerformance(current,[current,previous]).exercises[0].detail,"110 lb × 10 · Previous 100 lb × 10");
 preferences = {...preferences, bodyWeight:"lb"};
});
