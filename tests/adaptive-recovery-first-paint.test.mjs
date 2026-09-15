import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const session = readFileSync("js/workouts/workout-session.js", "utf8");
const html = readFileSync("index.html", "utf8");

test("workout logger no longer waits for a recovery survey", () => {
    assert.doesNotMatch(session, /adaptive-recovery-pending|recoveryCheckPending/);
    assert.doesNotMatch(session, /getAdaptiveGuidanceSettings|getDeloadPreviewRequest/);
    assert.doesNotMatch(session, /levelup:workout-session-rendered/);
    assert.doesNotMatch(html, /js\/workouts\/adaptive-guidance\.js|css\/adaptive-guidance\.css/);
});
