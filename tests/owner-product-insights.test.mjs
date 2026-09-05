import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("signed-in app reports current appearance and program state", async () => {
  const [tracker, appearance] = await Promise.all([
    read("js/analytics/product-state.js"),
    read("js/core/appearance-theme.js")
  ]);

  assert.match(tracker, /level_up_appearance_settings/);
  assert.match(tracker, /forge_workout_sessions/);
  assert.match(tracker, /\/v1\/activity/);
  assert.match(tracker, /appearanceTheme/);
  assert.match(tracker, /effectiveTheme/);
  assert.match(tracker, /planName/);
  assert.match(tracker, /reconcileRecentProgramUsage/);
  assert.match(appearance, /analytics\/product-state\.js\?v=owner-product-insights-1/);
});

test("cloud stores product state and exposes owner-only insight aggregates", async () => {
  const [migration, wrapper] = await Promise.all([
    read("cloud/migrations/0015_user_product_state.sql"),
    read("cloud/src/fatsecret-diagnostic-worker.js")
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS user_product_state/);
  assert.match(migration, /appearance_theme/);
  assert.match(migration, /program_name/);
  assert.match(wrapper, /recordProductState/);
  assert.match(wrapper, /mergeProgramMetadata/);
  assert.match(wrapper, /getProductInsights/);
  assert.match(wrapper, /user_product_state/);
  assert.match(wrapper, /\$\.planName/);
  assert.match(wrapper, /programUsage/);
  assert.match(wrapper, /appearance/);
  assert.match(wrapper, /tracked_users/);
});

test("owner console renders program and appearance insight cards", async () => {
  const [app, insights, styles] = await Promise.all([
    read("admin/app.js"),
    read("admin/product-insights.js"),
    read("admin/product-insights.css")
  ]);

  assert.match(app, /initializeOwnerProductInsights/);
  assert.match(insights, /Most used programs/);
  assert.match(insights, /Theme preferences/);
  assert.match(insights, /Recent program choices/);
  assert.match(insights, /This fills as signed-in users reopen the app/);
  assert.match(styles, /owner-product-insights-grid/);
  assert.match(styles, /owner-insight-meter/);
});
