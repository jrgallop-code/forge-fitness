import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("bottom navigation presents the food hub as Nutrition", async () => {
  const source = await read("js/components/navbar.js");

  assert.match(source, /data-page="energy" aria-label="Nutrition"/);
  assert.match(source, /<span>Nutrition<\/span>/);
  assert.match(source, /M5 3v5M8 3v5M11 3v5/);
  assert.doesNotMatch(source, /data-page="energy" aria-label="Calories"/);
});

test("More no longer duplicates the Nutrition destination", async () => {
  const source = await read("js/more/more-ui-v2.js");

  assert.doesNotMatch(source, /data-more-page="nutrition"/);
  assert.doesNotMatch(source, /ICONS\.nutrition/);
});

test("Progress owns dedicated Nutrition and Cardio panels", async () => {
  const [view, controls, router] = await Promise.all([
    read("js/progress/progress-ui.js"),
    read("js/progress/weight-tracker.js"),
    read("js/core/router.js")
  ]);

  assert.match(view, /id="nutrition-progress-tab"/);
  assert.match(view, /id="cardio-progress-tab"/);
  assert.match(view, /id="calorie-progress" hidden/);
  assert.match(view, /id="cardio-progress" hidden/);
  assert.match(view, /\$\{renderCalorieStats\(\)\}/);
  assert.match(controls, /nutrition: document\.getElementById\("nutrition-progress-tab"\)/);
  assert.match(controls, /cardio: document\.getElementById\("cardio-progress-tab"\)/);
  assert.match(controls, /nutrition: document\.getElementById\("calorie-progress"\)/);
  assert.match(router, /initializeCalorieStats\(content\)/);
  assert.match(router, /initializeCardioAnalytics\(content\)/);
});

test("calorie stats renders into Progress instead of adding a food-log tab", async () => {
  const source = await read("js/nutrition/calorie-stats.js");

  assert.match(source, /export function renderCalorieStats\(\)/);
  assert.match(source, /data-progress-calorie-stats/);
  assert.doesNotMatch(source, /data-calories-tab="stats"/);
  assert.doesNotMatch(source, /MutationObserver/);
});

test("published entry points carry the Progress Cardio cache keys", async () => {
  const html = await read("index.html");
  const styles = await read("css/cardio-analytics.css");

  assert.match(html, /css\/progress-volume\.css\?v=progress-cardio-1/);
  assert.match(html, /css\/cardio-analytics\.css\?v=cardio-mobile-layout-1/);
  assert.match(html, /js\/app\.js\?v=appearance-themes-1/);
  assert.doesNotMatch(html, /js\/nutrition\/calorie-stats\.js/);
  assert.match(styles, /overflow-x:auto/);
  assert.match(styles, /font-size:\.82rem/);
});
