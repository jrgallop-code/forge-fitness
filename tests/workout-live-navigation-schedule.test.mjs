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

test("Workout New Plan flows clear the fixed bottom navigation", async () => {
  const styles = await read("css/workout-landing-live-polish.css");
  assert.match(styles, /data-smart-build-wizard/);
  assert.match(styles, /data-routine-import-wizard/);
  assert.match(styles, /#plan-builder/);
  assert.match(styles, /padding-bottom:calc\(138px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(styles, /scroll-padding-bottom:calc\(138px \+ env\(safe-area-inset-bottom\)\)/);
});

test("Workout polish cache-busts its refreshed stylesheet", async () => {
  const polish = await read("js/workouts/workout-landing-live-polish.js");
  assert.match(polish, /workout-landing-live-polish\.css\?v=workout-landing-live-polish-3/);
});
