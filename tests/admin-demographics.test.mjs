import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [admin, insights, productState, worker, migration, page] = await Promise.all([
  read("admin/admin-analytics.js"), read("admin/product-insights.js"),
  read("js/analytics/product-state.js"), read("cloud/src/fatsecret-diagnostic-worker.js"),
  read("cloud/migrations/0022_user_demographics.sql"), read("admin/index.html")
]);

test("owner dashboard permanently exposes searchable per-user activity", () => {
  assert.match(admin, /What each user has done/);
  assert.match(admin, /data-admin-user-search/);
  assert.match(admin, /person\.active_days/);
  assert.match(admin, /person\.foods_logged/);
  assert.match(admin, /person\.workouts_logged/);
});

test("demographics are collected and displayed only as aggregates", () => {
  for (const field of ["ageBand", "sex", "primaryGoal", "experience", "trainingDays", "trainingSetup", "nutritionEnabled"]) {
    assert.match(productState, new RegExp(field));
  }
  assert.match(worker, /demographicRows/);
  assert.match(insights, /Aggregate onboarding profiles only/);
  assert.match(insights, /owner-demographic-grid/);
  assert.match(page, /owner-demographics\.css\?v=user-demographics-1/);
});

test("demographic migration adds fields and backfills existing onboarding aggregates", () => {
  assert.match(migration, /ADD COLUMN age_band/);
  assert.match(migration, /ADD COLUMN nutrition_enabled/);
  assert.match(migration, /event_name = 'onboarding_completed'/);
  assert.match(migration, /json_extract\(metadata_json, '\$\.primaryGoal'\)/);
});
