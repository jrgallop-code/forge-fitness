import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tutorials = await readFile(new URL("../js/core/tutorials.js", import.meta.url), "utf8");
const compact = await readFile(new URL("../js/progress/weight-progress-compact.js", import.meta.url), "utf8");
const trendCore = await readFile(new URL("../js/core/weight-trend.js", import.meta.url), "utf8");
const tdee = await readFile(new URL("../js/nutrition/calculated-maintenance.js", import.meta.url), "utf8");

test("Trend Weight tutorial mirrors the contextual TDEE tutorial style but is opt-in", () => {
    assert.match(tutorials, /id: "trend-weight"/);
    assert.match(tutorials, /title: "Understand Trend Weight"/);
    assert.match(tutorials, /tab: "weight-tab"/);
    assert.match(compact, /weight-trend-tutorial-launch/);
    assert.match(compact, /restartTutorial\(TREND_TUTORIAL_ID\)/);
    assert.match(compact, /expenditure-tutorial-card weight-trend-tutorial-card/);
});

test("tutorial explains interpolation and weighted smoothing while preserving weekly rate", () => {
    assert.match(tutorials, /linear interpolation/);
    assert.match(tutorials, /25%/);
    assert.match(tutorials, /75%/);
    assert.match(tutorials, /validated 21-day regression/);
});

test("smoothed Trend Weight and TDEE remain separate", () => {
    assert.match(trendCore, /VISIBLE_TREND_ALPHA = 0\.25/);
    assert.match(trendCore, /export function calculateTrendWeight/);
    assert.match(compact, /calculateDisplayWeightTrend/);
    assert.match(compact, /calculateTrendWeight/);
    assert.match(tdee, /calculateDisplayWeightTrend/);
    assert.doesNotMatch(tdee, /calculateTrendWeight\(/);
});
