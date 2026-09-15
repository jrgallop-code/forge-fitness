import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("js/workouts/session-exercise-actions.js", "utf8");
const dropSets = readFileSync("js/workouts/drop-set-runtime.js", "utf8");
const adaptive = readFileSync("js/workouts/adaptive-guidance.js", "utf8");
const actionStyles = readFileSync("css/session-exercise-actions.css", "utf8");
const dropStyles = readFileSync("css/drop-set-runtime.css", "utf8");
const themeGuardrail = readFileSync("js/core/workout-theme-guardrail.js", "utf8");
const tutorial = readFileSync("js/more/interactive-workout-tutorial-v5.js", "utf8");
const entry = readFileSync("index.html", "utf8");

test("exercise overflow groups Superset, Warm-up, and Smart Swap while leaving Form Guide alone", () => {
  assert.match(actions, /data-session-overflow-action="superset"/);
  assert.match(actions, /data-session-overflow-action="warmup"/);
  assert.match(actions, /data-session-overflow-action="swap"/);
  assert.match(actions, /Smart Swap/);
  assert.match(actionStyles, /\.session-overflow-source\{display:none!important\}/);
  assert.doesNotMatch(actions, /data-session-overflow-action="form-guide"/);
});

test("working-set circle offers optional per-set RIR and preserves Drop Set access", () => {
  assert.match(dropSets, /data-set-rir-value/);
  assert.match(dropSets, /data-clear-set-rir/);
  assert.match(dropSets, /data-add-drop-set>Add Drop Set/);
  assert.match(dropSets, /kind: "set-rir"/);
  assert.match(dropSets, /set\.rir = value/);
  assert.match(dropSets, /set-rir-superscript/);
  assert.match(dropStyles, /data-rir="0"/);
  assert.match(dropStyles, /#ef3f49/);
  assert.match(themeGuardrail, /hasRir \? "var\(--rir-color\)"/);
});

test("legacy exercise-level RIR questionnaire is no longer rendered", () => {
  assert.doesNotMatch(adaptive, /forEach\(card => renderRirTracker/);
  assert.match(adaptive, /querySelectorAll\("\.adaptive-rir-control"\).*remove/);
});

test("the workout tutorial and native entry point load the new controls", () => {
  assert.match(tutorial, /Open set options/);
  assert.match(tutorial, /data-session-overflow-action="warmup"/);
  assert.match(entry, /drop-set-runtime\.js\?v=set-circle-rir-1/);
  assert.match(entry, /session-exercise-actions\.js\?v=exercise-overflow-1/);
});
