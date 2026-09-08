import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const router = readFileSync("js/core/router.js", "utf8");
const session = readFileSync("js/workouts/workout-session.js", "utf8");
const workoutMode = readFileSync("js/workouts/workout-mode.js", "utf8");
const styles = readFileSync("css/styles.css", "utf8");

test("route changes reset document scrolling before rendering", () => {
    const start = router.indexOf("const finishRouteChange = beginRouteChange(content)");
    const render = router.indexOf("switch (page)", start);
    assert.ok(start >= 0);
    assert.ok(render > start);
    assert.match(router, /root\.style\.scrollBehavior = "auto"/);
    assert.match(router, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
    assert.match(router, /history\.scrollRestoration = "manual"/);
});

test("route replacement is hidden only during the synchronous render transaction", () => {
    assert.match(router, /classList\.add\("levelup-route-changing"\)/);
    assert.match(router, /finally \{\s*finishRouteChange\(\);\s*\}/s);
    assert.match(styles, /html\.levelup-route-changing #content\s*\{\s*visibility:hidden;/s);
    assert.match(styles, /#content\s*\{[^}]*overflow-anchor:none;/s);
});

test("the workout logger mounts directly in its final full-screen surface", () => {
    assert.match(workoutMode, /export function openWorkoutMode\(logger\)/);
    assert.match(session, /else \{\s*\/\/ Mount directly[\s\S]*?openWorkoutMode\(logger\);\s*\}/);
    assert.doesNotMatch(session, /logger\.scrollIntoView\(\{\s*behavior: "smooth"/s);
});
