import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("appearance system provides system plus seven curated themes", async () => {
  const source = await read("js/core/appearance-theme.js");
  for (const theme of ["system", "level-up", "arctic", "pure", "ocean", "midnight", "slate", "pulse"]) {
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
  assert.match(settings, /more-appearance-icon/);
  assert.match(settings, /<circle cx="7\.2" cy="11\.8" r="1"\/>/);
});

test("theme stylesheet separates accents from semantic status colours", async () => {
  const styles = await read("css/appearance-themes.css");
  for (const theme of ["level-up", "arctic", "pure", "ocean", "midnight", "slate", "pulse"]) {
    assert.match(styles, new RegExp(`html\\[data-theme="${theme}"\\]`));
  }
  assert.match(styles, /--accent:/);
  assert.match(styles, /--text-secondary:/);
  assert.match(styles, /--success:#22c55e/);
  assert.match(styles, /--warning:#f59e0b/);
  assert.match(styles, /--danger:#ef4444/);
  assert.match(styles, /--activity-workout:var\(--accent\)/);
  assert.match(styles, /--activity-weight:var\(--success\)/);
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
  assert.match(styles, /\.smart-coach-ring-progress\{stroke:var\(--accent\)!important/);
  assert.match(styles, /\.smart-build-progress span[^}]*background:var\(--accent\)!important/);
  assert.match(styles, /\.adaptive-beta-badge[^}]*background:var\(--accent-soft\)!important/);
});

test("theme text tokens meet WCAG AA contrast on cards", () => {
  const palettes = [
    ["Level Up", "#1c1c22", "#18181d", "#f7f7f8", "#c4c4ca", "#9b9ba5", "#ff6670", "#df141e", "#ffffff"],
    ["Arctic", "#ffffff", "#edf3fb", "#10203a", "#34445f", "#526079", "#0e4fb3", "#1769e0", "#ffffff"],
    ["Pure", "#ffffff", "#ededeb", "#202022", "#454549", "#626267", "#171719", "#171719", "#ffffff"],
    ["Ocean", "#ffffff", "#e3f4ff", "#123252", "#344f68", "#506b82", "#0676ad", "#0798d9", "#07233f"],
    ["Midnight", "#132238", "#101d31", "#f5f8ff", "#bac7da", "#92a3bd", "#7eb0ff", "#3478f6", "#050b17"],
    ["Slate", "#1d2630", "#1a222c", "#eef3f7", "#bec9d2", "#9aa8b4", "#a9c8e4", "#7396b8", "#071018"],
    ["Pulse", "#1d101c", "#291528", "#fff7fc", "#d9bfd1", "#b792aa", "#ff5cad", "#ff2d95", "#160912"]
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
  for (const [name, card, raised, text, secondary, muted, accentText, accent, accentContrast] of palettes) {
    assert.ok(ratio(card, text) >= 4.5, `${name} primary text contrast`);
    assert.ok(ratio(card, secondary) >= 4.5, `${name} secondary text contrast`);
    assert.ok(ratio(raised, secondary) >= 4.5, `${name} secondary text on raised surfaces`);
    assert.ok(ratio(card, muted) >= 4.5, `${name} muted text contrast`);
    assert.ok(ratio(raised, muted) >= 4.5, `${name} muted text on raised surfaces`);
    assert.ok(ratio(card, accentText) >= 4.5, `${name} accent text contrast`);
    assert.ok(ratio(accent, accentContrast) >= 4.5, `${name} filled control contrast`);
  }
});

test("saved plans and generated workout rows never use fixed light text", async () => {
  const [styles, planRows, planDetails] = await Promise.all([
    read("css/appearance-themes.css"),
    read("css/workout-plan-rows.css"),
    read("css/workout-plan-details.css")
  ]);
  for (const selector of [
    "#saved-plan-list .preset-plan-card h4",
    ".plan-detail-exercise-name",
    ".smart-review-day summary>strong",
    ".smart-review-day p>span"
  ]) {
    assert.ok(styles.includes(selector), `${selector} should use theme typography`);
  }
  assert.match(planRows, /color:var\(--heading/);
  assert.match(planRows, /color:var\(--text-secondary/);
  assert.match(planDetails, /color:var\(--heading/);
  assert.match(planDetails, /color:var\(--text-secondary/);
});

test("late-loaded insights, lessons, and calendar cards follow the active theme", async () => {
  const styles = await read("css/appearance-themes.css");
  for (const selector of [
    ".weight-carbs-info-v2>div",
    ".weight-carbs-tooltip-v2",
    ".weight-carbs-analysis-v2",
    ".learn-lesson-list",
    ".learn-lesson-copy strong",
    ".activity-calendar-page",
    ".activity-calendar-event"
  ]) {
    assert.ok(styles.includes(selector), `${selector} should use theme surfaces and text`);
  }
  assert.match(styles, /\.weight-carbs-tooltip-v2[^}]*background:var\(--card\)!important/);
  assert.match(styles, /\.learn-lesson-copy strong[^}]*color:var\(--heading\)!important/);
  assert.match(styles, /\.activity-calendar-event\{[^}]*background:var\(--surface-raised\)!important/);
});

test("activity calendar uses theme accents and Arctic blue plus green", async () => {
  const [styles, calendar] = await Promise.all([
    read("css/appearance-themes.css"),
    read("css/activity-calendar.css")
  ]);
  assert.match(styles, /html\[data-theme="arctic"\][^{]*\{[^}]*--activity-workout:#1769e0;--activity-weight:#22b86a/);
  assert.match(calendar, /--activity-calendar-ring: var\(--activity-workout, var\(--accent/);
  assert.match(calendar, /--activity-calendar-ring: var\(--activity-weight, var\(--success/);
  assert.match(calendar, /activity-calendar-event--workout > i[^{]*\{[^}]*var\(--activity-workout/);
  assert.match(calendar, /activity-calendar-event--weight > i[^{]*\{[^}]*var\(--activity-weight/);
  assert.match(styles, /activity-calendar-day\.is-selected>span[^}]*background:var\(--accent-soft\)!important/);
});

test("form-guide SVGs and full-screen shells use theme-safe surfaces", async () => {
  const styles = await read("css/appearance-themes.css");
  for (const selector of [
    ".exercise-guide-screen",
    ".exercise-guide-hero-figure",
    ".exercise-guide-video-card",
    ".exercise-guide-anatomy-tile .form-guide-muscle-svg",
    ".exercise-guide-screen .form-guide-muscle-highlight",
    "html[data-theme-mode=\"light\"] .activity-calendar-page"
  ]) {
    assert.ok(styles.includes(selector), `${selector} should follow the active theme`);
  }
  assert.match(styles, /\.exercise-guide-anatomy-tile \.form-guide-muscle-svg[^}]*background:var\(--surface\)!important/);
  assert.match(styles, /\.exercise-guide-screen \.form-guide-muscle-highlight[^}]*fill:var\(--danger\)!important/);
  assert.match(styles, /html\[data-theme-mode="light"\] \.activity-calendar-page\{background:var\(--bg\)!important/);
});

test("Arctic overlays, form-guide copy, and canvas labels retain contrast", async () => {
  const [styles, trend, calories, carbs] = await Promise.all([
    read("css/appearance-themes.css"),
    read("js/progress/weight-trend-chart.js"),
    read("js/progress/weight-calorie-context.js"),
    read("js/progress/weight-chart-carousel-v2.js")
  ]);
  for (const selector of [
    ".weight-point-tooltip",
    ".weight-calories-tooltip",
    ".weight-calories-info>div",
    ".recovery-dual-map-card",
    ".recovery-breakdown-card",
    "html[data-theme-mode=\"light\"] .exercise-guide-screen"
  ]) assert.ok(styles.includes(selector), `${selector} should be contrast-safe`);
  assert.match(styles, /\.recovery-dual-layout :where\(\.recovery-dual-map-card,\.recovery-breakdown-card\)[^}]*background:var\(--card\)!important/);
  assert.match(styles, /\.recovery-dual-layout :where\(\.recovery-breakdown-heading h4,\.recovery-scale::before\)[^}]*color:var\(--heading\)!important/);
  assert.match(styles, /\.weight-calories-tooltip \.is-calorie-value\{color:var\(--danger-text\)!important/);
  assert.match(styles, /\.exercise-guide-screen :where\(p,li\)\{color:var\(--text-secondary\)!important/);
  assert.match(styles, /\.adaptive-rir-toggle,\.adaptive-info-button\)[^{]*\{border-color:var\(--line\)!important;background:var\(--surface-raised\)!important;color:var\(--text\)!important/);
  assert.match(styles, /\.adaptive-info-sheet \.adaptive-info-scale>div\{border:1px solid var\(--line\)!important;background:var\(--surface-raised\)!important;color:var\(--text\)!important/);
  assert.match(calories, /\.weight-calories-tooltip\{[^}]*background:var\(--card\);color:var\(--text\)/);
  assert.match(calories, /\.weight-calories-info>div\{[^}]*background:var\(--card\);color:var\(--text\)/);
  assert.doesNotMatch(calories, /\.weight-calories-tooltip\{[^}]*background:rgba\(24,24,28/);
  assert.doesNotMatch(calories, /\.weight-calories-info>div\{[^}]*background:#202024/);
  for (const source of [trend, calories, carbs]) {
    assert.match(source, /themeColor\("--muted"/);
    assert.match(source, /themeColor\("--line"/);
  }
});

test("exercise analytics cards and lines inherit the Arctic blue palette", async () => {
  const [styles, chart, router] = await Promise.all([
    read("css/appearance-themes.css"),
    read("js/progress/exercise-progress-v2.js"),
    read("js/core/router.js")
  ]);
  assert.match(styles, /\.exercise-metric-controls button\[aria-pressed="true"\][^{]*\{border-color:var\(--accent\)!important;background:var\(--accent\)!important;color:var\(--accent-contrast\)!important/);
  assert.match(styles, /\.exercise-volume-stat\{border-color:var\(--line\)!important;background:var\(--surface-raised\)!important;color:var\(--text\)!important/);
  assert.match(styles, /\.exercise-volume-detail\{border:1px solid var\(--line\)!important;background:var\(--surface-raised\)!important;color:var\(--text-secondary\)!important/);
  assert.match(chart, /stroke="var\(--accent\)" stroke-width="3"/);
  assert.doesNotMatch(chart, /stroke="#ff3139"/);
  assert.match(router, /exercise-progress-v2\.js\?v=arctic-chart-tokens-1/);
});

test("production entry points load the theme before paint and bust caches", async () => {
  const [html, app, router, worker] = await Promise.all([
    read("index.html"), read("js/app.js"), read("js/core/router.js"), read("service-worker.js")
  ]);
  assert.match(html, /level_up_appearance_settings/);
  assert.ok(html.indexOf("level_up_appearance_settings") < html.indexOf("css/styles.css"));
  assert.match(html, /css\/appearance-themes\.css\?v=appearance-themes-13/);
  assert.match(html, /css\/activity-calendar\.css\?v=theme-accent-calendar-1/);
  assert.match(html, /css\/smart-build-coach-loading\.css\?v=theme-accent-calendar-1/);
  assert.match(html, /css\/cardio-analytics\.css\?v=theme-accent-calendar-1/);
  assert.match(html, /js\/app\.js\?v=theme-accent-calendar-1/);
  assert.match(html, /getHours\(\)/);
  assert.match(app, /appearance-theme\.js\?v=appearance-themes-3/);
  assert.match(app, /router\.js\?v=theme-accent-calendar-1/);
  assert.match(router, /more-ui-v2\.js\?v=pulse-theme-1/);
  assert.match(worker, /2026-09-01-108/);
});
