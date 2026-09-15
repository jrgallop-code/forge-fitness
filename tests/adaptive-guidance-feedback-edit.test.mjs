import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const recap = fs.readFileSync("js/workouts/workout-complete-recap.js", "utf8");
const more = fs.readFileSync("js/more/more-ui-v2.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

test("adaptive feedback survey and coach recap are absent from the app runtime", () => {
    assert.doesNotMatch(html, /adaptive-guidance\.css/);
    assert.doesNotMatch(html, /js\/workouts\/adaptive-guidance\.js/);
    assert.doesNotMatch(more, /data-more-page="adaptive-guidance"/);
    assert.doesNotMatch(recap, /renderCoachSummary|data-adaptive-action|adaptive-coach-summary/);
});
