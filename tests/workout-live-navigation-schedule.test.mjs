import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("manual build Back returns through the real close-builder control", async () => {
  const polish = await read("js/workouts/workout-landing-live-polish.js");
  assert.match(polish, /data-workout-live-create-action=\\"manual\\"/);
  assert.match(polish, /workoutLiveManualEntry/);
  assert.match(polish, /data-manual-back/);
  assert.match(polish, /#close-plan-builder-btn/);
  assert.match(polish, /queueMicrotask/);
});

test("Workout landing shows the week strip without a duplicate Today card", async () => {
  const [polish, styles] = await Promise.all([
    read("js/workouts/workout-landing-live-polish.js"),
    read("css/workout-landing-live-polish.css")
  ]);
  assert.match(polish, /workout-live-schedule-edit/);
  assert.match(polish, /schedule-banner-top/);
  assert.match(polish, /schedule-banner-actions/);
  assert.match(polish, /workout-live-schedule-context-hidden/);
  assert.match(styles, /\.workout-live-today-card\{display:none!important\}/);
  assert.match(styles, /\.workout-live-schedule-edit/);
});

test("Workout polish does not install a second schedule MutationObserver", async () => {
  const polish = await read("js/workouts/workout-landing-live-polish.js");
  assert.doesNotMatch(polish, /new MutationObserver/);
  assert.match(polish, /main Workout landing already owns schedule DOM movement/);
  assert.match(polish, /configureSchedulePresentation/);
});

test("All Plans yields back to the current filter before opening its picker", async () => {
  const polish = await read("js/workouts/workout-landing-live-polish.js");
  assert.match(polish, /data-workout-live-show-matches/);
  assert.match(polish, /data-workout-live-filter/);
  assert.match(polish, /showMatches\.click\(\)/);
  assert.match(polish, /requestAnimationFrame/);
  assert.match(polish, /event\.stopImmediatePropagation\(\)/);
});

test("Workout New Plan flows hide the fixed bottom navigation", async () => {
  const styles = await read("css/workout-landing-live-polish.css");
  assert.match(styles, /data-workout-live-sheet/);
  assert.match(styles, /data-smart-build-wizard/);
  assert.match(styles, /data-routine-import-wizard/);
  assert.match(styles, /#plan-builder/);
  assert.match(styles, /display:none!important/);
  assert.match(styles, /padding-bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
});

test("saved user plans restore a compact delete action", async () => {
  const [polish, styles, workouts] = await Promise.all([
    read("js/workouts/workout-landing-live-polish.js"),
    read("css/workout-landing-live-polish.css"),
    read("js/workouts/workouts.js")
  ]);
  assert.match(polish, /data-workout-live-delete-saved-plan/);
  assert.match(polish, /Delete saved workout plan/);
  assert.match(polish, /deleteSavedPlanFromLiveCard/);
  assert.match(polish, /delete plan/i);
  assert.match(styles, /\.workout-live-row-delete/);
  assert.match(styles, /#ff453a/);
  assert.match(workouts, /Delete Plan/);
});

test("Modify Workout builder uses semantic theme tokens in every appearance", async () => {
  const styles = await read("css/workout-landing-live-polish.css");
  assert.match(styles, /html\[data-theme\] \.workout-live-page #plan-builder/);
  assert.match(styles, /\.exercise-recommendation strong\{[^}]*color:var\(--heading\)!important/);
  assert.match(styles, /\.builder-exercise-guide\{[^}]*background:var\(--accent-soft\)!important;[^}]*color:var\(--accent-text\)!important/);
  assert.match(styles, /\.remove-exercise-btn\{[^}]*color:var\(--danger-text\)!important/);
  assert.match(styles, /\.workout-day-card\{[^}]*background:var\(--surface-raised\)!important/);
  assert.match(styles, /\.exercise-builder-row\{[^}]*background:var\(--card\)!important/);
  assert.match(styles, /-webkit-text-fill-color:var\(--text\)!important/);
});

test("Workout polish cache-busts its refreshed stylesheet", async () => {
  const polish = await read("js/workouts/workout-landing-live-polish.js");
  assert.match(polish, /workout-landing-live-polish\.css\?v=workout-landing-live-polish-6/);
});
