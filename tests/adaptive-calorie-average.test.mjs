import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const storage = new Map();
globalThis.localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {
    constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
    }
};

const { FOOD_LOG_KEY, getLoggedCalorieWindow } = await import("../js/nutrition/food-log-data.js");

function foodDay(calories) {
    return [{ nutrition: { calories } }];
}

test("adaptive calorie intake averages only logged days in the matching seven-day window", () => {
    storage.clear();
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify({
        "2026-08-20": foodDay(5000),
        "2026-08-21": foodDay(2000),
        "2026-08-23": foodDay(2100),
        "2026-08-25": foodDay(2200),
        "2026-08-27": foodDay(2300),
        "2026-08-28": foodDay(6000)
    }));

    const result = getLoggedCalorieWindow({
        startDate: "2026-08-21",
        endDate: "2026-08-27",
        minLoggedDays: 4
    });

    assert.equal(result.totalDays, 7);
    assert.equal(result.loggedDays, 4);
    assert.equal(result.averageCalories, 2150);
    assert.equal(result.sufficient, true);
});

test("adaptive calories fall back when fewer than four days are logged", () => {
    storage.clear();
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify({
        "2026-08-21": foodDay(2000),
        "2026-08-23": foodDay(2100),
        "2026-08-27": foodDay(2200)
    }));

    const result = getLoggedCalorieWindow({
        startDate: "2026-08-21",
        endDate: "2026-08-27",
        minLoggedDays: 4
    });

    assert.equal(result.loggedDays, 3);
    assert.equal(result.averageCalories, 2100);
    assert.equal(result.sufficient, false);
});

test("the shared coach requires a usable logged window and refreshes after food logging", async () => {
    const source = await readFile(new URL("../js/nutrition/calories-full-adjustment-display.js", import.meta.url), "utf8");
    assert.match(source, /getLoggedCalorieWindow/);
    assert.match(source, /buildSharedRecommendation\(metrics, phase\)/);
    assert.match(source, /buildCoordinatedWeeklyUpdate/);
    assert.match(source, /WEEKLY_ADJUSTMENT_CAP/);
    assert.match(source, /levelup:food-log-updated/);
    assert.match(source, /aligned 7-day intake window/);
    assert.match(source, /falls back to the current target/);
});
