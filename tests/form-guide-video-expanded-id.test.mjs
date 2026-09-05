import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("form guide video lookup uses explicit exercise ids for expanded guides", () => {
  const source = readFileSync("js/workouts/exercise-guide-videos.js", "utf8");
  assert.match(source, /screen\?\.dataset\?\.exerciseId/);
  assert.match(source, /expandedExercises/);
  assert.match(source, /exercise-library-expansion\.js\?v=exercise-library-expansion-video-1/);
});

test("form guide loader cache-busts the corrected video enhancer", () => {
  const source = readFileSync("js/workouts/form-guide-svg-enforcer.js", "utf8");
  assert.match(source, /exercise-guide-videos\.js\?v=form-videos-5-expanded-id-fix/);
});
