import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { calculateMaintenanceEstimate, calculateMaintenanceHistory, getCalculatedMaintenanceHistory, stabilizeMaintenanceEstimate } from "../js/nutrition/calculated-maintenance.js";
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

test("rounds 2,621 intake plus a 127 calorie loss correction to 2,750 TDEE", () => {
    const result = calculateMaintenanceEstimate({
        foodLog: foodHistory(5, 2621),
        weights: weightHistory(12, 159, -.254),
        endDate: new Date("2026-08-29T12:00:00")
    });
    assert.equal(result.averageIntake, 2621);
    assert.equal(Math.round(result.energyCorrection), 127);
    assert.equal(result.maintenanceCalories, 2750);
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

test("holds the displayed TDEE for seven days even when the live estimate changes", () => {
    const snapshot = { reviewedAt: "2026-08-29", estimate: { maintenanceCalories: 2400, status: "preliminary", weightRateLbPerWeek: 0.37 } };
    const result = stabilizeMaintenanceEstimate({
        liveEstimate: { maintenanceCalories: 2475, status: "preliminary", foodDays: 8, weighIns: 10, weightSpanDays: 18, weightRateLbPerWeek: 0.21, energyCorrection: -105 },
        snapshot,
        today: new Date("2026-08-30T12:00:00")
    });
    assert.equal(result.estimate.maintenanceCalories, 2400);
    assert.equal(result.estimate.liveMaintenanceCalories, 2475);
    assert.equal(result.estimate.weightRateLbPerWeek, 0.21);
    assert.equal(result.estimate.energyCorrection, -105);
    assert.equal(result.estimate.daysUntilReview, 6);
});

test("first weekly snapshot preserves the previous day's estimate", () => {
    const result = stabilizeMaintenanceEstimate({
        liveEstimate: { maintenanceCalories: 2475, status: "early", foodDays: 3, weighIns: 10, weightSpanDays: 18 },
        previousEstimate: { maintenanceCalories: 2400, status: "early", foodDays: 3, weighIns: 9, weightSpanDays: 17 },
        snapshot: null,
        today: new Date("2026-08-30T12:00:00")
    });
    assert.equal(result.estimate.maintenanceCalories, 2400);
    assert.equal(result.estimate.liveMaintenanceCalories, 2475);
});

test("limits a building-confidence weekly TDEE update to 50 calories", () => {
    const snapshot = { reviewedAt: "2026-08-22", estimate: { maintenanceCalories: 2400, status: "preliminary" } };
    const result = stabilizeMaintenanceEstimate({
        liveEstimate: { maintenanceCalories: 2525, status: "preliminary", foodDays: 8, weighIns: 10, weightSpanDays: 18 },
        snapshot,
        today: new Date("2026-08-30T12:00:00")
    });
    assert.equal(result.estimate.maintenanceCalories, 2450);
    assert.equal(result.snapshot.reviewedAt, "2026-08-30");
});

test("limits a high-confidence weekly TDEE update to 100 calories", () => {
    const snapshot = { reviewedAt: "2026-08-22", estimate: { maintenanceCalories: 2400, status: "established" } };
    const result = stabilizeMaintenanceEstimate({
        liveEstimate: { maintenanceCalories: 2575, status: "established", foodDays: 18, weighIns: 15, weightSpanDays: 20 },
        snapshot,
        today: new Date("2026-08-30T12:00:00")
    });
    assert.equal(result.estimate.maintenanceCalories, 2500);
});

test("historical expenditure uses the same weekly holds and stability caps", () => {
    const foodLog = {
        ...foodHistory(21, 2300),
        ...Object.fromEntries(Array.from({ length: 21 }, (_, index) => [key(index + 21), [{ nutrition: { calories: 2800 } }]]))
    };
    const history = calculateMaintenanceHistory({
        foodLog,
        weights: weightHistory(42, 180, 0),
        endDate: new Date("2026-09-18T12:00:00")
    });
    const available = history.filter(point => Number.isFinite(point.maintenanceCalories));
    const changes = available
        .map((point, index) => index && point.maintenanceCalories !== available[index - 1].maintenanceCalories ? index : null)
        .filter(Number.isInteger);

    assert.ok(available.length > 21);
    assert.ok(changes.length > 0);
    changes.forEach((index, changeIndex) => {
        assert.ok(Math.abs(available[index].maintenanceCalories - available[index - 1].maintenanceCalories) <= 100);
        if (changeIndex) assert.ok(index - changes[changeIndex - 1] >= 7);
    });
});

test("historical expenditure never turns missing estimates into a zero-calorie line", () => {
    const history = calculateMaintenanceHistory({
        foodLog: { "2026-09-01": [{ nutrition: { calories: 2400 } }] },
        weights: [],
        endDate: new Date("2026-09-02T12:00:00")
    });

    assert.ok(history.length > 0);
    assert.ok(history.every(point => point.maintenanceCalories === null));
});

test("saved weekly expenditure snapshots remain available as historical anchors", () => {
    const history = calculateMaintenanceHistory({
        snapshotHistory: [
            { date: "2026-08-19", maintenanceCalories: 2400 },
            { reviewedAt: "2026-08-26", estimate: { maintenanceCalories: 2475 } }
        ],
        endDate: new Date("2026-08-26T12:00:00")
    });
    const recorded = history.filter(point => point.recorded);

    assert.deepEqual(recorded.map(point => [point.date, point.maintenanceCalories]), [
        ["2026-08-19", 2400],
        ["2026-08-26", 2475]
    ]);
});

test("historical expenditure recovers saved values from prior nutrition phase adjustments", () => {
    const originalStorage = globalThis.localStorage;
    const values = new Map([
        ["level_up_nutrition_phases", JSON.stringify([{ adjustments: [
            { date: "2026-08-19T14:00:00.000Z", maintenanceCalories: 2375 },
            { date: "2026-08-26T14:00:00.000Z", maintenanceCalories: 2450 }
        ] }])]
    ]);
    globalThis.localStorage = {
        getItem: name => values.get(name) ?? null,
        setItem: (name, value) => values.set(name, value)
    };

    try {
        const history = getCalculatedMaintenanceHistory(null, { startDate: "2026-08-19" });
        assert.deepEqual(history.filter(point => point.recorded).slice(0, 2).map(point => [point.date, point.maintenanceCalories]), [
            ["2026-08-19", 2375],
            ["2026-08-26", 2450]
        ]);
    } finally {
        globalThis.localStorage = originalStorage;
    }
});

test("waits for seven food days and a fourteen-day weight span before a weekly update", () => {
    const snapshot = { reviewedAt: "2026-08-20", estimate: { maintenanceCalories: 2400, status: "early" } };
    const result = stabilizeMaintenanceEstimate({
        liveEstimate: { maintenanceCalories: 2525, status: "preliminary", foodDays: 6, weighIns: 10, weightSpanDays: 18 },
        snapshot,
        today: new Date("2026-08-30T12:00:00")
    });
    assert.equal(result.estimate.maintenanceCalories, 2400);
    assert.equal(result.estimate.weeklyReviewDue, true);
    assert.equal(result.estimate.weeklyDataReady, false);
});

test("a target-synchronized legacy snapshot is immediately restored to the independent TDEE", () => {
    const result = stabilizeMaintenanceEstimate({
        liveEstimate: { maintenanceCalories: 2750, averageIntake: 2621, energyCorrection: 127, status: "early", foodDays: 5, weighIns: 12 },
        snapshot: { reviewedAt: "2026-09-01", estimate: { maintenanceCalories: 2675, reviewSynchronized: true } },
        today: new Date("2026-09-01T12:00:00")
    });
    assert.equal(result.snapshot.reviewedAt, "2026-09-01");
    assert.equal(result.estimate.maintenanceCalories, 2750);
    assert.equal(result.estimate.uncappedMaintenanceCalories, 2750);
    assert.equal(result.estimate.averageIntake, 2621);
    assert.equal(result.estimate.energyCorrection, 127);
    assert.equal(result.estimate.independentTdeeRestored, true);
    assert.equal(result.estimate.reviewSynchronized, undefined);
});

test("Goals and Plan distinguishes formula TDEE from the Level Up trend calculation", async () => {
    const source = await readFile(new URL("../js/nutrition/unified-goals-calories.js", import.meta.url), "utf8");
    assert.match(source, /Body Profile TDEE Formula/);
    assert.match(source, /Level Up Calculated TDEE/);
    assert.match(source, /Use for initial plan/);
    assert.match(source, /button\.hidden = Boolean\(active\)/);
    assert.match(source, /maintenanceDraft = String\(coordinated\?\.maintenanceCalories \?\? estimate\.maintenanceCalories\)/);
    assert.match(source, /input\.dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/);
    assert.match(source, /input\.value = maintenanceDraft/);
    assert.match(source, /Added to the shared weekly review/);
    assert.match(source, /Ask before adjusting — Recommended/);
    assert.match(source, /Adjust automatically/);
    assert.match(source, /Track only/);
});
