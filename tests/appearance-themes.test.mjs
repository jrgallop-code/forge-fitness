import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("appearance system provides system plus six curated themes", async () => {
  const source = await read("js/core/appearance-theme.js");
  for (const theme of ["system", "level-up", "arctic", "pure", "ocean", "midnight", "slate"]) {
    assert.match(source, new RegExp(`id: "${theme}"`));
  }
  assert.match(source, /level_up_appearance_settings/);
  assert.match(source, /prefers-color-scheme: light/);
  assert.match(source, /root\.dataset\.theme/);
  assert.match(source, /meta\[name="theme-color"\]/);
});

test("More opens a dedicated live Appearance selector", async () => {
  const [more, settings] = await Promise.all([
    read("js/more/more-ui-v2.js"),
    read("js/more/appearance-settings.js")
  ]);
  assert.match(more, /data-more-page="appearance"/);
  assert.match(more, /<strong>Appearance<\/strong>/);
  assert.match(more, /renderAppearanceSettings\(\)/);
  assert.match(settings, /role="radiogroup"/);
  assert.match(settings, /data-appearance-theme/);
  assert.match(settings, /active \? " is-selected"/);
  assert.match(settings, /applyAppearanceTheme\(theme\)/);
  assert.match(settings, /Training colours stay meaningful/);
});

test("theme stylesheet separates accents from semantic status colours", async () => {
  const styles = await read("css/appearance-themes.css");
  for (const theme of ["level-up", "arctic", "pure", "ocean", "midnight", "slate"]) {
    assert.match(styles, new RegExp(`html\\[data-theme="${theme}"\\]`));
  }
  assert.match(styles, /--accent:/);
  assert.match(styles, /--success:#22c55e/);
  assert.match(styles, /--warning:#f59e0b/);
  assert.match(styles, /--danger:#ef4444/);
  assert.match(styles, /html\[data-theme-mode="light"\]/);
  assert.match(styles, /\.bottom-nav button\.active/);
});

test("feature cards inherit the selected theme instead of fixed dark colours", async () => {
  const styles = await read("css/appearance-themes.css");
  for (const selector of [
    "#levelup-workout-mode",
    ".food-daily-summary",
    ".food-meal",
    ".seven-day-volume-map-card",
    ".seven-day-volume-breakdown",
    ".dashboard-food-summary-card"
  ]) {
    assert.match(styles, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(styles, /\.food-daily-summary[^}]*background:var\(--card\)!important/);
  assert.match(styles, /\.seven-day-volume-map-card[^}]*background:var\(--card\)!important/);
  assert.match(styles, /\.dashboard-calorie-arc-value\{stroke:var\(--accent\)!important/);
});

test("production entry points load the theme before paint and bust caches", async () => {
  const [html, app, router, worker] = await Promise.all([
    read("index.html"), read("js/app.js"), read("js/core/router.js"), read("service-worker.js")
  ]);
  assert.match(html, /level_up_appearance_settings/);
  assert.ok(html.indexOf("level_up_appearance_settings") < html.indexOf("css/styles.css"));
  assert.match(html, /css\/appearance-themes\.css\?v=appearance-themes-2/);
  assert.match(html, /js\/app\.js\?v=appearance-themes-1/);
  assert.match(app, /appearance-theme\.js\?v=appearance-themes-1/);
  assert.match(app, /router\.js\?v=appearance-themes-1/);
  assert.match(router, /more-ui-v2\.js\?v=appearance-themes-1/);
  assert.match(worker, /2026-09-01-89/);
});
