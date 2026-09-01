import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("coach builder hides internal programming constraints from its result", async () => {
  const source = await read("js/workouts/smart-build-unified-engine-v11.js");
  const review = source.slice(source.indexOf("function renderReview()"), source.indexOf("function savePlan"));

  assert.doesNotMatch(review, /Program guardrails/);
  assert.doesNotMatch(review, /Program validation/);
  assert.doesNotMatch(review, /Session structure/);
  assert.doesNotMatch(review, /Weekly muscle stimulus/);
  assert.doesNotMatch(review, /target ~/);
  assert.doesNotMatch(review, /validation\.warnings\.join/);
});

test("coach builder ends the plan output with a weekly muscle-set graph", async () => {
  const source = await read("js/workouts/smart-build-unified-engine-v11.js");

  assert.match(source, /renderMuscleSetBreakdown\(generated\.effective\)/);
  assert.match(source, /WEEKLY SET DISTRIBUTION/);
  assert.match(source, /<h4>Muscle Breakdown<\/h4>/);
  assert.match(source, /Primary 1\.0 · Secondary 0\.5/);
  assert.match(source, /sets \/ maximum \* 100/);
  assert.match(source, /smart-set-breakdown-row/);
});

test("builder result assets use fresh production cache keys", async () => {
  const [html, loader] = await Promise.all([
    read("index.html"),
    read("js/workouts/smart-build-full-body-guardrails.js")
  ]);

  assert.match(html, /css\/smart-build\.css\?v=clean-builder-results-1/);
  assert.match(html, /smart-build-full-body-guardrails\.js\?v=coach-build-loading-2/);
  assert.match(loader, /smart-build-unified-engine-v11\.js\?v=coach-build-loading-2/);
});
