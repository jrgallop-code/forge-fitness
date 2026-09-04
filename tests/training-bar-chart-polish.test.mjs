import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const renderer = await readFile(new URL("../js/progress/training-bar-chart-renderer.js", import.meta.url), "utf8");
const initial = await readFile(new URL("../js/progress/training-progress.js", import.meta.url), "utf8");
const range = await readFile(new URL("../js/progress/training-analytics-range.js", import.meta.url), "utf8");
const strengthRenderer = await readFile(new URL("../js/progress/strength-index-chart-renderer.js", import.meta.url), "utf8");
const strengthPrimary = await readFile(new URL("../js/progress/overall-strength-index.js", import.meta.url), "utf8");
const strengthRange = await readFile(new URL("../js/progress/training-analytics-range-consistency.js", import.meta.url), "utf8");

test("initial and timeframe bar charts use the same renderer", () => {
    assert.match(initial, /training-bar-chart-renderer/);
    assert.match(range, /training-bar-chart-renderer/);
    assert.doesNotMatch(range, /function drawBarChart/);
    assert.doesNotMatch(initial, /context\.fillStyle\s*=\s*"#e10600"/);
});

test("bar renderer uses gradient rounded bars and collision-safe labels", () => {
    assert.match(renderer, /createLinearGradient/);
    assert.match(renderer, /quadraticCurveTo/);
    assert.match(renderer, /selectLabelIndexes/);
    assert.match(renderer, /Math\.floor\(plotWidth \/ 72\)/);
    assert.match(renderer, /tick < 3/);
    assert.match(renderer, /shadowBlur = 11/);
});

test("weekly working sets stay grouped by calendar week at every timeframe", () => {
    assert.match(range, /function buildWeeklyChartPoints\(/);
    assert.match(range, /bucket:\s*"week"/);
    assert.match(range, /buildWeeklyChartPoints\(sessions, rangeWindow, countWorkingSets\)/);
    assert.match(range, /axisLabel:\s*"Weekly working sets"/);
    assert.match(range, /weekly totals/);
});

test("strength summary is shared by initial and timeframe render paths", () => {
    assert.match(strengthRenderer, /export function renderStrengthIndexSummary/);
    assert.match(strengthPrimary, /renderStrengthIndexSummary\(summary, latest\)/);
    assert.match(strengthRange, /renderStrengthIndexSummary\(summary, latest, rangeWindow\.label\)/);
});
