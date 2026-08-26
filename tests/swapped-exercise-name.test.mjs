import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sessionSource = readFileSync(new URL('../js/workouts/workout-session.js', import.meta.url), 'utf8');
const recapSource = readFileSync(new URL('../js/workouts/workout-complete-recap.js', import.meta.url), 'utf8');

test('active workout and recap use the expanded exercise catalogue for swapped IDs', () => {
  for (const source of [sessionSource, recapSource]) {
    assert.ok(source.includes('exercise-library-expansion.js?v=exercise-library-expansion-1'));
    assert.ok(source.includes('exercise-library.js?v=exercise-library-catalogue-2'));
  }
});

test('Dumbbell Fly remains a named catalogue entry after a swap', async () => {
  globalThis.localStorage = { getItem: () => null };
  await import('../js/workouts/exercise-library-expansion.js?v=exercise-library-expansion-1');
  const { getExerciseById } = await import('../js/workouts/exercise-library.js?v=exercise-library-catalogue-2');
  assert.equal(getExerciseById('dumbbell-fly')?.name, 'Dumbbell Fly');
});
