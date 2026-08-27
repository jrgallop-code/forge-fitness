import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const chartSource = await readFile(new URL("../js/progress/exercise-progress-v2.js", import.meta.url), "utf8");
const chartStyles = await readFile(new URL("../css/exercise-progress-chart-polish.css", import.meta.url), "utf8");

test("session volume and estimated 1RM share the faded Level Up red chart", () => {
    assert.match(chartSource, /exercise-progress-red-fill/);
    assert.match(chartSource, /stop-color="#ff3139" stop-opacity="\.28"/);
    assert.match(chartSource, /stroke="#ff3139" stroke-width="3"/);
    assert.match(chartSource, /Array\.from\(\{ length: 3 \}/);
    assert.match(chartSource, /selectedMetric === "volume"/);
});

test("latest strength point receives a red halo inside a polished chart surface", () => {
    assert.match(chartSource, /r="8" fill="#ff3139" fill-opacity="\.18"/);
    assert.match(chartStyles, /linear-gradient\(155deg/);
    assert.match(chartStyles, /rgba\(255,49,57,\.075\)/);
});
