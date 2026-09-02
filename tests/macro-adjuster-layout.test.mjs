import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const energy = fs.readFileSync('js/nutrition/energy-profile.js', 'utf8');
const manual = fs.readFileSync('js/nutrition/manual-macros.js', 'utf8');
const styles = fs.readFileSync('css/manual-macros.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const router = fs.readFileSync('js/core/router.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

const macroView = energy.slice(
  energy.indexOf('data-planner-view="macros"'),
  energy.indexOf('</section>\n    `;')
);

test('macro goals use a compact MyFitnessPal-style breakdown and balance control', () => {
  assert.match(macroView, /<h2>Macro Goals<\/h2>/);
  assert.match(macroView, /macro-goals-overview/);
  assert.match(macroView, /<output id="nutrition-macro-calories" hidden aria-hidden="true">/);
  assert.match(macroView, /macro-distribution-track/);
  assert.match(macroView, /data-macro-percent="carbs"/);
  assert.match(macroView, /data-macro-percent="fat"/);
  assert.match(macroView, /data-macro-percent="protein"/);
  assert.match(macroView, /Macro balance/);
  assert.match(macroView, /data-macro-handle="carbs"/);
  assert.match(macroView, /data-macro-handle="fat"/);
  assert.doesNotMatch(macroView, /macro-calorie-total|daily target|Calorie & Macro Goals/);
  assert.doesNotMatch(macroView, /Calories Used/);
  assert.doesNotMatch(macroView, /weight-summary nutrition-energy-summary/);
});

test('custom macro mode keeps direct editing, persistence and live calorie math', () => {
  assert.match(macroView, /data-manual-macro-fields/);
  assert.match(macroView, /data-manual-macro="carbs"/);
  assert.match(macroView, /data-manual-macro="fat"/);
  assert.match(macroView, /data-manual-macro="protein"/);
  assert.match(manual, /option\.textContent = "Custom"/);
  assert.match(manual, /calories\.protein \+ calories\.carbs \+ calories\.fat/);
  assert.match(manual, /manualMacros: macros/);
  assert.match(manual, /Custom macro targets saved/);
  assert.match(manual, /updateDistribution\(percent\)/);
  assert.doesNotMatch(manual, /Custom macros (?:match|total)/);
});

test('macro balance handles support touch, pointer and keyboard adjustment', () => {
  assert.match(manual, /pointerdown/);
  assert.match(manual, /setPointerCapture/);
  assert.match(manual, /ArrowLeft/);
  assert.match(manual, /applyCustomPercentages/);
  assert.match(manual, /targetCalories \* percent\.fat \/ 100\) \/ 9/);
  assert.match(styles, /touch-action: none/);
  assert.match(styles, /--macro-carb-end/);
  assert.match(styles, /--macro-fat-end/);
});

test('macro colors and controls match the existing Level Up nutrition system', () => {
  assert.match(styles, /--macro-carbs-color: #4fa8ff/);
  assert.match(styles, /--macro-fat-color: #8b7cf6/);
  assert.match(styles, /--macro-protein-color: #39d7ae/);
  assert.match(styles, /var\(--card/);
  assert.match(styles, /var\(--heading/);
  assert.match(styles, /@media \(max-width: 420px\)/);
});

test('the redesigned adjuster ships with fresh browser and app cache keys', () => {
  assert.match(index, /css\/manual-macros\.css\?v=food-log-macro-bars-1/);
  assert.match(index, /js\/nutrition\/manual-macros\.js\?v=food-log-macro-bars-1/);
  assert.match(router, /energy-profile\.js\?v=food-log-macro-bars-1/);
  assert.match(worker, /2026-09-02-141/);
});
