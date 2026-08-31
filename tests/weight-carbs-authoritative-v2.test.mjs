import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const source = readFileSync("js/progress/weight-chart-carousel-v2.js", "utf8");
const primary = readFileSync("js/progress/weight-trend-chart.js", "utf8");
const sw = readFileSync("service-worker.js", "utf8");

test("Weight and Carbs uses only the authoritative v2 renderer", () => {
    assert.match(entry, /weight-chart-carousel-v2\.js\?v=weight-carousel-authoritative-1/);
    assert.doesNotMatch(entry, /weight-chart-carousel\.js\?v=weight-carousel-1/);
    assert.doesNotMatch(entry, /weight-carbs-trend-parity-fix/);
});

test("Weight and Carbs moving average matches primary Weight Trend construction", () => {
    const required = [
        /const windowStart = currentTime - \(6 \* DAY_MS\)/,
        /itemTime >= windowStart && itemTime <= currentTime/,
        /windowEntries\.reduce\(\(sum, item\) => sum \+ item\.weight, 0\) \/ windowEntries\.length/,
        /return \{ date: entry\.date, weight: average \}/
    ];
    required.forEach(pattern => {
        assert.match(primary, pattern);
        assert.match(source, pattern);
    });
    assert.doesNotMatch(source, /calculateSevenDayAverage/);
});

test("Weight and Carbs trend smoothing matches primary Weight Trend graph", () => {
    const required = [
        /const midpointX = \(current\.x \+ next\.x\) \/ 2/,
        /const midpointY = \(current\.y \+ next\.y\) \/ 2/,
        /quadraticCurveTo\(current\.x, current\.y, midpointX, midpointY\)/,
        /context\.lineTo\(points\.at\(-1\)\.x, points\.at\(-1\)\.y\)/
    ];
    required.forEach(pattern => {
        assert.match(primary, pattern);
        assert.match(source, pattern);
    });
    assert.match(source, /shadowColor = TREND_GREEN_GLOW/);
    assert.match(source, /lineWidth = 3/);
});

test("summary is dismissible by tapping outside it", () => {
    assert.match(source, /weight-carbs-chart-shell-v2/);
    assert.match(source, /const insideTooltip = event\.clientX >= rect\.left/);
    assert.match(source, /if \(insideTooltip\)/);
    assert.match(source, /clearSelection\(card\)/);
    assert.match(source, /event\.stopImmediatePropagation\(\)/);
    assert.match(source, /pointer-events:auto/);
    assert.match(source, /Tap anywhere outside the summary to close it/);
});

test("fresh PWA generation delivers authoritative renderer", () => {
    assert.match(sw, /CACHE_VERSION = "2026-08-31-62"/);
});
