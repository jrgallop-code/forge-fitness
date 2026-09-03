import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tutorials = await readFile(new URL("../js/core/tutorials.js", import.meta.url), "utf8");
const currentTrend = await readFile(new URL("../js/progress/weight-progress-current-trend.js", import.meta.url), "utf8");
const weeklySync = await readFile(new URL("../js/progress/weekly-weight-trend-sync.js", import.meta.url), "utf8");
const visibleSync = await readFile(new URL("../js/progress/weight-visible-trend-sync.js", import.meta.url), "utf8");
const trendCore = await readFile(new URL("../js/core/weight-trend.js", import.meta.url), "utf8");
const tdee = await readFile(new URL("../js/nutrition/calculated-maintenance.js", import.meta.url), "utf8");
const controller = await readFile(new URL("../js/nutrition/tdee-tutorial-controller.js", import.meta.url), "utf8");

test("Trend Weight tutorial explains the smoothed weekly model", () => {
    assert.match(tutorials, /id: "trend-weight"/);
    assert.match(tutorials, /title: "Understand Trend Weight"/);
    assert.match(tutorials, /tab: "weight-tab"/);
    assert.match(tutorials, /latest 20 days of smoothed Trend Weight/);
    assert.match(tutorials, /TDEE now uses this same smoothed weekly weight-change signal/);
});

test("visible Weekly Trend uses the smoothed Trend Weight engine", () => {
    assert.match(currentTrend, /calculateVisibleWeightTrend/);
    assert.doesNotMatch(currentTrend, /calculateDisplayWeightTrend/);
    assert.match(weeklySync, /calculateVisibleWeightTrend/);
    assert.match(weeklySync, /calculateTrendWeight/);
    assert.match(visibleSync, /syncTopSummary/);
    assert.match(visibleSync, /calculateVisibleWeightTrend/);
});

test("TDEE keeps its evidence architecture but consumes the smoothed weekly rate", () => {
    assert.match(trendCore, /VISIBLE_TREND_ALPHA = 0\.25/);
    assert.match(trendCore, /VISIBLE_RATE_DAYS = 20/);
    assert.match(tdee, /calculateDisplayWeightTrend/);
    assert.match(tdee, /calculateVisibleWeightTrend/);
    assert.match(tdee, /count: evidence\.entries/);
    assert.match(tdee, /spanDays: evidence\.spanDays/);
    assert.match(tdee, /rate: Number\.isFinite\(smoothed\.weeklyChange\)/);
    assert.match(tdee, /Number\(live\.foodDays\) >= 7/);
    assert.match(tdee, /Number\(live\.weighIns\) >= 7/);
    assert.match(tdee, /Number\(live\.weightSpanDays\) >= 14/);
    assert.match(tdee, /HIGH_CONFIDENCE_CAP = 100/);
    assert.match(tdee, /BUILDING_CONFIDENCE_CAP = 50/);
});

test("TDEE tutorial has a persistent clickable launcher with current copy", () => {
    assert.match(controller, /How TDEE works/);
    assert.match(controller, /data-tdee-tutorial-launch/);
    assert.match(controller, /pointer-events: auto !important/);
    assert.match(controller, /restartTutorial\(TUTORIAL_ID\)/);
    assert.match(tutorials, /TDEE uses your smoothed Weekly Trend/);
    assert.match(tutorials, /TDEE = average intake − \(weekly weight change × 500\)/);
});
