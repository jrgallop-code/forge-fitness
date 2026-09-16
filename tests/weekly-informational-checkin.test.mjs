import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const status = await readFile(new URL("../js/nutrition/weekly-check-in-status.js", import.meta.url), "utf8");
const calendar = await readFile(new URL("../js/nutrition/check-in-calendar.js", import.meta.url), "utf8");
const mode = await readFile(new URL("../js/nutrition/nutrition-mode-ui.js", import.meta.url), "utf8");

test("weekly check-in status separates the informational and actionable milestones", () => {
    assert.match(status, /FIRST_INFORMATIONAL_CHECK_DAY = 7/);
    assert.match(status, /FIRST_CALORIE_REVIEW_DAY = 14/);
    assert.match(status, /state = "informational"/);
    assert.match(status, /Week 1 check-in/);
    assert.match(status, /This check-in is informational/);
    assert.match(status, /first calorie review Day 14/);
    assert.doesNotMatch(status, /reviewReady: state === "informational"/);
});

test("the activity calendar includes the Day 7 informational milestone", () => {
    assert.match(calendar, /FIRST_INFORMATIONAL_CHECK_DAY = 7/);
    assert.match(calendar, /Week 1 informational check-in/);
    assert.match(calendar, /checkDay: FIRST_INFORMATIONAL_CHECK_DAY/);
});

test("nutrition settings explain the weekly cadence accurately", () => {
    assert.match(mode, /first weekly check-in is informational on Day 7/);
    assert.match(mode, /first calorie review is Day 14, then every 7 days/);
});
