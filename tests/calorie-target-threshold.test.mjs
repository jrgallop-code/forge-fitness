import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.window = { addEventListener() {}, dispatchEvent() {} };
globalThis.localStorage = { getItem() { return null; }, setItem() {} };

const stats = await import("../js/nutrition/calorie-stats.js?test=three-percent-target");
const source = await readFile(new URL("../js/nutrition/calorie-stats.js", import.meta.url), "utf8");
const router = await readFile(new URL("../js/core/router.js", import.meta.url), "utf8");
const progress = await readFile(new URL("../js/progress/progress-ui.js", import.meta.url), "utf8");

test("calorie target threshold is exactly three percent", () => {
  assert.equal(stats.calorieTargetTolerance(2400), 72);
  assert.equal(stats.isCaloriesInTarget(2328, 2400), true);
  assert.equal(stats.isCaloriesInTarget(2472, 2400), true);
  assert.equal(stats.isCaloriesInTarget(2327, 2400), false);
  assert.equal(stats.isCaloriesInTarget(2473, 2400), false);
});

test("calorie stats label the target and show its range in brackets", () => {
  assert.match(source, /<small>CALORIE TARGET<\/small>/);
  assert.match(source, /cal\/day \(\$\{formatNumber\(lower\)\}–\$\{formatNumber\(upper\)\}\)/);
  assert.match(source, /within ±3% of your calorie goal/);
  assert.doesNotMatch(source, /minimum allowance of ±100 calories/);
  assert.match(router, /calorie-stats\.js\?v=research-journal-cleanup-1/);
  assert.match(progress, /calorie-stats\.js\?v=research-journal-cleanup-1/);
});

test("calorie target sits directly above the TDEE graph", () => {
  const maintenanceIndex = source.indexOf("${maintenanceCard(maintenance, checkIn)}");
  const targetIndex = source.indexOf('<article class="calorie-stat-card calorie-target-rule">');
  const tdeeGraphIndex = source.indexOf("${expenditureTrendCard(tdeeTrend, formulaEstimate, targets.phase)}");

  assert.ok(maintenanceIndex >= 0);
  assert.ok(targetIndex > maintenanceIndex);
  assert.ok(tdeeGraphIndex > targetIndex);
  assert.equal(source.slice(targetIndex + 1).indexOf('<article class="calorie-stat-card calorie-target-rule">'), -1);
});
