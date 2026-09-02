import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("seven-day meal chart shows a calorie y-axis and scales bars to it", async () => {
  const source = await read("js/nutrition/calorie-stats.js");

  assert.match(source, /const axisMaximum = Math\.max\(500, Math\.ceil\(maximum \/ 500\) \* 500\)/);
  assert.match(source, /const axisTicks = \[1, \.75, \.5, \.25, 0\]/);
  assert.match(source, /class="calorie-meal-week-axis"/);
  assert.match(source, /<small>cal<\/small>/);
  assert.match(source, /value \/ axisMaximum \* 100/);
  assert.match(source, /averageCalories \/ axisMaximum \* 100/);
});

test("calorie y-axis aligns with the stacked chart grid", async () => {
  const styles = await read("css/calorie-stats.css");

  assert.match(styles, /calorie-meal-week-chart\{display:grid;grid-template-columns:34px minmax\(0,1fr\)/);
  assert.match(styles, /calorie-meal-week-axis\{[^}]*padding:11px 0 32px/);
  assert.match(styles, /calorie-meal-week-plot\{[^}]*repeating-linear-gradient/);
});

test("calorie stats stylesheet cache key includes interactive meal chart values", async () => {
  const html = await read("index.html");
  assert.match(html, /css\/calorie-stats\.css\?v=macro-adjuster-mfp-1/);
});

test("seven-day meal bars reveal accessible daily and average value cards", async () => {
  const [source, styles] = await Promise.all([read("js/nutrition/calorie-stats.js"), read("css/calorie-stats.css")]);
  assert.match(source, /data-calorie-meal-column/);
  assert.match(source, /aria-controls="\$\{panelId\}" aria-expanded="false"/);
  assert.match(source, /data-calorie-meal-values hidden/);
  assert.match(source, /Tap a bar to view its values\./);
  assert.match(source, /button\.setAttribute\("aria-expanded", "true"\)/);
  assert.match(styles, /calorie-meal-week-values\[hidden\]\{display:none\}/);
  assert.match(styles, /calorie-meal-week-column\.is-selected/);
});
