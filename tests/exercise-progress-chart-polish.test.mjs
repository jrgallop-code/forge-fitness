import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const chartSource = await readFile(new URL("../js/progress/exercise-progress-v2.js", import.meta.url), "utf8");
const chartStyles = await readFile(new URL("../css/exercise-progress-chart-polish.css", import.meta.url), "utf8");

test("session volume and estimated 1RM use the selected theme accent", () => {
    assert.match(chartSource, /exercise-progress-accent-fill/);
    assert.match(chartSource, /stop-color="var\(--accent\)" stop-opacity="\.28"/);
    assert.match(chartSource, /stroke="var\(--accent\)" stroke-width="3"/);
    assert.match(chartSource, /Array\.from\(\{ length: 3 \}/);
    assert.match(chartSource, /selectedMetric === "volume"/);
});

test("latest strength point receives a theme accent halo inside a polished chart surface", () => {
    assert.match(chartSource, /r="8" fill="var\(--accent\)" fill-opacity="\.18"/);
    assert.match(chartStyles, /linear-gradient\(155deg/);
    assert.match(chartStyles, /var\(--accent-glow/);
});
