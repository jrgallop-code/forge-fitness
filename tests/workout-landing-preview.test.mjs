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
  assert.match(preview, /renderWorkoutBuilder/);
  assert.match(preview, /initializeWorkoutBuilder/);
  assert.match(preview, /initializeSmartBuild/);
  assert.match(preview, /initializeRoutineImporter/);
  assert.match(preview, /initializeWorkoutSchedule/);
  assert.match(preview, /initializeWorkoutCatalogue/);
  assert.match(preview, /Recommended for You/);
  assert.match(preview, /All Workout Plans/);
  assert.match(preview, /data-preview-new-plan/);
  assert.match(preview, /data-preview-filter/);
  assert.doesNotMatch(router, /workout-landing-preview/);
});

test("new plan sheet keeps reusable creation flows and browses routines on the landing page", async () => {
  const preview = await read("preview/workout-landing/preview.js");
  assert.match(preview, /actionRow\("smart"/);
  assert.match(preview, /actionRow\("manual"/);
  assert.match(preview, /actionRow\("import"/);
  assert.match(preview, /actionRow\("all-routines", "Browse All Routines"/);
  assert.doesNotMatch(preview, /actionRow\("one-off"/);
  assert.match(preview, /showAllRoutinesOnLanding/);
  assert.match(preview, /allCataloguePlans/);
  assert.match(preview, /All Workout Routines/);
  assert.match(preview, /clickWhenReady/);
});

test("prototype uses image-led cards with protected text contrast", async () => {
  const [preview, styles] = await Promise.all([
    read("preview/workout-landing/preview.js"),
    read("preview/workout-landing/preview.css")
  ]);
  assert.match(preview, /STOCK_IMAGES/);
  assert.match(preview, /images\.unsplash\.com/);
  assert.match(preview, /Unsplash License/);
  assert.match(styles, /\.prototype-program-card/);
  assert.match(styles, /\.prototype-program-shade/);
  assert.match(styles, /rgba\(0,0,0,\.95\)/);
  assert.match(styles, /\.prototype-program-copy/);
  assert.match(styles, /backdrop-filter:blur\(3px\)/);
});

test("prototype workout calendar is mounted first on the landing page", async () => {
  const schedule = await read("preview/workout-landing/schedule-bridge.js");
  assert.match(schedule, /This Week/);
  assert.match(schedule, /landing\.prepend\(section\)/);
  assert.doesNotMatch(schedule, /filters\.insertAdjacentElement\("afterend", section\)/);
});
