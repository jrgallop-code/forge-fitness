import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tutorials = await readFile(new URL("../js/core/tutorials.js", import.meta.url), "utf8");
const currentTrend = await readFile(new URL("../js/progress/weight-progress-current-trend.js", import.meta.url), "utf8");
const weeklySync = await readFile(new URL("../js/progress/weekly-weight-trend-sync.js", import.meta.url), "utf8");
const trendCore = await readFile(new URL("../js/core/weight-trend.js", import.meta.url), "utf8");
const tdee = await readFile(new URL("../js/nutrition/calculated-maintenance.js", import.meta.url), "utf8");

test("Trend Weight tutorial mirrors the contextual TDEE tutorial style but is opt-in", () => {
    assert.match(tutorials, /id: "trend-weight"/);
    assert.match(tutorials, /title: "Understand Trend Weight"/);
    assert.match(tutorials, /tab: "weight-tab"/);
    assert.match(tutorials, /latest 20 days of smoothed Trend Weight/);
});

test("visible Weekly Trend uses the smoothed Trend Weight engine", () => {
    assert.match(currentTrend, /calculateVisibleWeightTrend/);
    assert.doesNotMatch(currentTrend, /calculateDisplayWeightTrend/);
    assert.match(weeklySync, /calculateVisibleWeightTrend/);
    assert.match(weeklySync, /calculateTrendWeight/);
});

test("visible smoothing constants are explicit while TDEE remains unchanged", () => {
    assert.match(trendCore, /VISIBLE_TREND_ALPHA = 0\.25/);
    assert.match(trendCore, /VISIBLE_RATE_DAYS = 20/);
    assert.match(trendCore, /export function calculateVisibleWeightTrend/);
    assert.match(tdee, /calculateDisplayWeightTrend/);
    assert.doesNotMatch(tdee, /calculateVisibleWeightTrend/);
});
