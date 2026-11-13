import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Coach uses identical exercise IDs/names as Level Up. Extra exports may
// extend shared logic but must not modify the underlying source catalogue.
const exact = [
  'video-library-exercises.js',
  'exercise-library.js',
  'exercise-library-expansion.js',
  'exercise-thumbnail-manifest.js',
  'routine-import-parser.js',
  'routine-builder-model.js',
  'exercise-guide-video-manifest.js',
  'plan-muscle-volume.js',
  'exercise-guide-generator.js',
  'video-library-guides.js',
  'bodyweight-workout-plans.js',
  'workout-plans.js',
];
const additiveAdapters = {
  'smart-build-v3.js': '// Coach adapter:',
};
const root = process.cwd();
for (const file of exact) {
  test('Coach library matches athlete library: ' + file, () => {
    const athlete = readFileSync(join(root, 'js/workouts', file), 'utf8');
    const coach = readFileSync(join(root, 'coach-preview/js/workouts', file), 'utf8');
    assert.equal(coach, athlete);
  });
}
for (const [file, marker] of Object.entries(additiveAdapters)) {
  test('Coach adapter preserves complete athlete implementation: ' + file, () => {
    const athlete = readFileSync(join(root, 'js/workouts', file), 'utf8');
    const coach = readFileSync(join(root, 'coach-preview/js/workouts', file), 'utf8');
    assert.ok(coach.startsWith(athlete), file + ' changed athlete implementation');
    assert.ok(coach.slice(athlete.length).includes(marker), file + ' missing adapter marker');
  });
}
test('Coach strength score is an append-only adapter', () => {
  const athlete = readFileSync(join(root, 'js/progress/overall-strength-index.js'), 'utf8');
  const coach = readFileSync(join(root, 'coach-preview/js/progress/overall-strength-index.js'), 'utf8');
  assert.ok(coach.startsWith(athlete));
  assert.ok(coach.slice(athlete.length).includes('export {buildStrengthIndexPoints}'));
});
