import assert from "node:assert/strict";
import test from "node:test";
import { calculateMaintenanceEstimate } from "../js/nutrition/calculated-maintenance.js";

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
        foodLog: foodHistory(7, 2400),
        weights: weightHistory(4, 180, 0),
        endDate: new Date("2026-08-29T12:00:00"),
        profileEstimate: 2450
    });
    assert.equal(result.status, "learning");
    assert.equal(result.maintenanceCalories, null);
    assert.equal(result.profileEstimate, 2450);
});

test("ignores logged days that were not marked complete once completion tracking is used", () => {
    const foodLog = foodHistory(21, 2400);
    const completedDays = Object.fromEntries(Object.keys(foodLog).slice(0, 8).map(date => [date, true]));
    const result = calculateMaintenanceEstimate({
        foodLog,
        completedDays,
        weights: weightHistory(21, 180, 0),
        endDate: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.foodDays, 8);
    assert.equal(result.status, "learning");
});
