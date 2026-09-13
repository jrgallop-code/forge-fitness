import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Calories vs Expenditure follows the visible 7D, 4W and 12W calorie timeframe", async () => {
    const [state, comparison, summary, calorieStats] = await Promise.all([
        read("js/nutrition/energy-balance-state.js"),
        read("js/nutrition/tdee-calorie-expenditure-carousel.js"),
        read("js/nutrition/tdee-energy-balance-summary.js"),
        read("js/nutrition/calorie-stats.js")
    ]);

    assert.match(state, /ENERGY_BALANCE_WINDOW_DAYS = 7/);
    assert.match(state, /getEnergyBalanceWindow/);
    assert.match(comparison, /level_up_calorie_stats_range_v1/);
    assert.match(comparison, /\[7, 28, 84\]\.includes\(requested\)/);
    assert.match(comparison, /getEnergyBalanceWindow\(endDate, days\)/);
    assert.match(comparison, /ENERGY BALANCE · \$\{rangeLabel\(state\.days\)\}/);
    assert.match(comparison, /getEnergyBalanceState\(window\)/);
    assert.match(comparison, /points: state\.visible/);
    assert.match(comparison, /\[data-calorie-stats-range\]/);
    assert.match(comparison, /levelup:calorie-range-changed/);
    assert.match(summary, /level_up_calorie_stats_range_v1/);
    assert.match(summary, /levelup:calorie-range-changed/);
    assert.match(calorieStats, /queueMicrotask/);
    assert.match(calorieStats, /levelup:calorie-range-changed/);
    assert.match(summary, /getEnergyBalanceWindow\(endDate, days\)/);
    assert.match(summary, /windowStart: window\.startDate/);
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

    assert.match(worker, /2026-09-13-311/);
    assert.match(index, /js\/app\.js\?v=energy-balance-range-2/);
    assert.match(app, /router\.js\?v=energy-balance-range-2/);
    assert.match(router, /weight-carbs-chart\.js\?v=energy-balance-range-2/);
    assert.match(router, /calorie-stats\.js\?v=calorie-range-control-1/);
    assert.match(bridge, /tdee-calorie-expenditure-carousel\.js\?v=energy-balance-range-2/);
    assert.match(bridge, /tdee-energy-balance-summary\.js\?v=energy-balance-range-2/);
    assert.match(bridge, /tdee-expenditure-swipe-card\.js\?v=energy-card-height-1/);
});
