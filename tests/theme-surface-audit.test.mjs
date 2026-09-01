import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const styles = fs.readFileSync('css/theme-surface-audit.css', 'utf8');
const calorieStyles = fs.readFileSync('css/calorie-stats.css', 'utf8');
const manualSetup = fs.readFileSync('js/workouts/manual-plan-setup.js', 'utf8');
const manualCatalogue = fs.readFileSync('js/workouts/manual-builder-catalogue.js', 'utf8');
const planDetails = fs.readFileSync('css/workout-plan-details.css', 'utf8');
const restAlarm = fs.readFileSync('js/workouts/rest-alarm-phase1.js', 'utf8');
const globalRestAlarm = fs.readFileSync('js/workouts/rest-alarm-button-stability.js', 'utf8');
const cardioTimerStyles = fs.readFileSync('css/logger-cardio-timer.css', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

test('theme surface audit loads after the appearance stylesheet', () => {
  const appearance = html.indexOf('css/appearance-themes.css');
  const audit = html.indexOf('css/theme-surface-audit.css?v=theme-surface-audit-8');
  assert.ok(appearance >= 0);
  assert.ok(audit > appearance);
});

test('native iOS surfaces resolve through semantic theme tokens', () => {
  assert.match(styles, /--ios-surface-1:\s*var\(--card\)/);
  assert.match(styles, /--ios-surface-2:\s*var\(--surface-raised\)/);
  assert.match(styles, /--ios-surface-3:\s*var\(--input-bg\)/);
  assert.match(styles, /--ios-separator:\s*var\(--line\)/);
});

test('inactive navigation and segmented-control SVGs use the muted theme color', () => {
  assert.match(styles, /\.bottom-nav \.nav-btn:not\(\.active\) \.nav-icon/);
  assert.match(styles, /\.progress-tab:not\(\.active\) \.app-inline-icon/);
  assert.match(styles, /color:\s*var\(--theme-icon-muted\)\s*!important/);
});

test('light-theme anatomy SVGs use a darker neutral base', () => {
  assert.match(styles, /data-theme-mode="light"\] \.form-guide-anatomy-base/);
  assert.match(styles, /filter:\s*brightness\(\.68\) contrast\(1\.16\)\s*!important/);
  assert.match(styles, /\.recovery-user-muscle-base-fill/);
  assert.match(styles, /fill:\s*color-mix\(in srgb, var\(--text\) 58%, var\(--surface\)\)\s*!important/);
});

test('snapshot cards, selected tabs and analytics ranges are theme semantic', () => {
  assert.match(styles, /\.training-progress-disclosure-panel/);
  assert.match(styles, /background:\s*var\(--surface-raised\)\s*!important/);
  assert.match(styles, /\.training-progress-tab\.active/);
  assert.match(styles, /button\[aria-pressed="true"\]/);
  assert.match(styles, /background:\s*var\(--accent-soft\)\s*!important/);
});

test('adaptive guidance uses semantic full-screen and card surfaces', () => {
  assert.match(styles, /\.adaptive-flow-overlay/);
  assert.match(styles, /var\(--body-background\)\s*!important/);
  assert.match(styles, /\.adaptive-recovery-legend div/);
  assert.match(styles, /\.adaptive-post-flow \.adaptive-post-options/);
  assert.match(styles, /\.adaptive-choice, \.adaptive-rir-choice\)\.selected/);
  assert.match(styles, /color:\s*var\(--heading\)\s*!important/);
});

