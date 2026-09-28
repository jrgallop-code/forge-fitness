import test from "node:test";
import assert from "node:assert/strict";
import { finisherPlans } from "../js/workouts/finisher-plans.js";
import { exercises } from "../js/workouts/exercise-library.js";

test("PWA finisher library contains complete, valid finisher plans", () => {
  assert.equal(finisherPlans.length, 14);
  const exerciseIds = new Set(exercises.map(exercise => exercise.id));
  for (const plan of finisherPlans) {
    assert.match(plan.id, /^finisher-/);
    assert.equal(plan.trainingType, "Finisher");
    assert.ok(plan.finisherCategory);
    assert.ok(plan.description);
    assert.ok(plan.estimatedMinutes);
    assert.equal(plan.days.length, 1);
    for (const exercise of plan.days[0].exercises) {
      assert.ok(exerciseIds.has(exercise.id), `Unknown exercise: ${exercise.id}`);
    }
  }
});
