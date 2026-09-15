import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("js/workouts/session-exercise-actions.js", "utf8");
const dropSets = readFileSync("js/workouts/drop-set-runtime.js", "utf8");
const compactLogger = readFileSync("js/workouts/workout-logger-compact.js", "utf8");
const session = readFileSync("js/workouts/workout-session.js", "utf8");
const more = readFileSync("js/more/more-ui-v2.js", "utf8");
const actionStyles = readFileSync("css/session-exercise-actions.css", "utf8");
const dropStyles = readFileSync("css/drop-set-runtime.css", "utf8");
const themeGuardrail = readFileSync("js/core/workout-theme-guardrail.js", "utf8");
const tutorial = readFileSync("js/more/interactive-workout-tutorial-v5.js", "utf8");
const entry = readFileSync("index.html", "utf8");

test("exercise overflow groups Superset, Warm-up, and Smart Swap while leaving Form Guide alone", () => {
  assert.match(actions, /data-session-overflow-action="superset"/);
  assert.match(actions, /data-session-overflow-action="warmup"/);
  assert.match(actions, /data-session-overflow-action="swap"/);
  assert.match(actions, /data-session-overflow-action="reorder"/);
  assert.match(actions, /data-session-overflow-action="note"/);
  assert.match(actions, /Smart Swap/);
  assert.match(actions, /Reorder Exercises/);
  assert.match(actionStyles, /\.session-overflow-source\{display:none!important\}/);
  assert.doesNotMatch(actions, /data-session-overflow-action="form-guide"/);
  assert.match(compactLogger, /exercise-timer-btn/);
  assert.match(compactLogger, /exercise-timer-popover/);
  assert.match(actions, /className = 'exercise-more-btn'/);
  assert.doesNotMatch(actions, /aria-label', 'Exercise actions and rest timer'/);
});

test("exercise reorder sheet supports hold-and-drag and commits the day order safely", () => {
  assert.match(actions, /session-reorder-list/);
  assert.match(actions, /setPointerCapture/);
  assert.match(actions, /elementFromPoint/);
  assert.match(actions, /Confirm Order/);
  assert.match(actions, /day\.exercises = order\.map/);
  assert.match(actions, /active\.exercises = order\.map/);
  assert.match(actions, /active\.currentExerciseIndex = Math\.max/);
  assert.match(actions, /active\.restTimer\.exerciseIndex = nextTimerExercise/);
  assert.match(actions, /applyOrderToSavedWorkoutDay/);
  assert.match(actions, /levelup:workout-plans-changed/);
  assert.match(actions, /addEventListener\('contextmenu'/);
  assert.match(actions, /addEventListener\('selectstart'/);
  assert.match(actionStyles, /-webkit-user-select:none/);
  assert.match(actionStyles, /-webkit-touch-callout:none/);
});

test("working-set circle offers optional per-set RIR and preserves Drop Set access", () => {
  assert.match(dropSets, /data-set-rir-value/);
  assert.match(dropSets, /data-clear-set-rir/);
  assert.match(dropSets, /data-add-drop-set>Add Drop Set/);
  assert.match(dropSets, /levelup:set-rir-changed/);
  assert.match(dropSets, /set\.rir = value/);
  assert.match(dropSets, /set-rir-superscript/);
  assert.doesNotMatch(dropSets, /set-rir-superscript">R\$\{/);
  assert.match(dropStyles, /position: fixed/);
  assert.match(dropStyles, /bottom: calc\(96px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(dropStyles, /data-rir="0"/);
  assert.match(dropStyles, /var\(--rir-0,#c92f40\)/);
  assert.match(dropStyles, /var\(--rir-contrast/);
  assert.match(themeGuardrail, /forceImportant\(trigger, "border-color", "var\(--accent\)"\)/);
  assert.match(themeGuardrail, /color-mix\(in srgb, var\(--rir-color\) 34%, transparent\)/);
});

test("adaptive guidance survey and settings are removed from the TestFlight runtime", () => {
  assert.doesNotMatch(entry, /css\/adaptive-guidance\.css/);
  assert.doesNotMatch(entry, /js\/workouts\/adaptive-guidance\.js/);
  assert.doesNotMatch(more, /data-more-page="adaptive-guidance"/);
  assert.doesNotMatch(session, /getAdaptiveGuidanceSettings|getDeloadPreviewRequest|session-guidance/);
  assert.match(session, /levelup:set-rir-changed/);
});

test("the workout tutorial and native entry point load the new controls", () => {
  assert.match(tutorial, /Open set options/);
  assert.match(tutorial, /data-session-overflow-action="warmup"/);
  assert.match(entry, /drop-set-runtime\.js\?v=history-rir-edit-1/);
  assert.match(entry, /session-exercise-actions\.js\?v=history-rir-edit-1/);
});
