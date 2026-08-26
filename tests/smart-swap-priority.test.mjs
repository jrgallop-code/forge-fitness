import test from 'node:test';
import assert from 'node:assert/strict';

import {
  movementForExercise,
  prioritizeMovementMatches
} from '../js/workouts/smart-swap-priority.js';

globalThis.localStorage = { getItem: () => null };
await import('../js/workouts/exercise-library-expansion.js?v=exercise-library-expansion-1');
const { getAllExercises } = await import('../js/workouts/exercise-library.js?v=exercise-library-catalogue-2');

test('all chest fly variants share the chest-fly movement family', () => {
  const flyIds = [
    'cable-fly',
    'pec-deck',
    'dumbbell-fly',
    'incline-dumbbell-fly',
    'low-to-high-cable-fly',
    'high-to-low-cable-fly'
  ];

  flyIds.forEach(id => {
    assert.equal(movementForExercise({ id }), 'chest-fly');
  });

  const availableIds = new Set(getAllExercises().map(exercise => exercise.id));
  flyIds.forEach(id => assert.ok(availableIds.has(id), `${id} should be available to Smart Swap`));
});

test('fly alternatives rank ahead of higher-scoring chest presses for Cable Fly', () => {
  const recommendations = [
    { candidate: { id: 'barbell-bench-press', name: 'Barbell Bench Press' }, score: 99 },
    { candidate: { id: 'pec-deck', name: 'Pec Deck' }, score: 92 },
    { candidate: { id: 'dumbbell-fly', name: 'Dumbbell Fly' }, score: 92 },
    { candidate: { id: 'incline-barbell-press', name: 'Incline Barbell Press' }, score: 99 }
  ];

  const ranked = prioritizeMovementMatches({ id: 'cable-fly' }, recommendations);

  assert.deepEqual(
    ranked.map(item => item.candidate.id),
    ['dumbbell-fly', 'pec-deck', 'barbell-bench-press', 'incline-barbell-press']
  );
});
