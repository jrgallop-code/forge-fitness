import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("coach builder presents training experience as its own step", async () => {
  const source = await read("js/workouts/smart-build.js");

  assert.match(
    source,
    /const steps=\[renderGoalStep,renderScheduleStep,renderExperienceStep,renderPriorityStep,renderEquipmentStep,renderProgrammingStep,renderCoachBuildStep,renderResultStep\]/
  );
  assert.match(source, /function renderExperienceStep\(\).*questionCard\("3","Training experience"/);
  assert.match(source, /data-experience="\$\{v\}"/);
  assert.match(source, /function renderPriorityStep\(\).*questionCard\("4","Muscle priorities"/);
  assert.doesNotMatch(source, /renderPriorityExperienceStep/);
});

test("coach builder transitions through the coach build card after question six", async () => {
  const [source, engine] = await Promise.all([
    read("js/workouts/smart-build.js"),
    read("js/workouts/smart-build-unified-engine-v11.js")
  ]);

  assert.match(source, /if\(state\.step===5\)\{state\.generated=generateProgram\(\);showCoachBuild\(root\);return;\}/);
  assert.match(source, /questionCard\("6","Programming approach"/);
  assert.match(source, /function renderCoachBuildStep\(\)/);
  assert.match(source, /Your coach is building your program/);
  assert.match(source, /smart-coach-ring-progress/);
  assert.match(source, /smart-coach-dumbbell/);
  assert.match(source, /window\.setTimeout\(\(\)=>\{coachBuildTimer=0;if\(state\.step!==6\)return;state\.step=7;renderStep\(root\);\},2600\)/);
  assert.match(engine, /generated = generateProgram\(\);\s*showCoachBuildTransition\(\);/);
  assert.match(engine, /function showCoachBuildTransition\(\)/);
  assert.match(engine, /Your coach is building your program/);
  assert.match(engine, /Personalizing your training week/);
  assert.doesNotMatch(engine, /Matching the best template/);
  assert.doesNotMatch(source, /Matching the best template/);
  assert.match(engine, /coachBuildTimer = window\.setTimeout\(\(\) => \{\s*coachBuildTimer = 0;\s*renderReview\(\);\s*\}, 2600\)/);
});

test("production module cache keys retain the restored experience step", async () => {
  const [index, app, router] = await Promise.all([
    read("index.html"),
    read("js/app.js"),
    read("js/core/router.js")
  ]);

  assert.match(index, /css\/smart-build-coach-loading\.css\?v=coach-build-loading-1/);
  assert.match(index, /js\/app\.js\?v=appearance-themes-2/);
  assert.match(index, /smart-build-full-body-guardrails\.js\?v=coach-build-personalized-1/);
  assert.match(app, /\.\/core\/router\.js\?v=appearance-themes-2/);
  assert.match(router, /\.\.\/workouts\/smart-build\.js\?v=coach-build-personalized-1/);
  assert.match(await read("js/workouts/smart-build-full-body-guardrails.js"), /smart-build-unified-engine-v11\.js\?v=coach-build-personalized-1/);
});

test("coach build transition has a responsive animated circular loading treatment", async () => {
  const styles = await read("css/smart-build-coach-loading.css");

  assert.match(styles, /\.smart-coach-build-card/);
  assert.match(styles, /stroke-dasharray: 28 72/);
  assert.match(styles, /@keyframes smart-coach-ring-orbit/);
  assert.match(styles, /@media \(max-width: 390px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
