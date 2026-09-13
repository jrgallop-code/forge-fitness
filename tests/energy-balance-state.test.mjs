import test from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
};
globalThis.window = { addEventListener() {}, dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {};

const { summarizeEnergyRange } = await import("../js/nutrition/energy-balance-state.js?test=shared-seven-day-energy");

test("one seven-day state produces the expenditure average and calorie balance used by both graphs", () => {
    const dates = ["2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12"];
    const expenditure = [2775, 2750, 2750, 2725, 2700, 2675, 2675];
    const intake = [2900, 2750, 2900, 2450, 2925, 2825, 2815];
    const history = dates.map((date, index) => ({ date, liveMaintenanceCalories: expenditure[index] }));
    const foodLog = Object.fromEntries(dates.map((date, index) => [date, [{ nutrition: { calories: intake[index] } }]]));
    const completedDays = Object.fromEntries(dates.map(date => [date, true]));

    const state = summarizeEnergyRange({
        history,
        foodLog,
        completedDays,
        requestedStart: dates[0],
        endDate: dates.at(-1),
        today: dates.at(-1)
    });

    assert.equal(state.points.length, 7);
    assert.equal(state.matched.length, 7);
    assert.equal(Math.round(state.averageVisibleExpenditure), 2721);
    assert.equal(state.averageExpenditure, state.averageVisibleExpenditure);
    assert.equal(Math.round(state.averageIntake), 2795);
    assert.equal(Math.round(state.balance), 74);
});

test("an unfinished current day is excluded from both calorie and matched expenditure averages", () => {
    const state = summarizeEnergyRange({
        history: [
            { date: "2026-09-11", liveMaintenanceCalories: 2700 },
            { date: "2026-09-12", liveMaintenanceCalories: 2675 }
        ],
        foodLog: {
            "2026-09-11": [{ nutrition: { calories: 2800 } }],
            "2026-09-12": [{ nutrition: { calories: 900 } }]
        },
        completedDays: { "2026-09-11": true },
        requestedStart: "2026-09-11",
        endDate: "2026-09-12",
        today: "2026-09-12"
    });

    assert.equal(state.visible.length, 2);
    assert.equal(state.matched.length, 1);
    assert.equal(state.averageIntake, 2800);
    assert.equal(state.averageExpenditure, 2700);
    assert.equal(state.balance, 100);
});
