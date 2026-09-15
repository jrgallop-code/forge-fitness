import test from "node:test";
import assert from "node:assert/strict";
import {
    calculateDisplayWeightTrend,
    calculatePhaseMovingAverageTrend,
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

test("a scheduled phase check remains available without a weigh-in that day", () => {
    const result = calculatePhaseMovingAverageTrend([
        weight("2026-09-01", 180.0),
        weight("2026-09-03", 180.1),
        weight("2026-09-05", 180.2),
        weight("2026-09-06", 180.2),
        weight("2026-09-08", 180.3),
        weight("2026-09-10", 180.4),
        weight("2026-09-12", 180.5),
        weight("2026-09-13", 180.6)
    ], {
        phaseStartDate: "2026-09-01",
        asOfDate: "2026-09-14",
        startingTrendWeight: 180,
        rolling: true
    });

    assert.equal(result.status, "actual");
    assert.equal(result.phaseDay, 14);
    assert.equal(result.dataPhaseDay, 13);
    assert.equal(result.checkDay, 14);
    assert.equal(result.hasCheckDayWeighIn, false);
    assert.equal(result.awaitingNewWeighIn, false);
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
