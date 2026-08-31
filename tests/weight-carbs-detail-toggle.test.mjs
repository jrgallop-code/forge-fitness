import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const toggle = readFileSync("js/progress/weight-carbs-detail-toggle.js", "utf8");

test("Weight and Carbs wires the detail toggle after the v2 renderer", () => {
    assert.match(entry, /initializeWeightCarbsChartV2\(root\)/);
    assert.match(entry, /initializeWeightCarbsDetailToggle\(root\)/);
    assert.ok(entry.indexOf("initializeWeightCarbsChartV2(root)") < entry.indexOf("initializeWeightCarbsDetailToggle(root)"));
});

test("open day details can be dismissed from the summary or graph", () => {
    assert.match(toggle, /tooltip\.contains\(event\.target\)/);
    assert.match(toggle, /shell\?\.contains\(event\.target\)/);
    assert.match(toggle, /clearViaExistingRangeControl/);
    assert.match(toggle, /event\.stopImmediatePropagation\(\)/);
});

test("dismissal reuses the existing range-control clear path", () => {
    assert.match(toggle, /data-weight-chart-range/);
    assert.match(toggle, /selectedRange\.click\(\)/);
    assert.match(toggle, /Tap the summary or graph again to close details/);
});
