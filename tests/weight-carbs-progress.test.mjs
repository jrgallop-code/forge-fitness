import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const router = readFileSync("js/core/router.js", "utf8");

test("Weight and Carbs is wired only into Progress nutrition analytics", () => {
    assert.match(router, /initializeWeightCarbsChart/);
    assert.match(router, /safeInitialize\("Weight and carbs chart"/);
    assert.match(source, /data-progress-calorie-stats/);
    assert.match(source, /Weight &amp; Carbs/);
    assert.doesNotMatch(source, /data-calories-hub/);
});

test("Weight and Carbs uses shared trend, units, and the existing carb color", () => {
    assert.match(source, /calculateSevenDayAverage/);
    assert.match(source, /normalizeWeightEntries/);
    assert.match(source, /displayMass/);
    assert.match(source, /massUnit/);
    assert.match(source, /const CARB_COLOR = "#4fa8ff"/);
});

test("Weight and Carbs supports the four requested ranges and mobile scrubbing", () => {
    assert.match(source, /RANGE_OPTIONS = \[7, 14, 30, 90\]/);
    assert.match(source, /pointerdown/);
    assert.match(source, /pointermove/);
    assert.match(source, /setPointerCapture/);
    assert.match(source, /nearestDistance/);
    assert.match(source, /setLineDash\(\[4, 4\]\)/);
});

test("selected day shows weight, carbs, trend difference, and recent carb comparison", () => {
    assert.match(source, /g carbs/);
    assert.match(source, /vs trend/);
    assert.match(source, /g vs recent average/);
    assert.match(source, /selectedDate = available\.at\(-1\)/);
});

test("water-retention insight remains cautious and cannot alter calorie targets", () => {
    assert.match(source, /Possible water retention/);
    assert.match(source, /may reflect glycogen and associated water/);
    assert.match(source, /Sodium, hydration, food volume and training/);
    assert.doesNotMatch(source, /definitely water/i);
    assert.doesNotMatch(source, /You gained .* water/i);
    assert.doesNotMatch(source, /setCurrentCalories|saveNutritionPhase|targetCalories/);
});

test("missing-data and education states are present", () => {
    assert.match(source, /More data needed/);
    assert.match(source, /No weight logged/);
    assert.match(source, /No carbs logged/);
    assert.match(source, /Why carbohydrates can affect scale weight/);
    assert.match(source, /bowel contents and training-related inflammation/);
});
