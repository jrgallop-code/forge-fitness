import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("js/core/progress-route-stable.js", "utf8");
const navbar = readFileSync("js/components/navbar.js", "utf8");
const serviceWorker = readFileSync("service-worker.js", "utf8");

test("Weight Progress critical controls initialize together on the first frame", () => {
    assert.match(route, /requestAnimationFrame\(\(\) => \{/);
    assert.match(route, /runInitializer\("Weight tracker", initializeWeightTracker\)/);
    assert.match(route, /runInitializer\("Compact weight progress", initializeWeightProgressCompact\)/);
    assert.match(route, /runInitializer\("Nutrition stats", \(\) => initializeCalorieStats\(content\)\)/);
    assert.match(route, /runInitializer\("Weight and carbs chart", \(\) => initializeWeightCarbsChart\(content\)\)/);
});

test("Weight and Carbs is not queued behind heavy training analytics", () => {
    const carbs = route.indexOf('runInitializer("Weight and carbs chart"');
    const training = route.indexOf('runInitializer("Training progress"');
    assert.ok(carbs >= 0 && training >= 0 && carbs < training);
    assert.doesNotMatch(route, /window\.setTimeout\(runNext/);
});

test("navbar requests the refreshed stable Progress route", () => {
    assert.match(navbar, /progress-route-stable\.js\?v=progress-route-stable-2/);
});

test("PWA cache generation advances for full Progress restoration", () => {
    assert.match(serviceWorker, /CACHE_VERSION = "2026-08-31-67"/);
});
