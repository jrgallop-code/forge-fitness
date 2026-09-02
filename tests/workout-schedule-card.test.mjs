import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../css/workout-schedule.css", import.meta.url), "utf8");
const schedule = readFileSync(new URL("../js/workouts/workout-schedule.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

test("the Workout Schedule banner uses the app card radius", () => {
  assert.match(schedule, /workout-home-section workout-schedule-shell schedule-banner/);
  assert.match(css, /\.schedule-banner\{[^}]*border-radius:18px[^}]*\}/);
});

test("the rounded schedule card ships with a fresh browser and app cache key", () => {
  assert.match(index, /css\/workout-schedule\.css\?v=workout-schedule-card-radius-1/);
  assert.match(worker, /2026-09-02-130/);
});
