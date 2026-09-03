import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWeeklyAssignment,
  createOnboardingSchedule,
  defaultTrainingDays,
  normalizeTrainingDays,
  trainingDaysForCount
} from "../js/workouts/onboarding-schedule.js";

test("weekday choices are normalized in Monday-to-Sunday display order", () => {
  assert.deepEqual(normalizeTrainingDays([0, 5, 1, 5, 9]), [1, 5, 0]);
  assert.deepEqual(defaultTrainingDays(3), [1, 3, 5]);
  assert.deepEqual(trainingDaysForCount([2, 4, 6], 3), [2, 4, 6]);
  assert.deepEqual(trainingDaysForCount([1], 4), [1, 2, 4, 5]);
});

test("selected onboarding weekdays map plan days into the weekly schedule", () => {
  assert.deepEqual(buildWeeklyAssignment([1, 3, 5], 3), {
    0: null,
    1: 0,
    2: null,
    3: 1,
    4: null,
    5: 2,
    6: null
  });
});

test("an onboarding schedule is only created for a completed setup and valid plan", () => {
  const plan = { id: "plan-1", days: [{ name: "Push" }, { name: "Pull" }, { name: "Legs" }] };
  assert.equal(createOnboardingSchedule(plan, { onboardingComplete: false, trainingDays: [1, 3, 5] }), null);
  const schedule = createOnboardingSchedule(plan, { onboardingComplete: true, trainingDays: [1, 3, 5] });
  assert.equal(schedule.planId, "plan-1");
  assert.equal(schedule.source, "onboarding");
  assert.deepEqual(schedule.trainingDays, [1, 3, 5]);
  assert.deepEqual([schedule.weekly[1], schedule.weekly[3], schedule.weekly[5]], [0, 1, 2]);
});
