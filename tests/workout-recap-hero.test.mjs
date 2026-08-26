import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const recapSource = readFileSync(new URL('../js/workouts/workout-complete-recap.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('workout recap renders the final arm artwork on its first paint', () => {
  assert.match(recapSource, /workout-complete-recap__body-glow is-arm-hero/);
  assert.match(recapSource, /data-arm-hero-installed="true"/);
  assert.match(recapSource, /workout-complete-arm\.webp/);
  assert.doesNotMatch(recapSource, /renderFrontBody\(trained\)/);
});

test('the arm artwork is preloaded and the asynchronous replacement launcher is removed', () => {
  assert.match(indexSource, /rel="preload" href="assets\/workout-complete-arm\.webp\?v=2"/);
  assert.doesNotMatch(indexSource, /recap-debug-launcher\.js/);
});
