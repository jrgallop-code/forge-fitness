import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [recovery, tutorial, safeguard, worker] = await Promise.all([
    read("js/core/system-recovery-notice.js"),
    read("js/more/interactive-workout-tutorial-v5.js"),
    read("js/core/pwa-startup-safeguard.js"),
    read("service-worker.js")
]);

test("data recovery notice is limited to the existing-user rollout audience", () => {
    assert.match(recovery, /AUDIENCE_KEY/);
    assert.match(recovery, /if \(!isLegacyRecoveryAudience\(\)\) return removeNotice\(\)/);
    assert.match(recovery, /localStorage\.setItem\(AUDIENCE_KEY, legacy \? "legacy" : "new"\)/);
    assert.match(recovery, /hasValidSession\(\)[\s\S]*LEGACY_DATA_KEYS\.some/);
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
    assert.match(safeguard, /system-recovery-notice\.js\?v=legacy-audience-1/);
    assert.match(safeguard, /interactive-workout-tutorial-v5\.js\?v=browser-form-guide-pointer-1/);
    assert.match(worker, /CACHE_VERSION = "2026-09-07-273"/);
    assert.match(worker, /system-recovery-notice\.js\?v=legacy-audience-1/);
    assert.match(worker, /interactive-workout-tutorial-v5\.js\?v=browser-form-guide-pointer-1/);
});
