import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shim = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const source = readFileSync("js/progress/weight-chart-carousel.js", "utf8");
const router = readFileSync("js/core/router.js", "utf8");

test("Weight and Carbs renders inside Weight Progress", () => {
    assert.match(router, /initializeWeightCarbsChart/);
    assert.match(shim, /weight-chart-carousel\.js/);
    assert.match(source, /#weight-progress/);
    assert.match(source, /\.weight-chart-card/);
    assert.match(source, /Weight &amp; Carbs/);
    assert.doesNotMatch(source, /data-progress-calorie-stats|calorie-stats-page/);
});

test("Weight graph is a two-page swipe carousel", () => {
    assert.match(source, /weight-graph-carousel-track/);
    assert.match(source, /scroll-snap-type:x mandatory/);
    assert.match(source, /data-weight-graph-slide = "trend"/);
    assert.match(source, /data-weight-graph-slide = "carbs"/);
    assert.match(source, /Weight \+ Carbs/);
});

test("both graph views share the existing Weight timeframe", () => {
    assert.match(source, /SHARED_RANGE_KEY = "level_up_weight_chart_range"/);
    for (const range of ["1w", "1m", "3m", "6m", "phase", "all"]) assert.match(source, new RegExp(range));
    assert.match(source, /button\[data-weight-chart-range\]/);
    assert.match(source, /syncSharedRangeControl/);
    assert.doesNotMatch(source, /level_up_weight_carbs_range_v1|data-weight-carbs-range/);
});

test("Weight and Carbs keeps shared trend, units and macro colour", () => {
    assert.match(source, /calculateSevenDayAverage/);
    assert.match(source, /normalizeWeightEntries/);
    assert.match(source, /displayMass/);
    assert.match(source, /massUnit/);
    assert.match(source, /const CARB_COLOR = "#4fa8ff"/);
});

test("secondary graph matches Weight graph height and supports detail interaction", () => {
    assert.match(source, /width <= 520 \? 330 : 380/);
    assert.match(source, /pointerdown/);
    assert.match(source, /pointermove/);
    assert.match(source, /setPointerCapture/);
    assert.match(source, /setLineDash\(\[4, 4\]\)/);
    assert.match(source, /function clearSelection\(\)/);
});

test("contextual analysis remains available", () => {
    assert.match(source, /WEIGHT &amp; CARB ANALYSIS/);
    assert.match(source, /Building a clearer pattern/);
    assert.match(source, /Possible water retention/);
    assert.match(source, /Higher carbs, weight near trend/);
    assert.match(source, /Weight elevated without a clear carb signal/);
    assert.match(source, /No strong carb-related fluctuation/);
    assert.doesNotMatch(source, /setCurrentCalories|saveNutritionPhase|targetCalories/);
});
