import test from "node:test";
import assert from "node:assert/strict";
import {
    calculateDisplayWeightTrend,
    calculateTrendWeightSeries,
    calculateVisibleWeightTrend,
    interpolateWeightEntries
} from "../js/core/weight-trend.js";

const weight = (date, value) => ({ date, weight: value });

const establishedWeights = [
    weight("2026-08-10", 181.0),
    weight("2026-08-12", 180.7),
    weight("2026-08-15", 180.3),
    weight("2026-08-18", 180.0),
    weight("2026-08-21", 179.6),
    weight("2026-08-23", 179.3)
];

test("interpolates only between real weigh-ins", () => {
    const series = interpolateWeightEntries([
        weight("2026-08-20", 180.0),
        weight("2026-08-23", 179.4)
    ]);

    assert.deepEqual(series.map(point => [point.date, Number(point.weight.toFixed(1)), point.actual]), [
        ["2026-08-20", 180.0, true],
        ["2026-08-21", 179.8, false],
        ["2026-08-22", 179.6, false],
        ["2026-08-23", 179.4, true]
    ]);
    assert.equal(series.at(-1).date, "2026-08-23");
});

test("Trend Weight uses 25 percent new data and 75 percent prior trend", () => {
    const series = calculateTrendWeightSeries([
        weight("2026-08-20", 180.0),
        weight("2026-08-21", 179.8)
    ]);

    assert.equal(Number(series[0].weight.toFixed(2)), 180.00);
    assert.equal(Number(series[1].weight.toFixed(2)), 179.95);
});

test("visible weekly pace is calculated from the smoothed trend series", () => {
    const result = calculateVisibleWeightTrend(establishedWeights);

    assert.equal(result.status, "actual");
    assert.equal(result.entries, 6);
    assert.equal(result.spanDays, 14);
    assert.ok(result.series.length > establishedWeights.length);
    assert.ok(Number.isFinite(result.trendWeight));
    assert.ok(Number.isFinite(result.weeklyChange));
    assert.ok(result.weeklyChange < 0);
});

test("three real weigh-ins spanning five days unlock a preliminary visible trend", () => {
    const result = calculateVisibleWeightTrend([
        weight("2026-08-20", 180.0),
        weight("2026-08-22", 179.7),
        weight("2026-08-24", 179.3)
    ]);

    assert.equal(result.status, "preliminary");
    assert.equal(result.entries, 3);
    assert.equal(result.spanDays, 5);
    assert.ok(Number.isFinite(result.weeklyChange));
});

test("future-dated test weights do not affect live Trend Weight", () => {
    const withFuture = [...establishedWeights, weight("2999-01-01", 100.0)];
    const result = calculateVisibleWeightTrend(withFuture, { endDate: "2999-01-01" });

    assert.equal(result.status, "actual");
    assert.equal(result.windowEnd, "2026-08-23");
    assert.equal(result.entries, establishedWeights.length);
    assert.ok(result.trendWeight > 170);
});

test("TDEE regression path remains separate from visible Trend Weight", () => {
    const noisy = [
        weight("2026-08-10", 180.0),
        weight("2026-08-12", 182.0),
        weight("2026-08-15", 179.5),
        weight("2026-08-18", 181.0),
        weight("2026-08-21", 179.0),
        weight("2026-08-23", 178.8)
    ];
    const raw = calculateDisplayWeightTrend(noisy);
    const visible = calculateVisibleWeightTrend(noisy);

    assert.ok(Number.isFinite(raw.weeklyChange));
    assert.ok(Number.isFinite(visible.weeklyChange));
    assert.notEqual(Number(raw.weeklyChange.toFixed(4)), Number(visible.weeklyChange.toFixed(4)));
});
