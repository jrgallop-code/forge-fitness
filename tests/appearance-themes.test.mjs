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
  assert.match(source, /SYSTEM_DAY_START_HOUR = 7/);
  assert.match(source, /SYSTEM_NIGHT_START_HOUR = 19/);
  assert.match(source, /resolveSystemThemeForHour/);
  assert.match(source, /now\.getHours\(\)/);
  assert.match(source, /visibilitychange/);
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

test("late-loading feature cards and controls retain theme contrast", async () => {
  const styles = await read("css/appearance-themes.css");
  for (const selector of [
    ".weight-table",
    ".admin-analytics-kpi",
    ".profile-sex-options label",
    ".history-workout-card",
    ".muscle-overview-recovery-panel .recovery-map-shell",
    ".level-up-coach-launcher",
    ".food-voice-open",
    ".food-edit-calorie-ring::before",
    ".nutrition-planner-back"
  ]) {
    assert.match(styles, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(styles, /\.level-up-workout-actions strong\{color:var\(--text\)!important/);
  assert.match(styles, /\.food-entry-edit>b[^}]*color:var\(--text\)!important/);
});

test("builder, priority, and training analytics surfaces use live theme tokens", async () => {
  const [styles, strengthChart, trainingChart, weeklyChart] = await Promise.all([
    read("css/appearance-themes.css"),
    read("js/progress/strength-index-chart-renderer.js"),
    read("js/progress/training-bar-chart-renderer.js"),
    read("js/progress/weekly-workouts-seven-week.js")
  ]);
  for (const selector of [
    ".plan-builder",
    ".manual-pick",
    ".exercise-filter-card",
    ".muscle-priority-card",
    "#overall-strength-index-chart",
    "#weekly-workouts-seven-week-chart",
    ".strength-index-summary"
  ]) {
    assert.match(styles, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const renderer of [strengthChart, trainingChart, weeklyChart]) {
    assert.match(renderer, /getComputedStyle\(document\.documentElement\)/);
    assert.match(renderer, /--accent/);
    assert.match(renderer, /--muted/);
    assert.match(renderer, /--line/);
  }
});

test("theme text tokens meet WCAG AA contrast on cards", () => {
  const palettes = [
    ["Level Up", "#1c1c22", "#f7f7f8", "#9b9ba5", "#ff6670", "#df141e", "#ffffff"],
    ["Arctic", "#ffffff", "#10203a", "#647188", "#0e4fb3", "#1769e0", "#ffffff"],
    ["Pure", "#ffffff", "#202022", "#747478", "#171719", "#171719", "#ffffff"],
    ["Ocean", "#ffffff", "#123252", "#61798f", "#0676ad", "#0798d9", "#07233f"],
    ["Midnight", "#132238", "#f5f8ff", "#92a3bd", "#7eb0ff", "#3478f6", "#050b17"],
    ["Slate", "#1d2630", "#eef3f7", "#9aa8b4", "#a9c8e4", "#7396b8", "#071018"]
  ];
  const luminance = hex => {
    const channels = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
  };
  const ratio = (first, second) => {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + .05) / (values[1] + .05);
  };
  for (const [name, card, text, muted, accentText, accent, accentContrast] of palettes) {
    assert.ok(ratio(card, text) >= 4.5, `${name} primary text contrast`);
    assert.ok(ratio(card, muted) >= 4.5, `${name} secondary text contrast`);
    assert.ok(ratio(card, accentText) >= 4.5, `${name} accent text contrast`);
    assert.ok(ratio(accent, accentContrast) >= 4.5, `${name} filled control contrast`);
  }
});

test("production entry points load the theme before paint and bust caches", async () => {
  const [html, app, router, worker] = await Promise.all([
    read("index.html"), read("js/app.js"), read("js/core/router.js"), read("service-worker.js")
  ]);
  assert.match(html, /level_up_appearance_settings/);
  assert.ok(html.indexOf("level_up_appearance_settings") < html.indexOf("css/styles.css"));
  assert.match(html, /css\/appearance-themes\.css\?v=appearance-themes-4/);
  assert.match(html, /js\/app\.js\?v=appearance-themes-2/);
  assert.match(html, /getHours\(\)/);
  assert.match(app, /appearance-theme\.js\?v=appearance-themes-2/);
  assert.match(app, /router\.js\?v=appearance-themes-2/);
  assert.match(router, /more-ui-v2\.js\?v=appearance-themes-2/);
  assert.match(worker, /2026-09-01-91/);
});
