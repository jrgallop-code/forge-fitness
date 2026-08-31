import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const entry = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const module = readFileSync("js/progress/weight-calorie-context.js", "utf8");

test("Weight entry keeps the authoritative renderer and loads calorie context", () => {
    assert.match(entry, /initializeWeightCarbsChartV2\(root\)/);
    assert.match(entry, /initializeWeightCarbsInteractionEnhancements\(root\)/);
    assert.match(entry, /initializeWeightCalorieContext\(root\)/);
    assert.match(entry, /weight-calorie-context\.js\?v=weight-calorie-context-1/);
    assert.doesNotMatch(entry, /weight-secondary-context/);
});

test("Weight Trend points still expose actual and seven-day trend snapshots", () => {
    assert.match(module, /#weight-trend-chart/);
    assert.match(module, /selectWeightPoint/);
    assert.match(module, /<b>Weight<\/b>/);
    assert.match(module, /<b>7-day trend<\/b>/);
    assert.match(module, /massUnit\(\)/);
    assert.match(module, /displayMass\(/);
    assert.doesNotMatch(module, /document\.addEventListener\("pointer/);
});

test("third Weight carousel graph is Calories, not Sodium", () => {
    assert.match(module, /data-weight-graph-slide-v2=\"calories\"/);
    assert.match(module, /dataset\.weightGraphPageV2 = "2"/);
    assert.match(module, /Weight \+ Calories/);
    assert.match(module, /repeat\(3,minmax\(0,1fr\)\)/);
    assert.doesNotMatch(module, /Weight \+ Sodium/);
    assert.equal(existsSync("js/progress/weight-secondary-context.js"), false);
});

test("calories are read directly from logged nutrition snapshots", () => {
    assert.match(module, /entry\?\.nutrition\?\.calories/);
    assert.match(module, /reduce\(\(sum, entry\)/);
    assert.match(module, /calories: Number\.isFinite\(calories\) \? calories : null/);
});

test("Calories use a dedicated red accent and kcal axis", () => {
    assert.match(module, /CALORIE_COLOR = "#ff5a5f"/);
    assert.match(module, /fillText\("kcal"/);
    assert.match(module, /is-calories/);
    assert.match(module, /is-calorie-value/);
});

test("Calories tooltip shows weight, trend, and calorie values", () => {
    assert.match(module, /No weight logged/);
    assert.match(module, /trend`|trend"/);
    assert.match(module, /Math\.round\(day\.calories\).*kcal/s);
});
