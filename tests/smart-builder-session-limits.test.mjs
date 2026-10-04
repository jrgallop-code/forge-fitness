import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { exercises } from '../js/workouts/exercise-library.js';
import { presetPlans } from '../js/workouts/workout-plans.js';
import { MAX_WORKING_SETS, clampWorkingSets, normalizeGeneratedDayNames } from '../js/workouts/smart-build-constraints.js';

const getAllExercises = () => exercises;

function engine(plans = presetPlans) {
  const storage = new Map();
  const context = {
    getAllExercises, presetPlans: plans, MAX_WORKING_SETS, clampWorkingSets, normalizeGeneratedDayNames,
    getTrainingPreferences: () => ({}), renderMusclePriorityChoice: () => '',
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    document: { addEventListener() {}, querySelector() { return null; }, documentElement: {} },
    window: {}, MutationObserver: class { observe() {} }, setTimeout() {},
  };
  vm.createContext(context);
  const source = readFileSync(new URL('../js/workouts/smart-build-unified-engine-v11.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInContext(source + '\n globalThis.build = inputs => { Object.assign(state, inputs); generated = generateProgram(); return generated; }; globalThis.save = savePlan;', context);
  return { context, storage };
}

test('generated sets stay capped across goals, experience, schedule, priorities and regenerations', () => {
  const { context } = engine();
  for (const goal of ['muscle', 'strength', 'hybrid', 'maintain']) {
    for (const experience of ['beginner', 'intermediate', 'advanced']) {
      for (const days of [2, 3, 4, 5, 6]) {
        const result = context.build({ goal, experience, days, duration: 90, priorities: ['Chest', 'Back', 'Quads'], variation: days + 5, equipment: ['Full Gym'] });
        assert.equal(result.days.length, days);
        for (const day of result.days) {
          assert.equal(new Set(day.exercises.map(item => item.id)).size, day.exercises.length);
          for (const item of day.exercises) assert.ok(Number.isInteger(item.sets) && item.sets >= 2 && item.sets <= 4, `${goal}/${experience}/${days}: ${item.id} has ${item.sets} sets`);
        }
      }
    }
  }
});

test('four-day mixed template gets resistance names after its cardio exercises are removed', () => {
  const mixed = presetPlans.find(plan => plan.id === 'four-day-gym-muscle-cardio-balance');
  assert.ok(mixed);
  const { context } = engine([mixed]);
  const result = context.build({ goal: 'muscle', days: 4, duration: 60, priorities: ['Chest'], variation: 0 });
  assert.equal(result.baseTemplate.id, mixed.id);
  assert.match(result.days[1].name, /^Day 2 — (Full Body|Upper Body|Lower Body|Resistance Training)$/);
  assert.ok(result.days.every(day => !/cardio|rower/i.test(day.name)));
});

test('inherited five-set prescriptions are capped before volume allocation', () => {
  const plan = { id: 'five-set-template', name: 'Five-set source', trainingType: 'Hypertrophy', level: 'Intermediate', daysPerWeek: 2, days: Array.from({ length: 2 }, (_, i) => ({ name: `Full Body ${i}`, exercises: [{ id: 'barbell-bench-press', sets: 5, reps: '6-10' }, { id: 'barbell-row', sets: 5, reps: '6-10' }, { id: 'back-squat', sets: 5, reps: '6-10' }] })) };
  const { context } = engine([plan]);
  const result = context.build({ goal: 'muscle', days: 2, duration: 90, priorities: ['Chest', 'Back'] });
  assert.equal(result.baseTemplate.id, plan.id);
  assert.ok(result.days.every(day => day.exercises.every(item => item.sets <= 4)));
});

test('regenerated short and restricted sessions retain the cap without duplicate exercises', () => {
  const { context } = engine();
  for (const equipment of [['Dumbbells'], ['Bodyweight']]) {
    for (const duration of [30, 45, 60]) {
      for (const variation of [0, 1, 5]) {
        const result = context.build({ days: 4, duration, equipment, variation, priorities: ['Chest', 'Core'] });
        for (const day of result.days) {
          assert.ok(day.exercises.every(item => item.sets <= 4));
          assert.equal(new Set(day.exercises.map(item => item.id)).size, day.exercises.length);
        }
      }
    }
  }
});

test('a tampered five-set result cannot be saved even if its earlier validation passed', () => {
  const { context, storage } = engine();
  const result = context.build({ days: 4, duration: 90, priorities: [], variation: 0 });
  result.validation.passed = true;
  result.days[0].exercises[0].sets = 5;
  context.save({});
  assert.equal(storage.has('forge_workout_plans'), false);
});

test('a valid four-set program saves its reviewed names and prescriptions', () => {
  const { context, storage } = engine();
  const result = context.build({ goal: 'muscle', days: 4, duration: 60, priorities: [], variation: 0 });
  assert.equal(result.validation.passed, true, result.validation.issues.join('; '));
  context.save({});
  const saved = JSON.parse(storage.get('forge_workout_plans'))[0];
  assert.deepEqual(saved.days, JSON.parse(JSON.stringify(result.days.map(day => ({ name: day.name, exercises: day.exercises.map(item => ({ id: item.id, sets: item.sets, reps: item.reps, ...(item.supersetGroup ? { supersetGroup: item.supersetGroup } : {}) })) })))));
});

test('day naming preserves legitimate cardio and unchanged lifting labels', () => {
  const map = new Map(getAllExercises().map(exercise => [exercise.id, exercise]));
  map.set('real-cardio', { muscleGroup: 'Cardio', type: 'cardio' });
  const days = [{ name: 'Cardio', exercises: [{ id: 'real-cardio' }] }, { name: 'Upper A', exercises: [{ id: 'barbell-bench-press' }] }];
  normalizeGeneratedDayNames(days, map);
  assert.deepEqual(days.map(day => day.name), ['Cardio', 'Upper A']);
});
