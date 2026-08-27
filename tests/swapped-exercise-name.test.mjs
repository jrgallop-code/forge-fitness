import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sessionSource = readFileSync(new URL('../js/workouts/workout-session.js', import.meta.url), 'utf8');
const recapSource = readFileSync(new URL('../js/workouts/workout-complete-recap.js', import.meta.url), 'utf8');
const swapSource = readFileSync(new URL('../js/workouts/session-exercise-actions.js', import.meta.url), 'utf8');
const historySource = readFileSync(new URL('../js/workouts/workout-history.js', import.meta.url), 'utf8');
const muscleVolumeSource = readFileSync(new URL('../js/progress/weekly-muscle-volume.js', import.meta.url), 'utf8');
const identitySource = readFileSync(new URL('../js/workouts/session-exercise-identity.js', import.meta.url), 'utf8');

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
  assert.match(recapSource, /resolveSessionExerciseIdentity\(item\)\.name/);
  assert.match(recapSource, /item\.muscleGroup\|\|getExerciseById/);
});

test('generic Exercise placeholders are repaired from saved swap IDs and plan snapshots', async () => {
  assert.match(identitySource, /\^exercise\(\?:\\s\+\\d\+\)\?\$/i);
  assert.match(sessionSource, /repairWorkoutSessionList\(parsed\)/);
  assert.match(historySource, /resolveSessionExerciseIdentity\(exercise\)/);
  assert.match(muscleVolumeSource, /repairWorkoutSessionList\(parsed\)/);

  globalThis.localStorage = { getItem: () => null };
  const { resolveSessionExerciseIdentity, repairWorkoutSessionExerciseIdentities } = await import('../js/workouts/session-exercise-identity.js?test=repair-generic-exercise');
  const resolved = resolveSessionExerciseIdentity({ exerciseId: 'dumbbell-fly', name: 'Exercise', muscleGroup: 'Other' });
  assert.equal(resolved.name, 'Dumbbell Fly');
  assert.equal(resolved.muscleGroup, 'Chest');

  const repaired = repairWorkoutSessionExerciseIdentities({
    trainingDayIndex: 0,
    exercises: [{ exerciseId: 'Exercise', name: 'Exercise', sets: [{ reps: 12, completed: true }] }],
    planSnapshot: { days: [{ exercises: [{ id: 'dumbbell-fly', name: 'Dumbbell Fly' }] }] }
  });
  assert.equal(repaired.changed, true);
  assert.equal(repaired.session.exercises[0].exerciseId, 'dumbbell-fly');
  assert.equal(repaired.session.exercises[0].name, 'Dumbbell Fly');
  assert.equal(repaired.session.exercises[0].muscleGroup, 'Chest');
});
