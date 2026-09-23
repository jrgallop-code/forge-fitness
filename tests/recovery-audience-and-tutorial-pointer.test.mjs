import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [tutorial, safeguard, worker] = await Promise.all([
    read("js/more/interactive-workout-tutorial-v5.js"),
    read("js/core/pwa-startup-safeguard.js"),
    read("service-worker.js")
]);

test("the retired system recovery notice is no longer loaded", () => {
    assert.doesNotMatch(safeguard, /system-recovery-notice/);
    assert.doesNotMatch(worker, /system-recovery-notice/);
});

test("workout tutorial fingertip stays anchored to Form Guide in Safari browser viewports", () => {
    assert.match(tutorial, /PRIMARY_SELECTOR} \.logger-form-guide-btn/);
    assert.match(tutorial, /visualViewport\?\.addEventListener\("resize", schedulePosition\)/);
    assert.match(tutorial, /visualViewport\?\.addEventListener\("scroll", schedulePosition\)/);
    assert.match(tutorial, /targetCenter = rect\.left \+ rect\.width \/ 2/);
    assert.match(tutorial, /finger\.style\.top = `\$\{Math\.max\(54, rect\.top \+ 3\)\}px`/);
    assert.match(tutorial, /translate\(-50%,-100%\)/);
});

test("startup and offline assets load the corrected modules", () => {
    assert.match(safeguard, /interactive-workout-tutorial-v5\.js\?v=workout-overflow-rir-1/);
    assert.match(worker, /CACHE_VERSION = "2026-09-23-ios-launch-343"/);
    assert.match(worker, /interactive-workout-tutorial-v5\.js\?v=browser-form-guide-pointer-1/);
});
