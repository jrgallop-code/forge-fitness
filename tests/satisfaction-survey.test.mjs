import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { determineSatisfactionSurveyTrigger } from "../js/feedback/satisfaction-survey.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("survey waits for meaningful use and selects the first reached milestone", () => {
    assert.equal(determineSatisfactionSurveyTrigger({ workouts: 2, foodDays: 4, activeDays: 6 }), "");
    assert.equal(determineSatisfactionSurveyTrigger({ workouts: 3 }), "workout_milestone");
    assert.equal(determineSatisfactionSurveyTrigger({ foodDays: 5 }), "food_log_milestone");
    assert.equal(determineSatisfactionSurveyTrigger({ activeDays: 7 }), "active_day_milestone");
});

test("survey is five-star, optional, infrequent, and explains the free app mission", async () => {
    const source = await read("js/feedback/satisfaction-survey.js");
    assert.match(source, /\[1,2,3,4,5\]/);
    assert.match(source, /Anything you’d like us to improve\? <small>Optional<\/small>/);
    assert.match(source, /free, high-quality app/);
    assert.match(source, /30 \* DAY_MS/);
    assert.match(source, /90 \* DAY_MS/);
    assert.match(source, /365 \* DAY_MS/);
    assert.match(source, /submissionsLastYear \|\| 0\) >= 3/);
});

test("feedback is stored server-side and returned only through owner analytics", async () => {
    const [worker, migration, admin] = await Promise.all([
        read("cloud/src/index.js"),
        read("cloud/migrations/0012_satisfaction_feedback.sql"),
        read("js/analytics/admin-analytics.js")
    ]);
    assert.match(worker, /\/v1\/feedback/);
    assert.match(worker, /isAdminUser\(user, env\)/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS satisfaction_feedback/);
    assert.match(migration, /CHECK \(rating BETWEEN 1 AND 5\)/);
    assert.match(admin, /App satisfaction/);
    assert.match(admin, /feedbackSummary/);
});
