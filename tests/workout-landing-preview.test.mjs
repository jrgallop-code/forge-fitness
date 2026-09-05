import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("workout landing preview is isolated from production navigation", async () => {
  const [html, preview, router] = await Promise.all([
    read("preview/workout-landing/index.html"),
    read("preview/workout-landing/preview.js"),
    read("js/core/router.js")
  ]);

  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /Live Workout tab is unchanged/);
  assert.match(preview, /renderWorkoutBuilder/);
  assert.match(preview, /initializeWorkoutBuilder/);
  assert.match(preview, /initializeSmartBuild/);
  assert.match(preview, /initializeRoutineImporter/);
  assert.match(preview, /initializeOneOffWorkout/);
  assert.match(preview, /initializeWorkoutSchedule/);
  assert.match(preview, /initializeWorkoutCatalogue/);
  assert.match(preview, /Build or Add a Plan/);
  assert.match(preview, /Program Preferences/);
  assert.match(preview, /Your Workout Plans/);
  assert.match(preview, /Browse Programs/);
  assert.doesNotMatch(router, /workout-landing-preview/);
});

test("preview delegates creation actions to the existing Level Up controls", async () => {
  const preview = await read("preview/workout-landing/preview.js");
  assert.match(preview, /\[data-smart-build\]/);
  assert.match(preview, /#new-plan-btn/);
  assert.match(preview, /\[data-routine-import-open\]/);
  assert.match(preview, /#one-off-workout-btn/);
  assert.match(preview, /getTrainingPreferences/);
});
