import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Workout library separates Explore and My Routines without stacking saved plans above discovery", async () => {
  const separation = await read("js/workouts/workout-library-separation.js");
  assert.match(separation, /data-workout-library-tab=\"explore\"/);
  assert.match(separation, /data-workout-library-tab=\"routines\"/);
  assert.match(separation, />My Routines <span>/);
  assert.match(separation, /data-workout-library-panel=\"explore\"/);
  assert.match(separation, /data-workout-library-panel=\"routines\"/);
  assert.match(separation, /explorePanel\.appendChild\(element\)/);
  assert.match(separation, /routinesList\?\.appendChild\(row\)/);
  assert.match(separation, /requestedView.*explore/);
});

test("right swipe opens My Routines and left swipe returns to Explore", async () => {
  const separation = await read("js/workouts/workout-library-separation.js");
  assert.match(separation, /touchstart/);
  assert.match(separation, /touchend/);
  assert.match(separation, /Math\.abs\(deltaX\) < 55/);
  assert.match(separation, /deltaX > 0 && current === \"explore\"/);
  assert.match(separation, /applyView\(\"routines\"\)/);
  assert.match(separation, /deltaX < 0 && current === \"routines\"/);
  assert.match(separation, /applyView\(\"explore\"\)/);
  assert.match(separation, /workout-live-recommended,\.workout-live-filter-strip/);
});

test("catalogue templates can be explicitly saved to My Routines", async () => {
  const adoption = await read("js/workouts/workout-template-adoption.js");
  assert.match(adoption, /save-workout-plan-to-routines/);
  assert.match(adoption, /Save to My Routines/);
  assert.match(adoption, /forge_workout_plans/);
  assert.match(adoption, /sourceTemplateId/);
  assert.match(adoption, /sourceType: \"level-up-template\"/);
  assert.match(adoption, /adoptedFromTemplate: true/);
});

test("starting a catalogue template adopts it before opening the logger", async () => {
  const adoption = await read("js/workouts/workout-template-adoption.js");
  assert.match(adoption, /#start-workout-plan/);
  assert.match(adoption, /ensureTemplateSaved\(template, \{ reason: \"started\" \}\)/);
  assert.match(adoption, /openWorkoutLogger\(savedPlan\)/);
  assert.match(adoption, /lastUsedAt/);
});

test("modified catalogue templates preserve their source when the manual builder saves", async () => {
  const adoption = await read("js/workouts/workout-template-adoption.js");
  assert.match(adoption, /#modify-workout-plan/);
  assert.match(adoption, /PENDING_TEMPLATE_KEY/);
  assert.match(adoption, /#save-plan-btn/);
  assert.match(adoption, /customizedFromTemplate: true/);
  assert.match(adoption, /reason: \"modified-and-saved\"/);
});

test("all plan creation surfaces use Save to My Routines language", async () => {
  const adoption = await read("js/workouts/workout-template-adoption.js");
  assert.match(adoption, /#save-plan-btn/);
  assert.match(adoption, /\[data-smart-save\]/);
  assert.match(adoption, /\[data-routine-save\]/);
  assert.match(adoption, /button\.textContent = \"Save to My Routines\"/);
});

test("My Routines can reopen automatically after an explicit template save", async () => {
  const [adoption, separation] = await Promise.all([
    read("js/workouts/workout-template-adoption.js"),
    read("js/workouts/workout-library-separation.js")
  ]);
  assert.match(adoption, /level_up_open_my_routines_v1/);
  assert.match(separation, /level_up_open_my_routines_v1/);
  assert.match(separation, /sessionStorage\.getItem\(OPEN_ROUTINES_KEY\)/);
  assert.match(separation, /requestedView = \"routines\"/);
});
