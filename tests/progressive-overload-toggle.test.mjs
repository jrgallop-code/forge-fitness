import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { PROGRESSIVE_OVERLOAD_KEY, isProgressiveOverloadEnabled, setProgressiveOverloadEnabled } from '../js/core/progressive-overload-preferences.js';
import { renderProgressiveOverloadSettings } from '../js/more/progressive-overload-settings.js';

test('guidance defaults on and persists an explicit off/on preference', () => {
  const previous = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    assert.equal(isProgressiveOverloadEnabled(), true);
    assert.match(renderProgressiveOverloadSettings(), /data-progression-enabled checked/);
    assert.equal(setProgressiveOverloadEnabled(false), false);
    assert.equal(values.get(PROGRESSIVE_OVERLOAD_KEY), 'false');
    assert.equal(isProgressiveOverloadEnabled(), false);
    assert.doesNotMatch(renderProgressiveOverloadSettings(), /data-progression-enabled checked/);
    assert.equal(setProgressiveOverloadEnabled(true), true);
    assert.equal(isProgressiveOverloadEnabled(), true);
  } finally { globalThis.localStorage = previous; }
});

test('a storage failure does not pretend that disabling guidance saved', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null, setItem() { throw new Error('full'); } };
  try { assert.equal(setProgressiveOverloadEnabled(false), true); }
  finally { globalThis.localStorage = previous; }
});

test('disabled guidance clears prompts and restores historical placeholders without changing entered values', () => {
  const source = readFileSync(new URL('../js/workouts/progression-prompt-v2.js', import.meta.url), 'utf8');
  let enabled = false, liveCalls = 0;
  const context = vm.createContext({ isProgressiveOverloadEnabled: () => enabled, getExerciseById: () => ({ equipment: 'Cable' }), isBodyweightEquipment: () => false, isWeightedBodyweightEquipment: () => false });
  vm.runInContext(source.replace(/^import[\s\S]*?;\n/gm, '').replace(/export /g, '').split('const observer =')[0], context);
  const weight = { value: '110', placeholder: '120' }, reps = { value: '', placeholder: '16' };
  const prompt = { hidden: false, innerHTML: 'Increase weight', classList: { remove() {} } };
  const card = { dataset: { exerciseId: 'cable-fly', trackingType: 'reps', exerciseIndex: '0' }, closest: () => ({ dataset: {} }) };
  context.findPreviousPerformance = () => ({ performance: {} });
  context.syncPreviousDisplay = () => { weight.placeholder = '100'; reps.placeholder = '15'; };
  context.ensurePrompt = () => prompt;
  context.readJson = () => ({ trainingDayIndex: 0, planSnapshot: { days: [{ exercises: [{ reps: '15-20' }] }] } });
  context.shouldUseLiveSetGuidance = () => true;
  context.renderLiveSetPrompt = () => { liveCalls++; prompt.hidden = false; prompt.innerHTML = 'Guidance restored'; return true; };
  context.renderCard(card);
  assert.equal(prompt.hidden, true);
  assert.equal(prompt.innerHTML, '');
  assert.equal(liveCalls, 0);
  assert.equal(weight.value, '110');
  assert.equal(reps.placeholder, '15');
  enabled = true;
  context.renderCard(card);
  assert.equal(liveCalls, 1);
  assert.equal(prompt.hidden, false);
});

test('the logger refreshes for setting changes and changes from another tab', () => {
  const source = readFileSync(new URL('../js/workouts/progression-prompt-v2.js', import.meta.url), 'utf8');
  const listeners = new Map();
  const context = vm.createContext({ PROGRESSIVE_OVERLOAD_KEY, PROGRESSIVE_OVERLOAD_EVENT: 'levelup:progressive-overload-changed', window: { addEventListener: (name, fn) => listeners.set(name, fn) }, document: { getElementById: () => null, body: {} }, MutationObserver: class { observe() {} } });
  vm.runInContext(source.replace(/^import[\s\S]*?;\n/gm, '').replace(/export /g, ''), context);
  assert.equal(typeof listeners.get('levelup:progressive-overload-changed'), 'function');
  let refreshes = 0;
  context.scan = () => { refreshes++; };
  listeners.get('storage')({ key: PROGRESSIVE_OVERLOAD_KEY });
  assert.equal(refreshes, 1);
  listeners.get('storage')({ key: 'unrelated' });
  assert.equal(refreshes, 1);
});
