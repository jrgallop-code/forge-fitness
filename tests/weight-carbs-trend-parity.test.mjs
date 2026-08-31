import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shim = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const fix = readFileSync("js/progress/weight-carbs-trend-parity-fix.js", "utf8");
const primary = readFileSync("js/progress/weight-trend-chart.js", "utf8");

test("Weight and Carbs parity fix is initialized after the carousel", () => {
    assert.match(shim, /initializeBaseWeightCarbsChart\(root\)/);
    assert.match(shim, /initializeWeightCarbsTrendParityFix\(root\)/);
});

test("Weight and Carbs uses the same moving-average construction as Weight Trend", () => {
    const requiredFragments = [
        /const windowStart = currentTime - \(6 \* DAY_MS\)/,
        /itemTime >= windowStart && itemTime <= currentTime/,
        /windowEntries\.reduce\(\(sum, item\) => sum \+ item\.weight, 0\) \/ windowEntries\.length/,
        /return \{ date: entry\.date, weight: average \}/
    ];
    for (const fragment of requiredFragments) {
        assert.match(primary, fragment);
        assert.match(fix, fragment);
    }
    assert.doesNotMatch(fix, /calculateSevenDayAverage/);
});

test("Weight and Carbs uses the same smooth trend-line routine as Weight Trend", () => {
    const requiredFragments = [
        /const midpointX = \(current\.x \+ next\.x\) \/ 2/,
        /const midpointY = \(current\.y \+ next\.y\) \/ 2/,
        /context\.quadraticCurveTo\(current\.x, current\.y, midpointX, midpointY\)/,
        /context\.lineTo\(points\.at\(-1\)\.x, points\.at\(-1\)\.y\)/
    ];
    for (const fragment of requiredFragments) {
        assert.match(primary, fragment);
        assert.match(fix, fragment);
    }
    assert.match(fix, /context\.shadowColor = TREND_GREEN_GLOW/);
    assert.match(fix, /context\.shadowBlur = 8/);
    assert.match(fix, /context\.lineWidth = 3/);
});

test("tooltip trend comparison comes from the same moving-average series", () => {
    assert.match(fix, /const movingAverage = calculateMovingAverage\(weights\)/);
    assert.match(fix, /const trendByDate = new Map\(movingAverage\.map/);
    assert.match(fix, /trend: trendByDate\.get\(date\) \?\? null/);
    assert.match(fix, /const trend = Number\.isFinite\(day\.trend\) \? displayMass\(day\.trend\) : null/);
});

test("a tap outside the visible summary clears the overlay instead of reselecting", () => {
    assert.match(fix, /const insideTooltip =/);
    assert.match(fix, /if \(insideTooltip\) return/);
    assert.match(fix, /event\.stopImmediatePropagation\(\)/);
    assert.match(fix, /activeDate = null/);
    assert.match(fix, /hideTooltip\(card\)/);
});
