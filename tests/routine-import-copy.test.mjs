import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/workouts/routine-importer.js", import.meta.url), "utf8");
const coaches = await readFile(new URL("../js/workouts/virtual-coaches.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../css/virtual-coaches.css", import.meta.url), "utf8");

test("routine importer promotes pasted ChatGPT routines and removes link import controls", () => {
  assert.match(source, /ChatGPT, Reddit, Notes/);
  assert.doesNotMatch(source, /Reddit source link|Import from Reddit|data-routine-source-import/);
  assert.match(source, /Choose an exercise/);
});

test("the current coach launcher keeps the routine import entry point visible", () => {
  assert.match(coaches, /data-routine-import-open/);
  assert.match(coaches, /<strong>Import Routine<\/strong>/);
  assert.match(styles, /\.level-up-workout-actions \.level-up-workout-import \{ grid-column:1 \/ -1; \}/);
});
