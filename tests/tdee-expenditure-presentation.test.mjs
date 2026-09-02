import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Nutrition Progress uses a simple expenditure summary instead of the old Level Up TDEE card", async () => {
  const source = await read("js/nutrition/calorie-stats.js");

  assert.match(source, /<h3>Current Expenditure<\/h3>/);
  assert.match(source, /Current Strategy/);
  assert.match(source, /"Learning"/);
  assert.match(source, /"Updating"/);
  assert.match(source, /"Holding"/);
  assert.doesNotMatch(source, /LEVEL UP CALCULATED TDEE/);
  assert.doesNotMatch(source, /calculated-maintenance-target-context/);
});

test("TDEE history chart matches the app's graph ranges and supports daily inspection", async () => {
  const [source, styles, calculation, index, app, router, progress] = await Promise.all([
    read("js/nutrition/calorie-stats.js"),
    read("css/calorie-stats.css"),
    read("js/nutrition/calculated-maintenance.js"),
    read("index.html"),
    read("js/app.js"),
    read("js/core/router.js"),
    read("js/progress/progress-ui.js")
  ]);

  for (const [key, label] of [["1w", "1W"], ["1m", "1M"], ["3m", "3M"], ["6m", "6M"], ["phase", "PHASE"], ["all", "ALL"]]) {
    assert.match(source, new RegExp(`"${key}":? \\{?[^\\n]*label: "${label}"|${key}: \\{ label: "${label}"`));
  }
  assert.match(source, /<h3>TDEE Over Time<\/h3>/);
  assert.match(source, /data-expenditure-chart/);
  assert.match(source, /data-expenditure-tooltip/);
  assert.match(source, /Tap or drag for daily details\. Double-tap to close/);
  assert.match(source, /Generic expenditure/);
  assert.doesNotMatch(source, /is-profile"><\/i>Profile estimate/);
  assert.match(source, /point\.maintenanceCalories > 0/);
  assert.match(source, /state\.available\.forEach\(\(point, index\)/);
  assert.doesNotMatch(source, /function expenditureSegments/);
  assert.match(source, /addEventListener\("dblclick"/);
  assert.match(source, /Double-tap to close/);
  assert.match(styles, /\.expenditure-chart-ranges/);
  assert.match(styles, /\.expenditure-chart-tooltip\[hidden\]\{display:none\}/);
  assert.match(calculation, /export function calculateMaintenanceHistory/);
  assert.match(calculation, /stabilizeMaintenanceEstimate\(\{ liveEstimate, snapshot, today: cursor \}\)/);
  assert.match(calculation, /level_up_weekly_tdee_history_v1/);
  assert.doesNotMatch(calculation, /phase\?\.adjustments/);
  assert.match(calculation, /maintenanceCalories: positiveNumber\(estimate\.maintenanceCalories\)/);
  assert.match(index, /css\/calorie-stats\.css\?v=food-log-macro-bars-1/);
  assert.match(index, /js\/app\.js\?v=food-log-macro-bars-1/);
  assert.match(app, /router\.js\?v=food-log-macro-bars-1/);
  assert.match(router, /progress-ui\.js\?v=food-log-macro-bars-1/);
  assert.match(router, /calorie-stats\.js\?v=food-log-macro-bars-1/);
  assert.match(progress, /calorie-stats\.js\?v=food-log-macro-bars-1/);
});
