import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const app = readFileSync("js/app.js", "utf8");
const navbar = readFileSync("js/components/navbar.js", "utf8");
const router = readFileSync("js/core/router.js", "utf8");
const weightCarbsEntry = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const serviceWorker = readFileSync("service-worker.js", "utf8");

test("Progress uses the confirmed checkpoint bottom-nav route", () => {
    assert.match(navbar, /data-page="progress"/);
    assert.match(navbar, /nav\.addEventListener\(\s*"click"/);
    assert.match(navbar, /navigate\(page\)/);
    assert.doesNotMatch(navbar, /renderStableProgressRoute/);
    assert.doesNotMatch(navbar, /addEventListener\(\s*"pointerup"/);
});

test("canonical Progress router initializes the complete page", () => {
    assert.match(router, /case "progress":/);
    assert.match(router, /content\.innerHTML = renderProgress\(\)/);
    assert.match(router, /initializeWeightTracker/);
    assert.match(router, /initializeWeightProgressCompact/);
    assert.match(router, /initializeCalorieStats\(content\)/);
    assert.match(router, /initializeWeightCarbsChart\(content\)/);
    assert.match(router, /initializeTrainingProgress/);
    assert.match(router, /initializeCardioAnalytics\(content\)/);
});

test("Weight and Carbs entry matches the last confirmed working runtime", () => {
    assert.match(weightCarbsEntry, /initializeWeightCarbsChartV2\(root\)/);
    assert.doesNotMatch(weightCarbsEntry, /initializeWeightCarbsDetailToggle/);
    assert.equal(existsSync("js/progress/weight-carbs-detail-toggle.js"), false);
});

test("service worker updates do not force an in-session reload", () => {
    assert.doesNotMatch(app, /controllerchange/);
    assert.doesNotMatch(app, /window\.location\.reload\(\)/);
    assert.match(app, /serviceWorker\.register/);
    assert.match(app, /registration\.update\(\)/);
    assert.doesNotMatch(serviceWorker, /clients\.claim\(\)/);
});

test("PWA shell generation advances for Weight and Calories release", () => {
    assert.match(serviceWorker, /CACHE_VERSION = "2026-08-31-71"/);
    assert.match(serviceWorker, /fetch\(url, \{ cache: "reload" \}\)/);
    assert.match(serviceWorker, /referencedAssetUrls/);
});
