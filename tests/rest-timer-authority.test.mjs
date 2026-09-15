import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const authority = await readFile(new URL("../js/workouts/rest-timer-authority.js", import.meta.url), "utf8");
const warmups = await readFile(new URL("../js/workouts/warmup-session-fix.js", import.meta.url), "utf8");
const stability = await readFile(new URL("../js/workouts/warmup-timer-stability.js", import.meta.url), "utf8");
const display = await readFile(new URL("../js/workouts/rest-timer-display-fix.js", import.meta.url), "utf8");
const compact = await readFile(new URL("../js/workouts/workout-logger-compact.js", import.meta.url), "utf8");
const session = await readFile(new URL("../js/workouts/workout-session.js", import.meta.url), "utf8");
const theme = await readFile(new URL("../js/core/workout-theme-guardrail.js", import.meta.url), "utf8");

test("working sets use per-exercise timer authority and Off no longer creates a rest", () => {
    assert.match(authority, /getExerciseRestSetting/);
    assert.match(authority, /if \(!setting\.enabled\)/);
    assert.match(authority, /clearTimerForDisabledSource/);
    assert.match(authority, /sourceType:\s*"working"/);
    assert.match(authority, /\.complete-set-btn/);
    assert.match(compact, /<option value="0">Off<\/option>/);
    assert.match(session, /return Number\.isFinite\(seconds\)[\s\S]*?Math\.max\(0, seconds\)/);
    assert.match(session, /durationSeconds <= 0/);
    assert.doesNotMatch(session, /return Number\(select\?\.value\) \|\| 90/);
});

test("unchecking a working set cancels only that set's active rest", () => {
    assert.match(authority, /if \(!completed\) \{/);
    assert.match(authority, /sourceType: "working"/);
    assert.match(authority, /setIndex: meta\.index/);
    assert.match(authority, /Number\(setIndex\) !== Number\(timer\.setIndex\)/);
});

test("turning a running exercise timer off cancels every timer surface", () => {
    assert.match(authority, /export function cancelActiveRestTimer/);
    assert.match(authority, /cancelNativeAlarm\(`rest:\$\{timerId\}`\)/);
    assert.match(authority, /clearScheduledExpiry\(\)/);
    assert.match(authority, /levelup:rest-timer-dismissed/);
    assert.match(authority, /\.exercise-timer-enabled/);
    assert.match(authority, /if \(!toggle \|\| toggle\.checked\) return/);
    assert.match(authority, /exerciseIndex: Number\(card\.dataset\.exerciseIndex\)/);
    assert.match(display, /levelup:rest-timer-dismissed/);
});

test("warm-up completion uses the same per-exercise rest timer authority", () => {
    assert.match(warmups, /startRestForWarmupButton/);
    assert.match(warmups, /warmup-timer-stability\.js\?v=warmup-timer-stability-1/);
    assert.match(warmups, /rest-timer-authority\.js\?v=warmup-toggle-cancel-1/);
    assert.doesNotMatch(warmups, /#start-rest-timer/);
    assert.match(authority, /sourceType:\s*"warmup"/);
    assert.match(authority, /warmupSets/);
    assert.match(display, /\.session-warmup-row\[data-warmup-index/);
    assert.match(display, /\.complete-warmup-btn/);
});

test("unchecking a warm-up cancels only that warm-up's active rest", () => {
    assert.match(warmups, /cancelActiveRestTimer/);
    assert.match(warmups, /if \(row\.classList\.contains\("completed"\)\)/);
    assert.match(warmups, /sourceType: "warmup"/);
    assert.match(warmups, /warmupIndex: Number\(row\.dataset\.warmupIndex\)/);
    assert.match(authority, /timer\.sourceType !== sourceType/);
    assert.match(authority, /Number\(warmupIndex\) !== Number\(timer\.warmupIndex\)/);
});

test("one unified renderer owns working-set and warm-up inline countdowns", () => {
    // The unified display is the sole inline countdown owner for both working
    // and warm-up sets. The compact logger must not create or refresh a second.
    assert.doesNotMatch(compact, /timerLine\.className = 'inline-rest-timer'/);
    assert.doesNotMatch(compact, /function updateInlineTimers/);
    assert.doesNotMatch(compact, /setInterval\(updateInlineTimers/);
    assert.match(display, /function syncVisibleTimer/);
    assert.match(display, /data-source-type/);
    assert.match(stability, /data-source-type="warmup"/);
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
    assert.match(authority, /if \(window\.Capacitor\?\.isNativePlatform\?\.\(\)\) return;/);
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
