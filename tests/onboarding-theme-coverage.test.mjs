import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  html,
  audit,
  onboarding,
  units,
  muscles,
  acquisitionStyles,
  acquisitionScript,
  flow,
  nativePolish,
  installHelp,
  splitPreference,
  worker
] = await Promise.all([
  read("index.html"),
  read("css/theme-surface-audit.css"),
  read("css/onboarding.css"),
  read("css/onboarding-granular-units.css"),
  read("css/muscle-priority-cards.css"),
  read("css/acquisition.css"),
  read("js/analytics/acquisition.js"),
  read("css/onboarding-flow-integration.css"),
  read("css/native-ios-polish.css"),
  read("js/onboarding/onboarding-install-help.js"),
  read("js/workouts/smart-build-split-preference.js"),
  read("service-worker.js")
]);

test("the authoritative theme layer loads after every static onboarding override", () => {
  const auditPosition = html.indexOf("css/theme-surface-audit.css");
  const earlierSheets = [
    "css/onboarding.css",
    "css/onboarding-granular-units.css",
    "css/onboarding-flow-integration.css",
    "css/muscle-priority-cards.css",
    "css/native-ios-polish.css"
  ];

  assert.ok(auditPosition >= 0);
  for (const sheet of earlierSheets) {
    assert.ok(html.indexOf(sheet) >= 0, `${sheet} is loaded`);
    assert.ok(html.indexOf(sheet) < auditPosition, `${sheet} loads before the authority layer`);
  }
});

test("the audit covers every onboarding shell, navigation, and typography surface", () => {
  for (const selector of [
    ".levelup-onboarding {",
    ".levelup-onboarding-shell {",
    ".levelup-onboarding-progress {",
    ".levelup-onboarding-progress span {",
    ".levelup-onboarding-footer {",
    ".levelup-onboarding-topbar strong",
    ".onboarding-screen h1",
    ".onboarding-screen h2",
    ".onboarding-screen h3",
    ".onboarding-screen > p",
    ".onboarding-helper",
    ".levelup-onboarding .eyebrow"
  ]) assert.ok(audit.includes(selector), `${selector} follows theme tokens`);

  assert.match(audit, /\.levelup-onboarding-shell\s*\{[\s\S]*?background:\s*var\(--bg\)\s*!important/);
  assert.match(audit, /\.levelup-onboarding-footer\s*\{[\s\S]*?background:\s*var\(--nav-bg\)\s*!important/);
});

test("all onboarding cards, choices, fields, and completion summaries are theme-owned", () => {
  for (const selector of [
    ".onboarding-option,",
    ".onboarding-chip,",
    ".onboarding-no-priority,",
    ".onboarding-unit-row,",
    ".onboarding-exercise-row,",
    ".onboarding-summary > div,",
    ".onboarding-nutrition-preview > div,",
    ".onboarding-theme-card,",
    ".onboarding-unit-row button,",
    ".onboarding-unit-choice button,",
    ".onboarding-profile-grid input,",
    ".onboarding-profile-grid select,",
    ".onboarding-exercise-picker input,",
    ".onboarding-acquisition-other input"
  ]) assert.ok(audit.includes(selector), `${selector} is covered`);

  assert.match(audit, /background:\s*var\(--card\)\s*!important/);
  assert.match(audit, /background:\s*var\(--surface-raised\)\s*!important/);
  assert.match(audit, /background:\s*var\(--input-bg\)\s*!important/);
  assert.match(audit, /\.levelup-onboarding select option/);
  assert.match(audit, /:is\(input, textarea\)::placeholder/);
});

test("selected and action states use the active appearance accent", () => {
  for (const selector of [
    ".onboarding-option.selected,",
    ".onboarding-chip.selected,",
    ".onboarding-no-priority.selected,",
    ".onboarding-unit-row button.selected,",
    ".onboarding-unit-choice button.selected,",
    ".onboarding-theme-card.selected",
    ".onboarding-selected-exercise",
    ".onboarding-exercise-row b",
    ".primary-btn, [data-onboarding-next]",
    ".secondary-btn, [data-onboarding-back]"
  ]) assert.ok(audit.includes(selector), `${selector} has a theme state`);

  assert.match(audit, /background:\s*var\(--accent-soft\)\s*!important/);
  assert.match(audit, /background:\s*var\(--accent\)\s*!important/);
  assert.match(audit, /color:\s*var\(--accent-contrast\)\s*!important/);
  assert.match(audit, /\.onboarding-theme-check\s*\{[\s\S]*?-webkit-text-fill-color:\s*var\(--accent-contrast\)/);
});

test("theme thumbnails keep their own preview palettes", () => {
  assert.match(onboarding, /\.onboarding-theme-card \.appearance-theme-preview/);
  assert.doesNotMatch(audit, /\.appearance-theme-preview\s*\{[^}]*background:\s*var\(--card\)/s);
  assert.doesNotMatch(audit, /\.appearance-preview-(?:top|card|nav)[^{]*\{[^}]*background:\s*var\(--accent\)/s);
});

test("muscle priority visualization has no fixed red or dark selected state at runtime", () => {
  assert.match(muscles, /#ef181f|rgba\(239,24,31/);
  for (const selector of [
    ".muscle-priority-card {",
    ".muscle-priority-card.selected {",
    ".form-guide-muscle-highlight {",
    ".muscle-priority-label {",
    ".muscle-priority-card.selected .muscle-priority-label {",
    ".muscle-priority-check {",
    ".muscle-priority-card:focus-visible {"
  ]) assert.ok(audit.includes(selector), `${selector} is overridden semantically`);

  assert.match(audit, /fill:\s*var\(--accent\)\s*!important/);
  assert.match(audit, /filter:\s*drop-shadow\(0 0 5px var\(--accent-glow\)\)\s*!important/);
});

test("late-injected install help and split copy cannot leak fixed colors", () => {
  assert.match(installHelp, /background:#15151a/);
  assert.match(splitPreference, /color: #d7d7dc/);

  for (const selector of [
    ".onboarding-install-card {",
    ".onboarding-install-icon,",
    ".onboarding-install-step-number {",
    ".onboarding-install-tab,",
    ".onboarding-install-steps li",
    ".onboarding-install-tab.selected",
    ".onboarding-install-installed {",
    ".onboarding-install-installed-dot {",
    ".split-selected-copy strong"
  ]) assert.ok(audit.includes(selector), `${selector} has a high-specificity override`);

  assert.match(audit, /\.onboarding-install-copy h3,[\s\S]*?color:\s*var\(--heading\)\s*!important/);
  assert.match(audit, /\.onboarding-install-installed\s*\{[\s\S]*?color:\s*var\(--success-text\)\s*!important/);
});

test("known fixed-color source files are all represented in the final audit", () => {
  assert.match(units, /background:#141419/);
  assert.match(acquisitionStyles, /background:\s*#15151a/);
  assert.match(acquisitionScript, /link\.href="css\/acquisition\.css/);
  assert.match(flow, /background:var\(--card,#15151a\)/);
  assert.match(nativePolish, /\.levelup-onboarding-shell/);

  assert.ok(audit.includes(".onboarding-unit-row,"));
  assert.ok(audit.includes(".onboarding-acquisition-other input"));
  assert.ok(audit.includes(".onboarding-nutrition-preview > div,"));
  assert.match(audit, /\.levelup-onboarding-shell\s*\{[\s\S]*?background:\s*var\(--bg\)\s*!important/);
});

test("the onboarding theme correction advances the offline cache", () => {
  assert.match(worker, /2026-09-02-142/);
});
