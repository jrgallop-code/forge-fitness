import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Calories vs Expenditure follows the expenditure card range, not the calorie-summary range", async () => {
    const [state, comparison, summary, calorieStats] = await Promise.all([
        read("js/nutrition/energy-balance-state.js"),
        read("js/nutrition/tdee-calorie-expenditure-carousel.js"),
        read("js/nutrition/tdee-energy-balance-summary.js"),
        read("js/nutrition/calorie-stats.js")
    ]);

    assert.match(state, /ENERGY_BALANCE_WINDOW_DAYS = 7/);
    assert.match(state, /getEnergyBalanceWindow/);
    assert.match(comparison, /level_up_tdee_chart_range_v1/);
    assert.match(comparison, /"1w": \{ days: 7/);
    assert.match(comparison, /"6m": \{ days: 180/);
    assert.match(comparison, /range === "phase"/);
    assert.match(comparison, /range === "all"/);
    assert.match(comparison, /getEnergyBalanceState\(\{ startDate, endDate \}\)/);
    assert.match(comparison, /points: state\.visible/);
    assert.match(comparison, /\[data-tdee-chart-range\]/);
    assert.match(comparison, /levelup:tdee-range-changed/);
    assert.doesNotMatch(comparison, /level_up_calorie_stats_range_v1/);
    assert.doesNotMatch(comparison, /levelup:calorie-range-changed/);
    assert.match(summary, /level_up_tdee_chart_range_v1/);
    assert.match(summary, /levelup:tdee-range-changed/);
    assert.doesNotMatch(summary, /level_up_calorie_stats_range_v1/);
    assert.match(calorieStats, /queueMicrotask/);
    assert.match(calorieStats, /levelup:calorie-range-changed/);
    assert.match(calorieStats, /levelup:tdee-range-changed/);
    assert.match(summary, /windowStart: startDate \|\| state\.visibleStart/);
});

test("every timeframe keeps compact solid bars, readable dates, and missing-log details", async () => {
    const comparison = await read("js/nutrition/tdee-calorie-expenditure-carousel.js");

    assert.doesNotMatch(comparison, /context\.strokeRect/);
    assert.match(comparison, /const labelCount = 5/);
    assert.match(comparison, /index === 0 \? "left" : index === labelCount - 1 \? "right" : "center"/);
    assert.match(comparison, /Calories: \$\{intake !== null \? formatNumber\(intake\) : "Not logged"\}/);
    assert.doesNotMatch(comparison, /Uses the expenditure range selected above/);
});

test("the two energy slides resize to the active card instead of stretching to the taller slide", async () => {
    const swipe = await read("js/nutrition/tdee-expenditure-swipe-card.js");

    assert.match(swipe, /align-items: flex-start/);
    assert.match(swipe, /function syncHeight\(/);
    assert.match(swipe, /wrapper\.style\.height = `\$\{height\}px`/);
    assert.match(swipe, /new ResizeObserver/);
    assert.match(swipe, /transition: height \.2s ease/);
});

test("the PWA cache and import chain request the new Energy Balance implementation", async () => {
    const [worker, index, app, router, bridge] = await Promise.all([
        read("service-worker.js"),
        read("index.html"),
        read("js/app.js"),
        read("js/core/router.js"),
        read("js/progress/weight-carbs-chart.js")
    ]);

    assert.match(worker, /2026-09-13-315/);
    assert.match(index, /js\/app\.js\?v=history-editor-route-1/);
    assert.match(app, /router\.js\?v=history-editor-route-1/);
    assert.match(router, /weight-carbs-chart\.js\?v=energy-balance-range-3/);
    assert.match(router, /calorie-stats\.js\?v=energy-carousel-control-1/);
    assert.match(bridge, /tdee-calorie-expenditure-carousel\.js\?v=energy-balance-range-3/);
    assert.match(bridge, /tdee-energy-balance-summary\.js\?v=energy-balance-range-3/);
    assert.match(bridge, /tdee-expenditure-swipe-card\.js\?v=energy-card-height-1/);
});
