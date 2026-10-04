import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../js/workouts/progression-prompt-v2.js', import.meta.url), 'utf8');
function fixture(reps = 15, completed = true) {
  const context = vm.createContext({
    UNIT_KINDS: { LIFTING_WEIGHT: 'liftingWeight' },
    getExerciseById: () => ({ equipment: 'Cable' }),
    canonicalInputValue: input => input.value === '' ? null : Number(input.value) / 0.45359237,
    formatUnitMass: value => `${Math.round(value * 0.45359237 * 10) / 10} kg`,
    setCanonicalUnitPlaceholder: (input, value) => { input.placeholder = String(Math.round(value * 0.45359237 * 10) / 10); }
  });
  vm.runInContext(source.replace(/^import[\s\S]*?;\n/gm, '').replace(/export /g, '').split('const observer =')[0], context);
  const rows = [true, false, false].map((done, index) => {
    const weight = { value: index === 0 ? '80' : '' };
    const repInput = { value: index === 0 ? String(reps) : '' };
    return { weight, repInput, classList: { contains: () => index === 0 && completed && done },
      querySelector: selector => selector === '.session-weight' ? weight : repInput };
  });
  const prompt = { hidden: true, innerHTML: '', classList: { toggle() {} } };
  const card = { querySelectorAll: () => rows };
  return { context, rows, prompt, card };
}
test('80 kg x 15 replaces prior guidance and targets 80 kg x 15', () => {
  const f = fixture();
  assert.equal(f.context.renderLiveSetPrompt(f.card, f.prompt, {lower:15, upper:20}, 'curl'), true);
  assert.match(f.prompt.innerHTML, /80 kg × 15 reps/);
  assert.equal(f.rows[1].weight.placeholder, '80');
  assert.equal(f.rows[1].repInput.placeholder, '15');
  assert.equal(f.rows[0].weight.value, '80');
});
test('top-range set never increases weight within this session', () => {
  const f = fixture(20);
  f.context.renderLiveSetPrompt(f.card, f.prompt, {lower:15, upper:20}, 'curl');
  assert.match(f.prompt.innerHTML, /80 kg × 20 reps/);
  assert.match(f.prompt.innerHTML, /Keep this weight today/);
  assert.equal(f.rows[1].weight.placeholder, '80');
});
test('above-range reps are capped without increasing weight', () => {
  const f = fixture(25);
  f.context.renderLiveSetPrompt(f.card, f.prompt, {lower:15, upper:20}, 'curl');
  assert.match(f.prompt.innerHTML, /80 kg × 20 reps/);
});
test('uncompleted or undone sets cannot replace previous-workout guidance', () => {
  const f = fixture(15, false);
  assert.equal(f.context.renderLiveSetPrompt(f.card, f.prompt, {lower:15, upper:20}, 'curl'), false);
  assert.equal(f.prompt.hidden, true);
});
test('live target follows the latest valid load, including a decrease', () => {
  const f = fixture();
  const target = f.context.getLiveSetTarget([{weight:176.37,reps:20},{weight:154.32,reps:16}], {lower:15,upper:20});
  assert.equal(target.weight, 154.32);
  assert.equal(target.reps, 16);
});
test('entered remaining-set values are preserved', () => {
  const f = fixture(); f.rows[1].weight.value = '75'; f.rows[1].repInput.value = '16';
  f.context.renderLiveSetPrompt(f.card, f.prompt, {lower:15,upper:20}, 'curl');
  assert.equal(f.rows[1].weight.value, '75'); assert.equal(f.rows[1].repInput.value, '16');
});

test('following 100 lb prescription keeps the original per-set rep guidance', () => {
  const f = fixture();
  f.rows[0].weight.value = String(100 * 0.45359237);
  const source = { performance: { sets: [{weight:100,reps:12,completed:true}, {weight:100,reps:12,completed:true}, {weight:100,reps:9,completed:true}] } };
  assert.equal(f.context.shouldUseLiveSetGuidance(f.card, source, {lower:8,upper:15}, 'fly'), false);
});
test('110 lb instead of prescribed 100 activates live guidance', () => {
  const f = fixture(); f.rows[0].weight.value = String(110 * 0.45359237);
  const source = { performance: { sets: [{weight:100,reps:12,completed:true}, {weight:100,reps:12,completed:true}, {weight:100,reps:9,completed:true}] } };
  assert.equal(f.context.shouldUseLiveSetGuidance(f.card, source, {lower:8,upper:15}, 'fly'), true);
});
test('following an initially prescribed increase does not activate live guidance', () => {
  const f = fixture();
  const source = { performance: { sets: [{weight:100,reps:15,completed:true}, {weight:100,reps:15,completed:true}] } };
  const prescribed = f.context.getSuggestedProgressionLoad(f.context.getRecommendedLoadRange(100, 'fly'), 'fly');
  f.rows[0].weight.value = String(prescribed * 0.45359237);
  assert.equal(f.context.shouldUseLiveSetGuidance(f.card, source, {lower:8,upper:15}, 'fly'), false);
});
test('kg display rounding does not count as changing the prescribed weight', () => {
  const f = fixture(); assert.equal(f.context.hasLiveLoadDeviation(100.09, 100), false);
  assert.equal(f.context.hasLiveLoadDeviation(90, 100), true);
});
