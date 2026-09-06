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

test("router cache-busts the refreshed Workout polish module", async () => {
  const router = await read("js/core/router.js");
  assert.match(router, /workout-landing-live-polish\.js\?v=workout-landing-live-polish-2/);
});
