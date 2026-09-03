import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const entry = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const carbs = readFileSync("js/progress/weight-chart-carousel-v3.js", "utf8");
const calories = readFileSync("js/progress/weight-calorie-context-v2.js", "utf8");

test("Weight context entry loads the smoothed carbs and calorie renderers", () => {
    assert.match(entry, /initializeWeightCarbsChartV3\(root\)/);
    assert.match(entry, /initializeWeightCarbsInteractionEnhancements\(root\)/);
    assert.match(entry, /initializeWeightCalorieContextV2\(root\)/);
    assert.match(entry, /smoothed-visible-trend-1/);
    assert.doesNotMatch(entry, /weight-secondary-context/);
});

test("Weight and Carbs uses shared smoothed Trend Weight", () => {
    assert.match(carbs, /calculateTrendWeightSeries/);
    assert.match(carbs, /Same smoothed Trend Weight/);
    assert.match(carbs, />Trend Weight<\/span>/);
    assert.match(carbs, /versus Trend Weight/);
    assert.doesNotMatch(carbs, /7-day trend/);
});

test("third Weight carousel graph is Calories and uses shared Trend Weight", () => {
    assert.match(calories, /data-weight-graph-slide-v2=\"calories\"/);
    assert.match(calories, /dataset\.weightGraphPageV2 = "2"/);
    assert.match(calories, /Weight \+ Calories/);
    assert.match(calories, /calculateTrendWeightSeries/);
    assert.match(calories, /Trend Weight/);
    assert.doesNotMatch(calories, /7-day trend/);
    assert.equal(existsSync("js/progress/weight-secondary-context.js"), false);
});

test("calories are read directly from logged nutrition snapshots", () => {
    assert.match(calories, /entry\?\.nutrition\?\.calories/);
    assert.match(calories, /reduce\(\(sum, entry\)/);
    assert.match(calories, /calories: Number\.isFinite\(calories\) \? calories : null/);
});

test("Calories use a dedicated red accent and kcal axis", () => {
    assert.match(calories, /CALORIE_COLOR = "#ff5a5f"/);
    assert.match(calories, /fillText\("kcal"/);
    assert.match(calories, /is-calories/);
});

test("Calories tooltip shows raw weight, Trend Weight and calorie values", () => {
    assert.match(calories, /<b>Weight<\/b>/);
    assert.match(calories, /<b>Trend Weight<\/b>/);
    assert.match(calories, /<b>Calories<\/b>/);
    assert.match(calories, /Math\.round\(day\.calories\)/);
});
