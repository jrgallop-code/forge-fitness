import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Workout landing separates saved plans from the Level Up catalogue", async () => {
  const module = await read("js/workouts/workout-library-separation.js");
  assert.match(module, /YOUR TRAINING/);
  assert.match(module, /Your Training/);
  assert.match(module, /SAVED PLAN/);
  assert.match(module, /Explore Level Up Plans/);
  assert.match(module, /data-workout-live-your-training/);
  assert.match(module, /workout-live-plan-row\.is-saved/);
});

test("scheduled saved plan is promoted to Current Plan", async () => {
  const module = await read("js/workouts/workout-library-separation.js");
  assert.match(module, /level_up_workout_schedule_v1/);
  assert.match(module, /CURRENT PLAN/);
  assert.match(module, /is-current-plan/);
  assert.match(module, /Scheduled in your current training week/);
});

test("catalogue copies can show that a matching plan is already saved", async () => {
  const module = await read("js/workouts/workout-library-separation.js");
  assert.match(module, /LEVEL UP · SAVED/);
  assert.match(module, /LEVEL UP · CURRENT/);
  assert.match(module, /is-in-training-template/);
});

test("Workout polish refreshes the separated library after live rerenders", async () => {
  const polish = await read("js/workouts/workout-landing-live-polish.js");
  assert.match(polish, /workout-library-separation\.js\?v=workout-library-separation-1/);
  assert.match(polish, /initializeWorkoutLibrarySeparation\(landing\)/);
  assert.match(polish, /queueSavedPlanDecoration/);
});
