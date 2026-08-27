import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.localStorage = { getItem: () => null };

const { formatSetCredits, getWeeklyPlanVolume } = await import("../js/workouts/plan-muscle-volume.js");
const importerSource = await readFile(new URL("../js/workouts/routine-importer.js", import.meta.url), "utf8");
const targetMapSource = await readFile(new URL("../js/workouts/workout-plan-target-map.js", import.meta.url), "utf8");

test("import review and saved plan use the same muscle-volume calculator", () => {
  assert.match(importerSource, /getWeeklyPlanVolume\(plan\)/);
  assert.match(targetMapSource, /getWeeklyPlanVolume\(plan\)/);
  assert.match(importerSource, /Primary 1\.0 · Secondary 0\.5/);
  assert.doesNotMatch(importerSource, /\.muscleGroup \|\| "Other"/);
});

test("shared volume calculator gives half credit to secondary muscles", () => {
  const volume = getWeeklyPlanVolume({
    days: [{ exercises: [{ id: "lat-pulldown", sets: 4 }] }]
  });

  assert.equal(volume.get("Back"), 4);
  assert.equal(volume.get("Biceps"), 2);
  assert.equal(volume.get("Forearms"), 2);
  assert.equal(formatSetCredits(2.5), "2.5 sets");
});
