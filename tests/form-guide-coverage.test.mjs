import assert from 'node:assert/strict';

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

await import('../js/workouts/exercise-library-expansion.js?v=exercise-library-expansion-1');
const { getAllExercises } = await import('../js/workouts/exercise-library.js?v=exercise-library-catalogue-2');
const { createGeneratedExerciseGuide } = await import('../js/workouts/exercise-guide-generator.js?v=full-library-guides-2');

const stockExercises = getAllExercises().filter(exercise => exercise?.id && !String(exercise.id).startsWith('custom-'));
assert.ok(stockExercises.length >= 156, `Expected at least 156 stock exercises, found ${stockExercises.length}`);

const missing = stockExercises.filter(exercise => !createGeneratedExerciseGuide(exercise));
assert.deepEqual(missing.map(exercise => exercise.id), [], `Missing canonical form guides: ${missing.map(exercise => exercise.id).join(', ')}`);

for (const exercise of stockExercises) {
  const guide = createGeneratedExerciseGuide(exercise);
  assert.ok(Array.isArray(guide.setup) && guide.setup.length >= 3, `${exercise.id}: setup is incomplete`);
  assert.ok(Array.isArray(guide.execution) && guide.execution.length >= 3, `${exercise.id}: execution is incomplete`);
  assert.ok(Array.isArray(guide.cues) && guide.cues.length >= 3, `${exercise.id}: cues are incomplete`);
  assert.ok(Array.isArray(guide.mistakes) && guide.mistakes.length >= 3, `${exercise.id}: mistakes are incomplete`);
  assert.ok(Array.isArray(guide.primary) && guide.primary.length >= 1, `${exercise.id}: primary muscles are missing`);
}

console.log(`Canonical form guide coverage: ${stockExercises.length}/${stockExercises.length}`);
