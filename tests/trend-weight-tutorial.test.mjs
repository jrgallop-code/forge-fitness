import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tutorials = await readFile(new URL("../js/core/tutorials.js", import.meta.url), "utf8");
const compact = await readFile(new URL("../js/progress/weight-progress-compact.js", import.meta.url), "utf8");
const trendCore = await readFile(new URL("../js/core/weight-trend.js", import.meta.url), "utf8");
const tdee = await readFile(new URL("../js/nutrition/calculated-maintenance.js", import.meta.url), "utf8");

test("Trend Weight tutorial mirrors the contextual TDEE tutorial system", () => {
    assert.match(tutorials, /id: "trend-weight"/);
    assert.match(tutorials, /title: "Understand Trend Weight"/);
    assert.match(tutorials, /tab: "weight-tab"/);
    assert.match(compact, /expenditure-tutorial-card weight-trend-tutorial-card/);
    assert.match(compact, /dismissTutorial\(TREND_TUTORIAL_ID/);
    assert.match(compact, /completeTutorial\(TREND_TUTORIAL_ID\)/);
});

test("tutorial explains interpolation, weighted smoothing and 20-day rate", () => {
    assert.match(tutorials, /linear interpolation/);
    assert.match(tutorials, /25%/);
    assert.match(tutorials, /75%/);
    assert.match(tutorials, /latest 20 days/);
});

test("visible smoothing constants are explicit and TDEE keeps raw regression", () => {
    assert.match(trendCore, /VISIBLE_TREND_ALPHA = 0\.25/);
    assert.match(trendCore, /VISIBLE_RATE_DAYS = 20/);
    assert.match(trendCore, /export function calculateVisibleWeightTrend/);
    assert.match(tdee, /calculateDisplayWeightTrend/);
    assert.doesNotMatch(tdee, /calculateVisibleWeightTrend/);
});
