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

test("Calorie progress waits for rehydration before reporting incomplete weekly totals", () => {
  assert.match(progress, /const pendingFoodDays = Object\.values\(readFoodLog\(\)\)/);
  assert.match(progress, /if \(pendingFoodDays\) \{/);
  assert.match(progress, /data-food-hydration-notice/);
  assert.match(progress, /Your logs are preserved/);
});
