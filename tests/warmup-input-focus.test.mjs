import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../js/workouts/logger-ui-cleanup.js", import.meta.url),
  "utf8"
);

test("warm-up input saves refresh the cached row signature without replacing the focused field", () => {
  assert.match(source, /function getWarmupRowsSignature\(warmups = \[\]\)/);
  assert.match(
    source,
    /saveActiveWorkout\(active\);\s*card\.dataset\.warmupRowsSignature = getWarmupRowsSignature\(state\.warmupSets\);/
  );
  assert.match(source, /const signature = getWarmupRowsSignature\(warmups\)/);
});
