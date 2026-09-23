import assert from "node:assert/strict";
import test from "node:test";
import { calculateVisibleWeightTrend } from "../js/core/weight-trend.js";
import { getActivePhaseMetrics } from "../js/nutrition/nutrition-phase.js";

function dateOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function withWeights(weights, callback) {
    const previous = globalThis.localStorage;
    globalThis.localStorage = {
        getItem(key) { return key === "forge_weight_entries" ? JSON.stringify(weights) : null; }
    };
    try { callback(); }
    finally { globalThis.localStorage = previous; }
}

test("week one check-in uses the same current rate as the Progress carousel after a phase change", () => {
    const weights = [-17, -14, -11, -8, -6, -4, -2, 0].map((offset, index) => ({
        date: dateOffset(offset), weight: 160 + index * 0.23
    }));
    const phase = { startDate: dateOffset(-6), targetWeeklyRate: 0.5, startingTrendWeight: 160 };
    withWeights(weights, () => {
        const checkIn = getActivePhaseMetrics(phase, { rolling: true });
        const carousel = calculateVisibleWeightTrend(weights, { endDate: dateOffset(0) });
        assert.equal(checkIn.trend.phaseDay, 7);
        assert.equal(checkIn.actualRateLbPerWeek, carousel.weeklyChange);
        assert.equal(checkIn.trend.status, carousel.status);
    });
});

test("check-in does not substitute a phase rate when the carousel has no rate", () => {
    const weights = [
        { date: dateOffset(-10), weight: 160 },
        { date: dateOffset(-1), weight: 161 }
    ];
    const phase = { startDate: dateOffset(-6), targetWeeklyRate: 0.5, startingTrendWeight: 160 };
    withWeights(weights, () => {
        const checkIn = getActivePhaseMetrics(phase, { rolling: true });
        const carousel = calculateVisibleWeightTrend(weights, { endDate: dateOffset(-1) });
        assert.equal(carousel.weeklyChange, null);
        assert.equal(checkIn.actualRateLbPerWeek, null);
        assert.equal(checkIn.trend.status, "insufficient");
    });
});
