import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [loggerEntry, html, calibration, worker] = await Promise.all([
    read("js/workouts/logger-exercise-name-fix.js"),
    read("index.html"),
    read("js/workouts/starting-weight-calibration.js"),
    read("service-worker.js")
]);

test("the duplicate starting-weight link and card are not loaded by the app", () => {
    assert.doesNotMatch(loggerEntry, /starting-weight-calibration/);
    assert.doesNotMatch(html, /starting-weight-calibration\.js/);
    assert.match(calibration, /Not sure\? Find starting weight/);
    assert.match(calibration, /starting-weight-calibration-sheet/);
});

test("the removal advances the offline app cache", () => {
    assert.match(worker, /CACHE_VERSION = "2026-09-08-274"/);
});
