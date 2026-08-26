import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/workouts/routine-importer.js", import.meta.url), "utf8");

test("routine importer promotes pasted ChatGPT routines and removes link import controls", () => {
  assert.match(source, /ChatGPT, Reddit, Notes/);
  assert.doesNotMatch(source, /Reddit source link|Import from Reddit|data-routine-source-import/);
});
