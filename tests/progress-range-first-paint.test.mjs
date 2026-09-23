import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const trainingRange = await readFile(new URL("../js/progress/training-analytics-range.js", import.meta.url), "utf8");
const weightStyles = await readFile(new URL("../css/weight-chart-polish.css", import.meta.url), "utf8");

test("training timeframe styles load with the initial document", () => {
    assert.match(html, /<link rel="stylesheet" href="css\/training-analytics-range\.css\?v=training-analytics-range-2" data-training-analytics-range-style>/);
    assert.ok(
        html.indexOf("css/training-analytics-range.css") < html.indexOf("js/progress/training-analytics-range.js"),
        "timeframe CSS must load before its enhancement module"
    );
});

test("training timeframe is mounted before the next paint", () => {
    assert.match(trainingRange, /new MutationObserver\(\(\) => \{[\s\S]*?ensureControls\(\);[\s\S]*?\}\)\.observe\(content/);
    assert.doesNotMatch(trainingRange, /new MutationObserver\(queueSetup\)/);
});

test("weight timeframe geometry is available before its runtime enhancer", () => {
    assert.match(html, /<link rel="stylesheet" href="css\/weight-chart-polish\.css\?v=progress-range-first-paint-1" data-weight-chart-range-style>/);
    assert.match(weightStyles, /\.weight-chart-range-control\s*\{[\s\S]*?display:\s*grid/);
    assert.match(weightStyles, /\.weight-chart-range-control button\s*\{[\s\S]*?min-height:\s*32px/);
    assert.match(weightStyles, /button\[aria-pressed="true"\]/);
});
