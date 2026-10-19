import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const maintenance = readFileSync("js/nutrition/calculated-maintenance.js", "utf8");
const progress = readFileSync("js/nutrition/calorie-stats.js", "utf8");
const foodCache = readFileSync("js/nutrition/fatsecret-live-cache.js", "utf8");

test("Missing FatSecret nutrition must not be treated as a real zero-calorie TDEE update", () => {
  assert.match(foodCache, /fatSecretPending: true/);
  assert.match(maintenance, /hasIncompleteNutrition\(foodLog\)/);
  assert.match(maintenance, /dataRefreshing: true/);
  assert.match(maintenance, /if \(hasIncompleteNutrition\(foodLog\)\) return maintenanceHistoryCache\?\.points \|\| \[\]/);
  assert.match(maintenance, /const prior = readJson\(WEEKLY_ESTIMATE_KEY, null\)/);
});

test("Calorie Progress remains accessible and holds complete daily aggregates while food refreshes", () => {
  assert.doesNotMatch(progress, /data-food-hydration-notice/);
  assert.match(progress, /level_up_calorie_daily_totals_cache_v1/);
  assert.match(progress, /pending && prior\?\.signature === signature/);
  assert.match(progress, /if \(!pending\)/);
  assert.match(progress, /const daysForRange = stableCalorieDays/);
});

test("Startup hydration refreshes every saved provider ID without unbounded concurrency", () => {
  assert.doesNotMatch(foodCache, /MAX_STARTUP_FOODS/);
  assert.match(foodCache, /MAX_PARALLEL_STARTUP_FOODS = 4/);
  assert.match(foodCache, /const remaining = \[\.\.\.ids\]\.filter/);
  assert.match(foodCache, /await Promise\.all\(Array\.from/);
});
