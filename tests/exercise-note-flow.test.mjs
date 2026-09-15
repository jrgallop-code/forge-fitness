import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const session = readFileSync("js/workouts/workout-session.js", "utf8");
const actions = readFileSync("js/workouts/session-exercise-actions.js", "utf8");
const cleanup = readFileSync("js/workouts/logger-ui-cleanup.js", "utf8");
const styles = readFileSync("css/session-exercise-actions.css", "utf8");
const entry = readFileSync("index.html", "utf8");

test("exercise notes sit between the target and previous-performance content", () => {
  const target = session.indexOf('<p class="session-target">Target:');
  const note = session.indexOf('<div class="session-lifting-note');
  const previous = session.indexOf('<div class="previous-performance">', target);
  assert.ok(target >= 0 && note > target && previous > note);
  assert.doesNotMatch(session, /<details class="session-lifting-notes"/);
  assert.match(cleanup, /target\.insertAdjacentElement\("afterend", note\)/);
});

test("saved notes use a compact preview and expand only for editing", () => {
  assert.match(session, /class="session-note-preview"/);
  assert.match(session, /class="session-note-editor" hidden/);
  assert.match(session, /Add exercise note/);
  assert.match(session, /Saved automatically/);
  assert.match(session, /sessionNoteLabel\.textContent|menuNoteLabel\.textContent/);
  assert.match(styles, /\.session-note-copy\{[^}]*-webkit-line-clamp:2/);
  assert.match(styles, /\.session-lifting-note\.is-editing \.session-note-preview\{display:none\}/);
});

test("the exercise menu opens the same Add or Edit Note field", () => {
  assert.match(actions, /data-session-overflow-action="note"/);
  assert.match(actions, /noteValue \? 'Edit Note' : 'Add Note'/);
  assert.match(actions, /querySelector\('\.session-note-preview'\)\?\.click\(\)/);
  assert.match(entry, /session-exercise-actions\.css\?v=exercise-note-flow-1/);
  assert.match(entry, /session-exercise-actions\.js\?v=exercise-note-flow-1/);
});
