import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync("js/app.js", "utf8");
const navbar = readFileSync("js/components/navbar.js", "utf8");
const serviceWorker = readFileSync("service-worker.js", "utf8");

test("Progress bottom navigation has a direct pointer-up fallback", () => {
    assert.match(navbar, /data-page=\"progress\"/);
    assert.match(navbar, /addEventListener\(\"pointerup\"/);
    assert.match(navbar, /nav-btn\[data-page=\"progress\"\]/);
    assert.match(navbar, /activateAndNavigate\(button\)/);
    assert.match(navbar, /navigate\(page\)/);
});

test("Progress pointer fallback avoids duplicate click navigation", () => {
    assert.match(navbar, /progressPointerHandledAt/);
    assert.match(navbar, /performance\.now\(\) - progressPointerHandledAt < 700/);
});

test("service worker updates no longer force an in-session app reload", () => {
    assert.doesNotMatch(app, /controllerchange/);
    assert.doesNotMatch(app, /window\.location\.reload\(\)/);
    assert.match(app, /serviceWorker\.register/);
    assert.match(app, /registration\.update\(\)/);
});

test("fresh navigation modules are requested", () => {
    assert.match(app, /router\.js\?v=progress-nav-stability-1/);
    assert.match(app, /navbar\.js\?v=progress-nav-stability-1/);
    assert.match(navbar, /router\.js\?v=progress-nav-stability-1/);
});

test("PWA shell generation is advanced for the stability release", () => {
    assert.match(serviceWorker, /CACHE_VERSION = \"2026-08-31-65\"/);
});
