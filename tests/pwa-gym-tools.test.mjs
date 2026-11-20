import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { epley1RM, convertGymWeight } from "../js/core/gym-tools-math.js";

const read = name => fs.readFileSync(name, "utf8");
const quick = read("js/core/pwa-quick-log.js");
const gym = read("js/core/pwa-gym-tools.js");
const plate = read("js/workouts/plate-calculator.js");
const css = read("css/pwa-gym-tools.css");
const index = read("index.html");
const sw = read("service-worker.js");
const logger = read("js/workouts/logger-exercise-name-fix.js");

test("Gym Tools are reachable from PWA Quick Log and remain PWA-only", () => {
  assert.match(quick, /data-ql-action="gym-tools"/);
  assert.match(quick, /openGymTools\(\)/);
  assert.match(quick, /const isPWA = \(\) => !window\.Capacitor/);
  assert.match(gym, /\["plates", "Plates"\]/);
  assert.match(gym, /\["convert", "Convert"\]/);
  assert.match(gym, /\["warmup", "Warm-up"\]/);
  assert.match(gym, /\["oneRM", "1RM"\]/);
  assert.match(gym, /\["stopwatch", "Stopwatch"\]/);
  assert.doesNotMatch(gym, /Back-Off Sets/);
});
test("Standalone plate calculator reuses workout visuals and original bar settings", () => {
  assert.match(gym, /openStandalonePlateCalculator/);
  assert.match(plate, /export function openStandalonePlateCalculator\(\)/);
  assert.match(plate, /renderPlateVisual\(solution\)/);
  assert.match(plate, /BAR_WEIGHT_PRESETS\[liftingUnit\]/);
  assert.match(plate, /plate-calculator-bar-options/);
  assert.match(plate, /plate-calculator-plate-options/);
  assert.match(plate, /plate-calculator-standalone-input/);
  assert.match(plate, /if \(card\?\.dataset\?\.exerciseId === STANDALONE_ID\) return/);
  assert.match(logger, /plate-calculator\.js\?v=plate-theme-parity-20261120/);
  assert.match(gym, /plate-calculator\.js\?v=plate-theme-parity-20261120/);
});
test("Epley and machine unit conversion are accurate", () => {
  assert.equal(epley1RM(100, 1), 100);
  assert.ok(Math.abs(epley1RM(100, 3) - 110) < 1e-9);
  assert.ok(Math.abs(epley1RM(90, 10) - 120) < 1e-9);
  assert.equal(epley1RM(100, 31), null);
  assert.ok(Math.abs(convertGymWeight(100, "kg", "lb") - 220.462262185) < 1e-9);
  assert.ok(Math.abs(convertGymWeight(220.462262185, "lb", "kg") - 100) < 1e-9);
});
test("Stopwatch is styled for PWA without claiming native lock screen capability", () => {
  assert.match(gym, /const nativeTimer = \(\) => null/);
  assert.match(css, /gym-tools-clock/);
  assert.match(css, /gym-tools-stopwatch-panel/);
  assert.match(index, /css\/pwa-gym-tools\.css\?v=theme-contrast-20261119/);
  assert.match(index, /js\/app\.js\?v=theme-contrast-20261119/);
  assert.match(sw, /theme-contrast-20261119/);
});