test('rest alarm follows selected theme instead of fixed black and red styling', () => {
  assert.match(styles, /#level-up-rest-alarm-banner/);
  assert.match(styles, /border-left-color:\s*var\(--accent\)\s*!important/);
  assert.match(styles, /\.rest-alarm-controls button\.rest-alarm-primary/);
  assert.match(styles, /background:\s*var\(--card\)\s*!important/);
  assert.match(styles, /#level-up-rest-alarm-banner\.is-complete/);
  assert.match(styles, /color:\s*var\(--success-text\)\s*!important/);
});

test('sticky rest alarm can collapse to a compact live countdown', () => {
  assert.match(restAlarm, /rest-alarm-mini/);
  assert.match(restAlarm, /data-rest-action="toggle-size"/);
  assert.match(restAlarm, /classList\.toggle\("is-minimized"\)/);
  assert.match(restAlarm, /if \(complete\) banner\.classList\.remove\("is-minimized"\)/);
  assert.match(globalRestAlarm, /compactAlarmMarkup/);
  assert.match(globalRestAlarm, /syncCompactState/);
  assert.match(styles, /#level-up-rest-alarm-banner\.is-minimized/);
  assert.match(styles, /\.rest-alarm-mini/);
});

test('More SVGs match main navigation contrast and Appearance uses a clear palette', () => {
  assert.match(styles, /\.more-menu-group \.more-menu-icon/);
  assert.match(styles, /color:\s*var\(--theme-icon-muted\)\s*!important/);
  assert.match(styles, /\.more-appearance-icon/);
  assert.match(styles, /stroke:\s*currentColor\s*!important/);
  assert.match(styles, /\.more-appearance-icon circle/);
});

test('Nutrition Progress cards and tracks use semantic theme surfaces', () => {
  assert.match(calorieStyles, /\.calorie-stat-bar>span,[\s\S]*background: var\(--surface-raised\) !important/);
  assert.match(calorieStyles, /calorie-stat-bar i\.target[\s\S]*background: var\(--success\) !important/);
  assert.match(calorieStyles, /calorie-stat-bar i\.outside[\s\S]*background: var\(--accent\) !important/);
  assert.match(calorieStyles, /calculated-maintenance-progress>i>b[\s\S]*linear-gradient\(90deg, var\(--accent\), var\(--success\)\)/);
  assert.match(styles, /\.calorie-stat-title, \.calorie-stat-section-title/);
});

test('late-loaded manual builder controls cannot restore black surfaces', () => {
  assert.match(manualSetup, /\.manual-setup-sets[^\n]*background:var\(--surface-raised/);
  assert.match(manualSetup, /\.builder-exercise-guide[^\n]*background:var\(--accent-soft\);color:var\(--accent-text\)/);
  assert.match(manualCatalogue, /\.manual-pick[^\n]*background:var\(--surface-raised/);
  assert.match(manualCatalogue, /\.manual-picker-footer[^\n]*background:var\(--nav-bg/);
  assert.doesNotMatch(manualSetup, /\.manual-setup-sets[^\n]*background:#0e0e11/);
  assert.match(styles, /#plan-builder\.manual-catalogue \.builder-exercise-guide/);
});

test('manual program exercises use a readable tap-to-edit list without truncation', () => {
  assert.match(manualSetup, /manual-setup-index-row/);
  assert.match(manualSetup, /Tap one to edit/);
  assert.match(manualSetup, /dataset\.setupSelect/);
  assert.match(manualSetup, /white-space:normal;overflow-wrap:anywhere/);
  assert.doesNotMatch(manualSetup, /manual-setup-index-copy strong[^\n]*text-overflow:ellipsis/);
  assert.doesNotMatch(manualCatalogue, /manual-pick-copy strong[^\n]*text-overflow:ellipsis/);
  assert.match(planDetails, /\.plan-detail-exercise-name\s*\{[\s\S]*white-space:\s*normal;[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(styles, /manual-setup-index-row\.is-active/);
});

test('light theme Form Guide actions force dark accent lettering', () => {
  assert.match(styles, /data-theme-mode="light"\] :is\(/);
  assert.match(styles, /\.manual-pick-guide/);
  assert.match(styles, /\.logger-form-guide-btn/);
  assert.match(styles, /-webkit-text-fill-color:\s*var\(--accent-text\)\s*!important/);
});

test('late-injected install guidance follows the selected theme', () => {
  assert.match(styles, /\.more-install-page, \.levelup-install-reminder/);
  assert.match(styles, /\.more-install-tab\.selected/);
  assert.match(styles, /\.levelup-install-reminder-save/);
});

test('cardio timer and previous-workout text follow every appearance theme', () => {
  assert.match(cardioTimerStyles, /\.cardio-stopwatch-display\s*\{[\s\S]*color:var\(--text, #fff\)/);
  assert.match(styles, /\.cardio-stopwatch-display, \.previous-performance strong/);
  assert.match(styles, /-webkit-text-fill-color:\s*var\(--text\)\s*!important/);
  assert.match(styles, /\.cardio-stopwatch-heading span/);
  assert.match(styles, /\.cardio-notes-toggle/);
});

test('dashboard workout breakdown action stays legible in every appearance', () => {
  assert.match(styles, /\.performance-dashboard-card \.performance-toggle/);
  assert.match(styles, /background:\s*var\(--accent-soft\)\s*!important/);
  assert.match(styles, /color:\s*var\(--accent-text\)\s*!important/);
  assert.match(styles, /-webkit-text-fill-color:\s*var\(--accent-text\)\s*!important/);
});

test('theme surface release advances the offline cache', () => {
  assert.match(worker, /2026-09-01-118/);
});
