import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const enhancement = readFileSync("js/progress/weight-carbs-interaction-enhancements.js", "utf8");

test("Weight and Carbs enhancement stays local to the graph", () => {
    assert.match(entry, /initializeWeightCarbsInteractionEnhancements\(root\)/);
    assert.match(enhancement, /canvas\.addEventListener\("pointerup"/);
    assert.match(enhancement, /canvas\.addEventListener\("dblclick"/);
    assert.doesNotMatch(enhancement, /document\.addEventListener\("pointer/);
    assert.doesNotMatch(enhancement, /preventDefault\(\)/);
    assert.doesNotMatch(enhancement, /stopPropagation\(\)/);
});

test("axis label follows selected body-weight units", () => {
    assert.match(enhancement, /shell\.dataset\.weightAxisUnit = massUnit\(\)/);
    assert.match(enhancement, /content: attr\(data-weight-axis-unit\)/);
});
