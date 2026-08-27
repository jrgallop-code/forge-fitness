import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sessionSource = readFileSync(new URL('../js/workouts/workout-session.js', import.meta.url), 'utf8');
const recapSource = readFileSync(new URL('../js/workouts/workout-complete-recap.js', import.meta.url), 'utf8');
const swapSource = readFileSync(new URL('../js/workouts/session-exercise-actions.js', import.meta.url), 'utf8');
const historySource = readFileSync(new URL('../js/workouts/workout-history.js', import.meta.url), 'utf8');
const muscleVolumeSource = readFileSync(new URL('../js/progress/weekly-muscle-volume.js', import.meta.url), 'utf8');

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

test('Smart Swap stores replacement identity and muscle metadata in the completed session', () => {
  assert.match(swapSource, /name:\s*exercise\.name/);
  assert.match(swapSource, /muscleGroup:\s*exercise\.muscleGroup/);
  assert.match(swapSource, /primaryMuscles/);
  assert.match(swapSource, /Object\.assign\(plannedExercise/);
  assert.match(sessionSource, /enrichCompletedExercise/);
  assert.match(sessionSource, /exerciseStateMetadata/);
});

test('history, recap, and muscle volume resolve expanded swapped exercises', () => {
  assert.match(historySource, /exercise-library-expansion\.js/);
  assert.match(muscleVolumeSource, /exercise-library-expansion\.js/);
  assert.match(recapSource, /item\.name\|\|item\.exerciseName\|\|exercise\?\.name/);
  assert.match(recapSource, /item\.muscleGroup\|\|getExerciseById/);
});
