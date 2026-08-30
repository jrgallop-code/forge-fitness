import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { calculateMaintenanceEstimate } from "../js/nutrition/calculated-maintenance.js";
import { calculateDisplayWeightTrend } from "../js/core/weight-trend.js";

function key(offset) {
    const date = new Date("2026-08-08T12:00:00");
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
}

function foodHistory(days, calories) {
    return Object.fromEntries(Array.from({ length: days }, (_, index) => [key(index), [{ nutrition: { calories } }]]));
}

function weightHistory(days, startWeight, weeklyRate) {
    return Array.from({ length: days }, (_, index) => ({ date: key(index), weight: startWeight + weeklyRate * index / 7 }));
}

test("infers maintenance from intake and a losing weight trend", () => {
    const foodLog = foodHistory(21, 2300);
    const completedDays = Object.fromEntries(Object.keys(foodLog).map(date => [date, true]));
    const result = calculateMaintenanceEstimate({
        foodLog,
        completedDays,
        weights: weightHistory(21, 190, -.5),
        endDate: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.status, "established");
    assert.equal(result.maintenanceCalories, 2550);
    assert.equal(Math.round(result.energyCorrection), 250);
});

test("subtracts a gaining trend from average intake", () => {
    const foodLog = foodHistory(21, 2700);
    const completedDays = Object.fromEntries(Object.keys(foodLog).map(date => [date, true]));
    const result = calculateMaintenanceEstimate({
        foodLog,
        completedDays,
        weights: weightHistory(21, 180, .4),
        endDate: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.maintenanceCalories, 2500);
});

test("stays in learning until food and weight minimums are met", () => {
    const result = calculateMaintenanceEstimate({
        foodLog: foodHistory(1, 2400),
        weights: weightHistory(2, 180, 0),
        endDate: new Date("2026-08-29T12:00:00"),
        profileEstimate: 2450
    });
    assert.equal(result.status, "learning");
    assert.equal(result.maintenanceCalories, null);
    assert.equal(result.profileEstimate, 2450);
});

test("shows a usable early estimate from two food days and an established weight trend", () => {
    const result = calculateMaintenanceEstimate({
        foodLog: foodHistory(2, 2300),
        weights: weightHistory(10, 190, -.5),
        endDate: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.status, "early");
    assert.equal(result.label, "Early estimate");
    assert.equal(result.maintenanceCalories, 2550);
});

test("counts all logged days through yesterday even when legacy completion flags are partial", () => {
    const foodLog = foodHistory(21, 2400);
    const completedDays = Object.fromEntries(Object.keys(foodLog).slice(0, 1).map(date => [date, true]));
    const result = calculateMaintenanceEstimate({
        foodLog,
        completedDays,
        weights: weightHistory(21, 180, 0),
        endDate: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.foodDays, 21);
    assert.equal(result.averageIntake, 2400);
    assert.equal(result.status, "established");
});

test("stale completion metadata does not hide current logged food days", () => {
    const result = calculateMaintenanceEstimate({
        foodLog: foodHistory(2, 2400),
        completedDays: { "2026-07-01": true },
        weights: weightHistory(10, 180, 0),
        endDate: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.foodDays, 2);
    assert.equal(result.averageIntake, 2400);
    assert.equal(result.maintenanceCalories, 2400);
    assert.equal(result.status, "early");
});

test("uses the same canonical weekly rate as Weight Progress", () => {
    const weights = weightHistory(21, 180, .35);
    weights.push({ ...weights[8], weight: weights[8].weight + .2 });
    const endDate = new Date("2026-08-29T12:00:00");
    const result = calculateMaintenanceEstimate({
        foodLog: foodHistory(21, 2500),
        weights,
        endDate
    });
    const shared = calculateDisplayWeightTrend(weights, {
        endDate: "2026-08-28",
        windowDays: 21,
        minEntries: 3,
        minSpanDays: 5,
        fullEntries: 9
    });
    assert.equal(result.weightRateLbPerWeek, shared.weeklyChange);
});

test("includes today's latest weigh-in so TDEE matches the current Weight Progress rate", () => {
    const weights = weightHistory(21, 180, .35);
    weights.push({ date: "2026-08-29", weight: 182.1 });
    const result = calculateMaintenanceEstimate({
        foodLog: foodHistory(21, 2500),
        weights,
        endDate: new Date("2026-08-29T12:00:00")
    });
    const shared = calculateDisplayWeightTrend(weights, {
        endDate: "2026-08-29",
        windowDays: 21,
        minEntries: 3,
        minSpanDays: 5,
        fullEntries: 9
    });
    assert.equal(result.weightRateLbPerWeek, shared.weeklyChange);
    assert.equal(result.weightTrendEndDate, "2026-08-29");
    assert.equal(result.endDate, "2026-08-28");
});

test("Goals and Plan distinguishes formula TDEE from the Level Up trend calculation", async () => {
    const source = await readFile(new URL("../js/nutrition/unified-goals-calories.js", import.meta.url), "utf8");
    assert.match(source, /Body Profile TDEE Formula/);
    assert.match(source, /Level Up Calculated TDEE/);
    assert.match(source, /Use Level Up TDEE/);
    assert.match(source, /maintenanceDraft = String\(coordinated\?\.maintenanceCalories \?\? estimate\.maintenanceCalories\)/);
    assert.match(source, /input\.dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/);
    assert.match(source, /input\.value = maintenanceDraft/);
    assert.match(source, /Added to the shared weekly review/);
    assert.match(source, /Ask before adjusting — Recommended/);
    assert.match(source, /Adjust automatically/);
    assert.match(source, /Track only/);
});
