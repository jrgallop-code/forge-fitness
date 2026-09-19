import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const recapSource = readFileSync(new URL('../js/workouts/workout-complete-recap.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('workout recap renders the final arm artwork on its first paint', () => {
  assert.match(recapSource, /workout-complete-recap__body-glow is-arm-hero/);
  assert.match(recapSource, /data-arm-hero-installed="true"/);
  assert.match(recapSource, /workout-complete-arm\.webp/);
  assert.match(recapSource, /renderCelebrationSlide/);
});

test('workout recap offers swipeable share cards and profile-aware anatomy', () => {
  assert.match(recapSource, /data-recap-carousel/);
  assert.match(recapSource, /renderMuscleSlide/);
  assert.match(recapSource, /renderAnatomy\("front",data\.trained\)/);
  assert.match(recapSource, /renderAnatomy\("back",data\.trained\)/);
  assert.match(recapSource, /data-recap-share="instagram"/);
  assert.match(recapSource, /data-recap-share="share"/);
  assert.match(recapSource, /data-recap-share="download"/);
  assert.doesNotMatch(recapSource, /data-recap-share="copy"/);
  assert.match(recapSource, /data-recap-background/);
  assert.match(recapSource, /level-up-mark-transparent\.svg/);
  assert.match(recapSource, /LevelUpInstagramShare/);
  assert.match(recapSource, /navigator\.share/);
  assert.match(recapSource, /canvas\.toBlob/);
});

test('the arm artwork is preloaded and the asynchronous replacement launcher is removed', () => {
  assert.match(indexSource, /rel="preload" href="assets\/workout-complete-arm\.webp\?v=2"/);
  assert.doesNotMatch(indexSource, /recap-debug-launcher\.js/);
});
