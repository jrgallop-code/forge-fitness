import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const session = readFileSync("js/workouts/workout-session.js", "utf8");
const history = readFileSync("js/workouts/workout-history.js", "utf8");
const dropSets = readFileSync("js/workouts/drop-set-runtime.js", "utf8");
const compact = readFileSync("js/workouts/workout-logger-compact.js", "utf8");
const actions = readFileSync("js/workouts/session-exercise-actions.js", "utf8");
const header = readFileSync("js/workouts/logger-compact-header.js", "utf8");
const styles = readFileSync("css/session-exercise-actions.css", "utf8");

test("completed workout persistence normalizes and preserves optional per-set RIR", () => {
  assert.match(session, /function normalizeRirValue\(value\)/);
  assert.match(session, /sets: \(exercise\?\.sets \|\| \[\]\)\.map\(normalizeSavedSet\)/);
  assert.match(session, /\.\.\.normalizeSavedSet\(set\)/);
  assert.match(session, /rir: null,\s*completed: false/);
});

test("history summaries and previous-performance rows display recorded RIR", () => {
  assert.match(history, /RIR \$\{Number\(set\.rir\) >= 4 \? "4\+"/);
  assert.match(session, /formatPrevious\(previous\)[\s\S]*?RIR \$\{rir >= 4 \? "4\+"/);
  assert.match(session, /function formatPreviousSet\(set\)[\s\S]*?RIR \$\{rir >= 4 \? "4\+"/);
});

test("saved-workout editing reuses the live set rows and floating RIR picker", () => {
  assert.match(session, /logger\.__levelUpSession = session/);
  assert.doesNotMatch(session, /class="edit-workout-exercises"/);
  assert.doesNotMatch(session, /class="routine-set-editor"/);
  assert.doesNotMatch(session, /history-edit-drop-block/);
  assert.match(dropSets, /logger\?\.__levelUpSession \|\| readActive\(\)/);
  assert.doesNotMatch(dropSets, /dropSetEnhanced \|\| row\.closest\("#workout-session-logger"\)\?\.dataset\.editingSessionId/);
});

test("the compact logger controls route saved-workout mutations to the editor session", () => {
  assert.match(compact, /__levelUpEditApi\?\.removeSet\(exerciseIndex, setIndex\)/);
  assert.match(compact, /__levelUpEditApi\?\.addSet\(exerciseIndex\)/);
  assert.match(actions, /appendExerciseToWorkout\(exerciseId, logger\)/);
  assert.match(actions, /__levelUpEditApi\?\.addExercise\(exerciseId\)/);
  assert.doesNotMatch(actions, /if \(!logger \|\| logger\.dataset\.editingSessionId\) return/);
});

test("the saved editor uses the compact workout header without live timer controls", () => {
  assert.match(header, /logger\.__levelUpSession \|\| readActiveWorkout\(\)/);
  assert.doesNotMatch(header, /if \(!logger \|\| logger\.dataset\.editingSessionId\) return/);
  assert.match(styles, /data-editing-session-id[^}]*workout-timer-actions/);
});
