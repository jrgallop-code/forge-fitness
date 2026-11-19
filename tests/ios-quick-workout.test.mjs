import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const quickLog = readFileSync('js/core/ios-quick-log.js', 'utf8');
const tracker = readFileSync('js/progress/weight-tracker.js', 'utf8');

function takeFunction(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Expected source block not found: ' + start);
  return source.slice(a, b).replace(/^export /, '');
}

test('iOS Log Photos opens the dedicated Progress Photos destination', () => {
  const open = takeFunction(quickLog, 'function openExisting(destination) {', '\\nfunction ensureNavigation()');
  const source = readFileSync('js/progress/progress-ui.js', 'utf8');
  const renderPhoto = takeFunction(source, 'export function renderPhotosProgressDestination() {', '\\nexport function renderProgress(');
  const router = readFileSync('js/core/router.js', 'utf8');
  const app = readFileSync('js/app.js', 'utf8');
  const tabs = {};
  const document = {
    querySelectorAll() { return [
      { dataset: { page:'progress' }, classList: { toggle(name, value) { tabs.progress = value; } } }
    ]; },
    dispatchEvent(event) { this.navigation = event.detail; }
  };
  const context = vm.createContext({
    document, closeSheet(){},
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  });
  vm.runInContext(open + '\\nopenExisting("photos");', context);
  assert.equal(document.navigation.page, 'progress-photos', 'Log shortcut must not navigate to generic Progress');
  assert.equal(tabs.progress, true, 'Bottom Progress tab should be active');

  const html = vm.runInNewContext(renderPhoto + '\\nrenderPhotosProgressDestination()', {
    renderPhotoJournal: () => '<section class="photo-journal"><input id="photo-journal-date"><button id="save-photo-journal-btn">Save Photo</button></section>'
  });
  assert.match(html, /data-progress-destination="photo"/);
  assert.match(html, /id="photo-log-tab"/);
  assert.match(html, /class="progress-tab active"\\s+id="photo-log-tab"/);
  assert.match(html, /id="photo-log-progress"/);
  assert.match(html, /id="save-photo-journal-btn"/);
  assert.doesNotMatch(html, /id="lifting-progress"|id="weight-progress"/, 'The overview panels must not be rendered first');
  assert.match(router, /case "progress-photos":/);
  assert.match(router, /content\\.innerHTML = renderPhotosProgressDestination\\(\\)/);
  assert.match(router, /safeInitialize\\("Progress photos", initializePhotoJournal\\)/);
  assert.match(app, /page==="progress-photos"\\)\\?"progress"/);
});

test('Quick Workout reuses existing workout functions and preserves the PWA gate', () => {
  assert.match(quickLog, /window\.Capacitor\?\.isNativePlatform/);
  assert.match(quickLog, /getPlatform\?\.\(\) === "ios"/);
  assert.match(quickLog, /data-ql-workout="resume"/);
  assert.match(quickLog, /data-ql-workout="today"/);
  assert.match(quickLog, /data-ql-workout="repeat"/);
  assert.doesNotMatch(quickLog, /data-ql-workout="empty"/);
  assert.match(quickLog, /data-ql-workout="smart"/);
  assert.match(quickLog, /data-ql-workout="manual"/);
  assert.match(quickLog, /data-ql-workout="import"/);
  assert.match(quickLog, /data-ql-workout="routine"/);
  assert.match(quickLog, /openActiveWorkout\(\)/);
  assert.match(quickLog, /openWorkoutLogger\(plan\)/);
  assert.match(quickLog, /data-workout-live-new-plan/);
  assert.match(quickLog, /data-workout-live-create-action/);
  assert.match(quickLog, /levelup:navigate/);
});


test('Quick Log Nutrition respects the existing feature toggle and balances five tiles', () => {
  const css = readFileSync('css/ios-quick-log.css', 'utf8');
  assert.match(quickLog, /import \{ isNutritionEnabled \} from "\.\/app-feature-preferences\.js/);
  assert.match(quickLog, /const showNutrition = isNutritionEnabled\(\)/);
  assert.match(quickLog, /ios-quick-log-grid\$\{showNutrition \? "" : " is-five"\}/);
  assert.match(quickLog, /showNutrition \? `<button type="button" data-ql-action="food"/);
  assert.match(css, /\.ios-quick-log-grid\.is-five\s*\{\s*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /\.ios-quick-log-grid\.is-five > button:nth-child\(4\)/);
});
