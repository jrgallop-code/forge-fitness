import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("coach builder presents training experience as its own step", async () => {
  const source = await read("js/workouts/smart-build.js");

  assert.match(
    source,
    /const steps=\[renderGoalStep,renderScheduleStep,renderExperienceStep,renderPriorityStep,renderEquipmentStep,renderProgrammingStep,renderResultStep\]/
  );
  assert.match(source, /function renderExperienceStep\(\).*questionCard\("3","Training experience"/);
  assert.match(source, /data-experience="\$\{v\}"/);
  assert.match(source, /function renderPriorityStep\(\).*questionCard\("4","Muscle priorities"/);
  assert.doesNotMatch(source, /renderPriorityExperienceStep/);
});

test("coach builder generates only after the new six-question flow", async () => {
  const source = await read("js/workouts/smart-build.js");

  assert.match(source, /if\(state\.step===5\)\{state\.generated=generateProgram\(\);state\.step=6;\}/);
  assert.match(source, /questionCard\("6","Programming approach"/);
});

test("production module cache keys retain the restored experience step", async () => {
  const [index, app, router] = await Promise.all([
    read("index.html"),
    read("js/app.js"),
    read("js/core/router.js")
  ]);

  assert.match(index, /js\/app\.js\?v=progress-cardio-1/);
  assert.match(app, /\.\/core\/router\.js\?v=progress-cardio-1/);
  assert.match(router, /\.\.\/workouts\/smart-build\.js\?v=coach-experience-step-1/);
});
