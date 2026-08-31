import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const session = fs.readFileSync('js/workouts/workout-session.js', 'utf8');
const actions = fs.readFileSync('js/workouts/session-exercise-actions.js', 'utf8');
const manual = fs.readFileSync('js/workouts/manual-builder-catalogue.js', 'utf8');
const browser = fs.readFileSync('js/workouts/exercise-browser.js', 'utf8');
const browserStyles = fs.readFileSync('css/exercise-browser.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const inlineAnatomy = fs.readFileSync('js/workouts/exercise-anatomy-inline.js', 'utf8');
const generatedMaleChest = fs.readFileSync('assets/exercise-anatomy/male-chest.svg', 'utf8');
const generatedFemaleShoulders = fs.readFileSync('assets/exercise-anatomy/female-shoulders.svg', 'utf8');

test('rep exercises own persistent optional notes', () => {
  assert.match(session, /trackingType:\s*"reps",\s*notes:\s*""/s);
  assert.match(session, /class="session-lifting-notes"/);
  assert.match(session, /class="session-rep-notes"[^>]*maxlength="500"/);
  assert.match(session, /session\.exercises\[exerciseIndex\]\.notes\s*=\s*event\.target\.value/);
  assert.match(session, /\.querySelector\("\.session-rep-notes"\)[\s\S]*?persist\(\)/);
  assert.match(session, /\.querySelector\("\.session-cardio-notes"\)[\s\S]*?persist\(\)/);
});

test('active workout add exercise preserves canonical identity and plan snapshot', () => {
  assert.match(actions, /function appendExerciseToActiveWorkout\(exerciseId\)/);
  assert.match(actions, /const exercise = getExerciseById\(exerciseId\)/);
  assert.match(actions, /id:\s*exercise\.id/);
  assert.match(actions, /day\.exercises\.push\(plannedExercise\)/);
  assert.match(actions, /active\.exercises\.push\(createReplacementState/);
  assert.match(actions, /active\.currentExerciseIndex = active\.exercises\.length - 1/);
  assert.match(actions, /saveActiveWorkout\(active\)/);
});

test('Add Exercise is inserted directly after Add Set and remains distinct from Smart Swap', () => {
  assert.match(actions, /addSet\.insertAdjacentElement\('afterend', button\)/);
  assert.match(actions, /button\.textContent = '\+ Add Exercise'/);
  assert.match(actions, /function openSwapSheet/);
  assert.match(actions, /function openAddExerciseSheet/);
});

test('shared visual browser defaults to All and combines muscle with search', () => {
  assert.match(browser, /\{ id: "", label: "All"/);
  assert.match(browser, /exercise-muscle-carousel/);
  assert.match(browser, /getAnatomyConfig\(item\.facing\)/);
  assert.match(browser, /renderFormGuideMuscleSvg\(item\.id\)/);
  assert.match(browser, /class=\"form-guide-muscle-svg\"/);
  assert.match(browser, /class=\"exercise-filter-card/);
  assert.match(browser, /class=\"exercise-filter-figure\"/);
  assert.doesNotMatch(browser, /class=\"exercise-muscle-card/);
  assert.doesNotMatch(browser, /class=\"exercise-muscle-figure/);
  assert.match(browserStyles, /\.exercise-filter-figure\{position:static;inset:auto/);
  assert.match(browserStyles, /\.exercise-filter-figure \.form-guide-muscle-svg\{position:static;inset:auto/);
  assert.doesNotMatch(browser, /hydrateExerciseAnatomy|DOMParser/);
  assert.match(generatedMaleChest, /#muscle_front_011/);
  assert.match(generatedMaleChest, /#ff315f/);
  assert.match(generatedFemaleShoulders, /#female_front_shoulders_l/);
  assert.match(generatedFemaleShoulders, /#ff315f/);
  assert.match(browser, /config\.sex/);
  assert.match(browser, /\(!muscle \|\| exercise\?\.muscleGroup === muscle\)/);
  assert.match(browser, /\(!term \|\| \[exercise\?\.name/);
  assert.match(manual, /renderMuscleCarousel\(state\.muscle/);
  assert.match(manual, /matchesExerciseBrowser\(x/);
  assert.doesNotMatch(manual, /<select data-manual-muscle>/);
  assert.match(actions, /renderMuscleCarousel\('', 'data-session-muscle'\)/);
  assert.match(actions, /matchesExerciseBrowser\(item, \{ muscle: sheet\.dataset\.muscle, query \}\)/);
  assert.match(browser, /data-exercise-browser-custom/);
  assert.match(manual, /querySelector\("\[data-exercise-browser-custom\]"\).*startCustom/);
  assert.match(actions, /addCustomExercise\(\{ name, muscleGroup:/);
  assert.match(actions, /appendExerciseToActiveWorkout\(exercise\.id\)/);
  assert.doesNotMatch(manual, /hydrateExerciseAnatomy/);
  assert.doesNotMatch(actions, /hydrateExerciseAnatomy/);
  assert.match(index, /manual-builder-catalogue\.js\?v=isolated-carousel-1/);
  assert.match(index, /session-exercise-actions\.js\?v=isolated-carousel-1/);
  assert.match(browser, /exercise-browser\.css\?v=isolated-carousel-1/);
});
