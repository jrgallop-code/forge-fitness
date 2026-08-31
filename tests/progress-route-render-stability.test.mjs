import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const navbar = readFileSync("js/components/navbar.js", "utf8");
const stableRoute = readFileSync("js/core/progress-route-stable.js", "utf8");
const serviceWorker = readFileSync("service-worker.js", "utf8");

test("bottom Progress navigation uses the dedicated stable route", () => {
    assert.match(navbar, /renderStableProgressRoute/);
    assert.match(navbar, /page === "progress"/);
    assert.match(navbar, /renderStableProgressRoute\(document\.getElementById\("content"\)\)/);
});

test("desktop Progress activation stays on the normal click path", () => {
    assert.match(navbar, /if \(event\.pointerType === "mouse"\) return/);
    assert.match(navbar, /nav\.addEventListener\("click"/);
});

test("Progress markup renders before heavy analytics initialization", () => {
    const renderIndex = stableRoute.indexOf("content.innerHTML = renderProgress()");
    const timeoutIndex = stableRoute.indexOf("window.setTimeout(runNext, 0)");
    assert.ok(renderIndex >= 0);
    assert.ok(timeoutIndex > renderIndex);
    assert.match(stableRoute, /const steps = \[/);
});

test("Progress initializers are isolated into deferred steps", () => {
    assert.match(stableRoute, /\["Weight tracker", initializeWeightTracker\]/);
    assert.match(stableRoute, /\["Weight and carbs chart", \(\) => initializeWeightCarbsChart\(content\)\]/);
    assert.match(stableRoute, /console\.error\(`\$\{name\} failed to initialize:/);
});

test("service worker does not claim an already-open app session", () => {
    assert.doesNotMatch(serviceWorker, /clients\.claim\(\)/);
    assert.match(serviceWorker, /CACHE_VERSION = "2026-08-31-66"/);
});
