import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const renderer = await readFile(new URL("../js/progress/strength-index-chart-renderer.js", import.meta.url), "utf8");
const primary = await readFile(new URL("../js/progress/overall-strength-index.js", import.meta.url), "utf8");
const rangeSync = await readFile(new URL("../js/progress/training-analytics-range-consistency.js", import.meta.url), "utf8");

test("overall strength index uses one shared crimson renderer", () => {
    assert.match(primary, /strength-index-chart-renderer/);
    assert.match(rangeSync, /strength-index-chart-renderer/);
    assert.doesNotMatch(primary, /function drawStrengthIndexChart/);
    assert.doesNotMatch(rangeSync, /function drawStrengthIndexChart/);
});

test("strength index renderer has the faded red area and latest-point halo", () => {
    assert.match(renderer, /createLinearGradient/);
    assert.match(renderer, /rgba\(255, 49, 57, 0\.28\)/);
    assert.match(renderer, /const TREND_RED = "#ff3139"/);
    assert.match(renderer, /latest \? 4 : 3/);
    assert.match(renderer, /tick <= 2/);
    assert.match(renderer, /Baseline 100/);
});
