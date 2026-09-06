import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("expanded premade plans are registered with the standard plan-detail resolver", async () => {
  const polish = await read("js/workouts/workout-landing-live-polish.js");
  assert.match(polish, /presetPlans as detailPresetPlans/);
  assert.match(polish, /celebrityWorkoutPlans/);
  assert.match(polish, /bodybuilderWorkoutPlans/);
  assert.match(polish, /celebrityExpansionPlans/);
  assert.match(polish, /detailPresetPlans\.push\(plan\)/);
});

test("standard plan details still provide target maps and workout days", async () => {
  const [details, targetMap] = await Promise.all([
    read("js/workouts/workout-plan-details.js"),
    read("js/workouts/workout-plan-target-map.js")
  ]);
  assert.match(details, /id="workout-plan-detail-screen"/);
  assert.match(details, /plan-detail-days/);
  assert.match(details, /Start Workout/);
  assert.match(targetMap, /PLAN TARGET MAP/);
  assert.match(targetMap, /PLAN SET DISTRIBUTION/);
  assert.match(targetMap, /Muscle Breakdown/);
});
