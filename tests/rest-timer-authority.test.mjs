import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const authority = await readFile(new URL("../js/workouts/rest-timer-authority.js", import.meta.url), "utf8");
const warmups = await readFile(new URL("../js/workouts/warmup-session-fix.js", import.meta.url), "utf8");
const stability = await readFile(new URL("../js/workouts/warmup-timer-stability.js", import.meta.url), "utf8");
const display = await readFile(new URL("../js/workouts/rest-timer-display-fix.js", import.meta.url), "utf8");
const compact = await readFile(new URL("../js/workouts/workout-logger-compact.js", import.meta.url), "utf8");
const theme = await readFile(new URL("../js/core/workout-theme-guardrail.js", import.meta.url), "utf8");

test("working sets use per-exercise timer authority and Off no longer creates a rest", () => {
    assert.match(authority, /getExerciseRestSetting/);
    assert.match(authority, /if \(!setting\.enabled\)/);
    assert.match(authority, /clearTimerForDisabledSource/);
    assert.match(authority, /sourceType:\s*"working"/);
    assert.match(authority, /\.complete-set-btn/);
});

test("warm-up completion uses the same per-exercise rest timer authority", () => {
    assert.match(warmups, /startRestForWarmupButton/);
    assert.match(warmups, /warmup-timer-stability\.js\?v=warmup-timer-stability-1/);
    assert.doesNotMatch(warmups, /#start-rest-timer/);
    assert.match(authority, /sourceType:\s*"warmup"/);
    assert.match(authority, /warmupSets/);
    assert.match(display, /\.session-warmup-row\[data-warmup-index/);
    assert.match(display, /\.complete-warmup-btn/);
});

test("warm-up inline countdown cannot be flashed off by the legacy working-set timer loop", () => {
    // The old compact logger clears every inline timer but only knows how to
    // restore data-set-index working rows. The warm-up guard repairs that DOM
    // mutation in the MutationObserver microtask, before the browser paints it.
    assert.match(compact, /querySelectorAll\('\.inline-rest-timer'\)/);
    assert.match(compact, /data-set-index/);
    assert.match(stability, /data-source-type=\\"warmup\\"/);
    assert.match(stability, /MutationObserver/);
    assert.match(stability, /queueMicrotask\(stabilizeWarmupTimer\)/);
    assert.match(stability, /line\.hidden = false/);
    assert.match(stability, /line\.dataset\.warmupTimerStable/);
});

test("one stable timer identity owns expiry and suppresses the legacy duplicate alert path", () => {
    assert.match(authority, /timerId/);
    assert.match(authority, /timer\.notified = true/);
    assert.match(authority, /timer\.authorityFinished = true/);
    assert.match(authority, /intentionally retain endAt/);
    assert.match(authority, /renotify:\s*false/);
    assert.match(authority, /getNotifications\(\{ tag: TIMER_TAG \}\)/);
});

test("active rest banner is kept visible independently of logger DOM rerenders", () => {
    assert.match(authority, /level-up-rest-alarm-banner/);
    assert.match(authority, /banner\.hidden = false/);
    assert.match(display, /active\?\.restTimer && banner/);
});

test("working-set number circles are forced to the selected theme at runtime", () => {
    assert.match(theme, /session-set-row > strong/);
    assert.match(theme, /style\?\.setProperty\(property, value, "important"\)/);
    assert.match(theme, /background", "var\(--accent\)"/);
    assert.match(theme, /color", "var\(--accent-contrast\)"/);
    assert.match(theme, /MutationObserver/);
});