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

test('iOS Log Photos opens the Photos progress panel, not the default overview', () => {
  const select = takeFunction(tracker, 'export function selectProgressTab(', '\nfunction initializeProgressTabs()');
  const open = takeFunction(quickLog, 'function openExisting(destination) {', '\nfunction ensureNavigation()');
  const keys = {
    weight: ['weight-tab','weight-progress'],
    lifting: ['lifting-tab','lifting-progress'],
    nutrition: ['nutrition-progress-tab','calorie-progress'],
    cardio: ['cardio-progress-tab','cardio-progress'],
    steps: ['steps-progress-tab','steps-progress'],
    photo: ['photo-log-tab','photo-log-progress']
  };
  const elements = {};
  for (const [name, [tabId, panelId]] of Object.entries(keys)) {
    elements[tabId] = {
      id: tabId, offsetLeft: name === 'photo' ? 550 : 0, offsetWidth: 110,
      classList: {
        active: false,
        toggle(token, enabled) { if (token === 'active') this.active = enabled; },
        contains(token) { return token === 'active' && this.active; }
      },
      setAttribute(name, value) { this[name] = value; },
      click() { this.clicked = (this.clicked || 0) + 1; if (name === 'photo') selectPhoto(); }
    };
    elements[panelId] = { hidden: name !== 'lifting', scrollIntoView() { this.scrolled = true; } };
  }
  const strip = {clientWidth: 350, scrollLeft: 0, dataset:{}};
  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelector(selector) { return selector === '.progress-tabs' ? strip : null; },
    querySelectorAll() { return []; }
  };
  let destination = null;
  const context = vm.createContext({
    document, window: { dispatchEvent(){} }, requestAnimationFrame: fn => fn(),
    closeSheet(){},
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } }
  });
  const selectPhoto = () => vm.runInContext('selectProgressTab("photo", { center: false })', context);
  document.dispatchEvent = event => { destination = event.detail; };
  vm.runInContext(select + '\n' + open + '\nopenExisting("photos");', context);
  assert.equal(destination.page, 'progress');
  assert.equal(destination.tab, 'photo');
  assert.equal(elements['photo-log-progress'].hidden, false);
  assert.equal(elements['lifting-progress'].hidden, true);
  assert.equal(elements['photo-log-tab'].classList.active, true);
  assert.equal(elements['lifting-tab'].classList.active, false);
  assert.ok(strip.scrollLeft > 0, 'Photos tab should scroll into view');
  assert.ok(elements['photo-log-tab'].clicked >= 1, 'The actual Photos tab must be clicked');
  assert.equal(elements['photo-log-progress'].scrolled, true, 'The Photos journal should be the visible destination');
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
