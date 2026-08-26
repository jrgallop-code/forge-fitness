import test from 'node:test';
import assert from 'node:assert/strict';

import { removeWorkoutSet, setHasRecordedData } from '../js/workouts/logger-set-removal.js';

test('recognizes entered or completed set data before removal', () => {
  assert.equal(setHasRecordedData({ weight: null, reps: null, rir: null, completed: false }), false);
  assert.equal(setHasRecordedData({ weight: 50, reps: null, completed: false }), true);
  assert.equal(setHasRecordedData({ weight: null, reps: null, rir: 0, completed: false }), true);
  assert.equal(setHasRecordedData({ weight: null, reps: null, completed: true }), true);
  assert.equal(setHasRecordedData({ dropSets: [{ reps: 8 }] }), true);
});

test('removes the selected set and keeps the plan snapshot in sync', () => {
  const active = {
    trainingDayIndex: 0,
    currentExerciseIndex: 0,
    currentSetIndex: 2,
    exercises: [{ sets: [{ reps: 10 }, { reps: 9 }, { reps: 8 }] }],
    planSnapshot: { days: [{ exercises: [{ sets: 3 }] }] }
  };

  assert.equal(removeWorkoutSet(active, 0, 1), true);
  assert.deepEqual(active.exercises[0].sets, [{ reps: 10 }, { reps: 8 }]);
  assert.equal(active.planSnapshot.days[0].exercises[0].sets, 2);
  assert.equal(active.currentSetIndex, 1);
});

test('keeps at least one set in an exercise', () => {
  const active = {
    trainingDayIndex: 0,
    exercises: [{ sets: [{ reps: null }] }],
    planSnapshot: { days: [{ exercises: [{ sets: 1 }] }] }
  };

  assert.equal(removeWorkoutSet(active, 0, 0), false);
  assert.equal(active.exercises[0].sets.length, 1);
});
