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
  const prescribed = f.context.getSuggestedProgressionLoad(100, 'fly');
  f.rows[0].weight.value = String(prescribed * 0.45359237);
  assert.equal(f.context.shouldUseLiveSetGuidance(f.card, source, {lower:8,upper:15}, 'fly'), false);
});
test('kg display rounding does not count as changing the prescribed weight', () => {
  const f = fixture(); assert.equal(f.context.hasLiveLoadDeviation(100.09, 100), false);
  assert.equal(f.context.hasLiveLoadDeviation(90, 100), true);
});

test('mixed working weights move a topped-out lighter set to the heavier load at minimum reps', () => {
 const f=fixture();
 const targets=f.context.getMixedWeightProgression([{weight:15,reps:20},{weight:20,reps:12}],{lower:12,upper:20});
 assert.deepEqual(JSON.parse(JSON.stringify(targets)),[{weight:20,reps:12,increased:true},{weight:20,reps:13,increased:false}]);
 assert.equal(f.context.getMixedWeightProgression([{weight:20,reps:12},{weight:20,reps:14}],{lower:12,upper:20}),null);
 assert.equal(f.context.getMixedWeightProgression([{weight:15,reps:19},{weight:20,reps:12}],{lower:12,upper:20}),null);
 assert.equal(f.context.getMixedWeightProgression([{weight:15,reps:20},{weight:20,reps:8}],{lower:12,upper:20}),null);
});

test('progression adds whole equipment steps to the previous load', () => {
  const { context } = fixture();
  assert.equal(context.getSuggestedProgressionLoad(37.5, 'rope-triceps-pushdown'), 40);
  context.getExerciseById = () => ({ equipment: 'Machine' });
  assert.equal(context.getSuggestedProgressionLoad(37.5, 'machine'), 42.5);
});

test('rope pushdown card and all three set targets recommend 40 lb × 12', async () => {
  const { context, card, prompt, rows } = fixture(15, false);
  const expansion = source.match(/import ['"]([^'"]*exercise-library-expansion[^'"]*)['"]/);
  if (expansion) await import(new URL(expansion[1], new URL('../js/workouts/', import.meta.url)));
  const catalog = source.match(/import \{ getExerciseById \} from ['"]([^'"]+)['"]/);
  const { getExerciseById } = await import(new URL(catalog[1], new URL('../js/workouts/', import.meta.url)));
  const storage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  try {
    context.getExerciseById = getExerciseById;
    context.isBodyweightEquipment = () => false;
    context.isWeightedBodyweightEquipment = () => false;
    context.isProgressiveOverloadEnabled = () => true;
    context.readJson = () => ({ trainingDayIndex: 0, planSnapshot: { days: [{ exercises: [{ reps: '12–15' }] }] } });
    context.findPreviousPerformance = () => ({
      performance: { sets: [15, 15, 16].map(reps => ({ weight: 37.5, reps, completed: true })) }
    });
    context.formatUnitMass = value => `${value} lb`;
    context.setCanonicalUnitPlaceholder = (input, value) => { input.placeholder = String(value); };
    card.dataset = { exerciseId: 'rope-triceps-pushdown', exerciseIndex: '0', trackingType: 'reps' };
    card.closest = () => ({ dataset: {} });
    card.querySelector = selector => selector === '.progression-prompt' ? prompt : null;
    prompt.classList.remove = () => {};
    rows.forEach(row => {
      row.weight.value = '';
      row.repInput.value = '';
      row.querySelector = selector => ({ '.session-weight': row.weight, '.session-reps': row.repInput })[selector] ?? null;
    });

    context.renderCard(card);

    assert.match(prompt.innerHTML, /Try 40 lb today/);
    assert.deepEqual(rows.map(row => [row.weight.placeholder, row.repInput.placeholder]), [
      ['40', '12'], ['40', '12'], ['40', '12']
    ]);
  } finally {
    if (storage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = storage;
  }
});
