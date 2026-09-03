import test from "node:test";
import assert from "node:assert/strict";
import { calculateDisplayWeightTrend } from "../js/core/weight-trend.js";

function weight(date, value) {
    return { date, weight: value };
}

test("display trend becomes preliminary after three weigh-ins spanning five days", () => {
    const result = calculateDisplayWeightTrend([
        weight("2026-08-20", 180.0),
        weight("2026-08-22", 179.6),
        weight("2026-08-24", 179.2)
    ]);

    assert.equal(result.status, "preliminary");
    assert.equal(result.entries, 3);
    assert.equal(result.spanDays, 5);
    assert.ok(Number.isFinite(result.weeklyChange));
    assert.ok(result.weeklyChange < 0);
});

test("display trend becomes established only with stronger history", () => {
    const result = calculateDisplayWeightTrend([
        weight("2026-08-10", 181.0),
        weight("2026-08-12", 180.7),
        weight("2026-08-15", 180.3),
        weight("2026-08-18", 180.0),
        weight("2026-08-21", 179.6),
        weight("2026-08-23", 179.3)
    ]);

    assert.equal(result.status, "actual");
    assert.equal(result.entries, 6);
    assert.equal(result.spanDays, 14);
    assert.ok(Number.isFinite(result.weeklyChange));
});

test("live display ignores a future-dated test weigh-in", () => {
    const realWeights = [
        weight("2026-08-10", 181.0),
        weight("2026-08-12", 180.7),
        weight("2026-08-15", 180.3),
        weight("2026-08-18", 180.0),
        weight("2026-08-21", 179.6),
        weight("2026-08-23", 179.3)
    ];

    const result = calculateDisplayWeightTrend([
        ...realWeights,
        weight("2999-01-01", 100.0)
    ], { endDate: "2999-01-01" });

    assert.equal(result.status, "actual");
    assert.equal(result.windowEnd, "2026-08-23");
    assert.equal(result.entries, realWeights.length);
    assert.ok(Number.isFinite(result.weeklyChange));
});

test("display trend still requires enough real observations", () => {
    const result = calculateDisplayWeightTrend([
        weight("2026-08-20", 180.0),
        weight("2026-08-24", 179.2)
    ]);

    assert.equal(result.status, "insufficient");
    assert.equal(result.weeklyChange, null);
});
