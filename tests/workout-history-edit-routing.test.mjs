import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Workout History Edit opens the completed-session editor and hides the plan dashboard", async () => {
    const [history, router, app, index, worker] = await Promise.all([
        read("js/workouts/workout-history.js"),
        read("js/core/router.js"),
        read("js/app.js"),
        read("index.html"),
        read("service-worker.js")
    ]);

    assert.match(history, /function openWorkoutHistoryEditor\(sessionId\)/);
    assert.match(history, /navigate\("workout"\)[\s\S]*openCompletedWorkoutForEdit\(sessionId\)/);
    assert.match(history, /querySelector\("\[data-workout-live-landing\]"\)[\s\S]*landing\.hidden = true/);
    assert.doesNotMatch(history, /navigate\("workout"\); openCompletedWorkoutForEdit\(session\.id\)/);
    assert.match(router, /workout-history\.js\?v=history-editor-route-1/);
    assert.match(app, /router\.js\?v=history-editor-route-1/);
    assert.match(index, /js\/app\.js\?v=history-editor-route-1/);
    assert.match(worker, /CACHE_VERSION = "2026-09-13-315"/);
});
