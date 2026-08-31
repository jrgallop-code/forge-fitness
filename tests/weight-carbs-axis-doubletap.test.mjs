import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const enhancement = readFileSync("js/progress/weight-carbs-interaction-enhancements.js", "utf8");

test("Weight and Carbs loads only the authoritative renderer plus local enhancements", () => {
    assert.match(entry, /initializeWeightCarbsChartV2/);
    assert.match(entry, /initializeWeightCarbsInteractionEnhancements/);
    assert.doesNotMatch(enhancement, /document\.addEventListener\(\"pointer/);
});

test("left axis unit follows the selected body-weight unit", () => {
    assert.match(enhancement, /massUnit\(\)/);
    assert.match(enhancement, /data-weight-axis-unit/);
    assert.match(enhancement, /attr\(data-weight-axis-unit\)/);
    assert.match(enhancement, /levelup:units-changed/);
});

test("double tap or double click clears selected day details locally", () => {
    assert.match(enhancement, /DOUBLE_TAP_MS/);
    assert.match(enhancement, /pointerup/);
    assert.match(enhancement, /dblclick/);
    assert.match(enhancement, /clearSelectedDay/);
    assert.doesNotMatch(enhancement, /preventDefault\(\)/);
    assert.doesNotMatch(enhancement, /stopImmediatePropagation\(\)/);
});
