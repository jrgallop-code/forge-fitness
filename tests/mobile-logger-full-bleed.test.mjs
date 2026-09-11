import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the mobile workout logger uses the full available screen width", async () => {
  const [styles, mode, serviceWorker] = await Promise.all([
    read("css/workout-mode.css"),
    read("js/workouts/workout-mode.js"),
    read("service-worker.js")
  ]);

  assert.match(styles, /@media\(max-width:600px\)/);
  assert.match(styles, /#levelup-workout-mode-content\{[\s\S]*?width:100%;[\s\S]*?padding-left:0;[\s\S]*?padding-right:0;/);
  assert.match(styles, /#levelup-workout-mode-content>\.workout-session-logger\{[\s\S]*?padding-left:max\(6px,env\(safe-area-inset-left\)\)!important;[\s\S]*?padding-right:max\(6px,env\(safe-area-inset-right\)\)!important;/);
  assert.match(styles, /border-left:0!important;[\s\S]*?border-right:0!important;[\s\S]*?border-radius:0!important;/);
  assert.match(mode, /workout-mode\.css\?v=mobile-logger-full-bleed-1/);
  assert.match(serviceWorker, /2026-09-11-295/);
});
