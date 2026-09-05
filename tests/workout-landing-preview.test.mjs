import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("workout landing prototype stays isolated from production navigation", async () => {
  const [html, preview, router] = await Promise.all([
    read("preview/workout-landing/index.html"),
    read("preview/workout-landing/preview.js"),
    read("js/core/router.js")
  ]);

  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /Live Workout tab is unchanged/);
  assert.match(html, /workout-landing-preview-2/);
  assert.match(preview, /renderWorkoutBuilder/);
  assert.match(preview, /initializeWorkoutBuilder/);
  assert.match(preview, /initializeSmartBuild/);
  assert.match(preview, /initializeRoutineImporter/);
  assert.match(preview, /initializeOneOffWorkout/);
  assert.match(preview, /initializeWorkoutSchedule/);
  assert.match(preview, /initializeWorkoutCatalogue/);
  assert.match(preview, /Recommended for You/);
  assert.match(preview, /All Workout Plans/);
  assert.match(preview, /data-preview-new-plan/);
  assert.match(preview, /data-preview-filter/);
  assert.doesNotMatch(router, /workout-landing-preview/);
});

test("prototype delegates every create action to existing Level Up controls", async () => {
  const preview = await read("preview/workout-landing/preview.js");
  assert.match(preview, /\[data-smart-build\]/);
  assert.match(preview, /#new-plan-btn/);
  assert.match(preview, /\[data-routine-import-open\]/);
  assert.match(preview, /#one-off-workout-btn/);
  assert.match(preview, /\[data-template-build\]/);
  assert.match(preview, /clickWhenReady/);
  for (const action of ["smart", "manual", "import", "one-off", "templates"]) {
    assert.match(preview, new RegExp(`\\b${action.replace("-", "\\-")}\\b`));
  }
});

test("prototype uses image-led cards and commercial-use preview photography", async () => {
  const [preview, styles] = await Promise.all([
    read("preview/workout-landing/preview.js"),
    read("preview/workout-landing/preview.css")
  ]);
  assert.match(preview, /STOCK_IMAGES/);
  assert.match(preview, /images\.unsplash\.com/);
  assert.match(preview, /Unsplash License/);
  assert.match(styles, /\.prototype-program-card/);
  assert.match(styles, /\.prototype-plan-row/);
  assert.match(styles, /\.prototype-sheet/);
  assert.match(styles, /\.prototype-filter/);
});
