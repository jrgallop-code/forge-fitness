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
  assert.match(recapSource, /renderAnatomy\("front",data\.muscleStats\)/);
  assert.match(recapSource, /renderAnatomy\("back",data\.muscleStats\)/);
  assert.match(recapSource, /data-recap-share="instagram"/);
  assert.match(recapSource, /data-recap-share="share"/);
  assert.match(recapSource, /data-recap-share="download"/);
  assert.doesNotMatch(recapSource, /data-recap-share="copy"/);
  assert.match(recapSource, /data-recap-background/);
  assert.match(recapSource, /level-up-mark-transparent\.svg/);
  assert.match(recapSource, /drawBrandWordmark/);
  assert.match(recapSource, /SHARE_ICON/);
  assert.match(recapSource, /LevelUpInstagramShare/);
  assert.doesNotMatch(recapSource, /openInstagramStories/);
  assert.match(recapSource, /navigator\.share/);
  assert.match(recapSource, /canvas\.toBlob/);
});

test('workout recap uses the revised first and second card copy', () => {
  assert.doesNotMatch(recapSource, /YOU CRUSHED IT/);
  assert.match(recapSource, /slideFrame\("celebration", `Workout #\$\{data\.workoutNumber\}`, ""/);
  assert.match(recapSource, /TODAY'S WORKOUT/);
});

test('workout recap distinguishes shared primary and secondary muscle credits', () => {
  assert.match(recapSource, /getExerciseImpacts/);
  assert.match(recapSource, /credit>=1/);
  assert.match(recapSource, /is-primary/);
  assert.match(recapSource, /is-secondary/);
  assert.match(recapSource, /Primary · 1\.0/);
  assert.match(recapSource, /Secondary · 0\.5/);
});

test('achievement cards render every detected personal record', () => {
  assert.match(recapSource, /const prs=data\.wins\.filter/);
  assert.match(recapSource, /rows\.map\(win/);
  assert.doesNotMatch(recapSource, /data\.wins\.slice\(0,3\)/);
});

test('the arm artwork is preloaded and the asynchronous replacement launcher is removed', () => {
  assert.match(indexSource, /rel="preload" href="assets\/workout-complete-arm\.webp\?v=2"/);
  assert.doesNotMatch(indexSource, /recap-debug-launcher\.js/);
});
