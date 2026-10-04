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

test('full-body sessions balance upper/lower counts even with upper-body priorities', () => {
  const { context } = engine([]);
  for (const days of [3, 4, 6]) {
    for (const duration of [30, 45, 60, 90]) {
      for (const variation of [0, 1, 5]) {
        const result = context.build({ goal: 'muscle', experience: 'intermediate', splitPreference: 'full-body', days, duration, variation, priorities: ['Chest', 'Shoulders', 'Biceps'], equipment: ['Full Gym'] });
        for (const day of result.days) {
          const muscles = day.exercises.map(item => item.primaryMuscle);
          const upper = muscles.filter(m => ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'].includes(m)).length;
          const lower = muscles.filter(m => ['Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(m)).length;
          assert.ok(lower >= 2, `${day.name}: ${muscles.join(', ')}`);
          assert.ok(muscles.includes('Quads'));
          assert.ok(muscles.some(m => ['Hamstrings', 'Glutes'].includes(m)));
          assert.ok(muscles.includes('Back'));
          assert.ok(muscles.some(m => ['Chest', 'Shoulders'].includes(m)));
          assert.ok(Math.abs(upper - lower) <= 1, `${day.name}: ${upper} upper / ${lower} lower`);
          assert.ok(day.exercises.length <= (duration <= 30 ? 5 : duration <= 45 ? 6 : duration <= 60 ? 7 : 8));
          assert.ok(day.exercises.every(item => item.sets <= 4));
        }
      }
    }
  }
});

test('upper-heavy full-body source templates are repaired without extending the exercise count', () => {
  const items = ['barbell-bench-press', 'barbell-row', 'overhead-press', 'dumbbell-curl', 'tricep-pushdown', 'back-squat'].map(id => ({ id, sets: 3, reps: '8-12' }));
  const plan = { id: 'upper-heavy', name: 'Upper-heavy source', trainingType: 'Hypertrophy', level: 'Intermediate', daysPerWeek: 3, days: Array.from({ length: 3 }, (_, i) => ({ name: `Full Body ${i + 1}`, exercises: items })) };
  const { context } = engine([plan]);
  const result = context.build({ days: 3, duration: 60, priorities: ['Chest'], variation: 0 });
  assert.equal(result.baseTemplate.id, plan.id);
  for (const day of result.days) {
    const upper = day.exercises.filter(item => ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'].includes(item.primaryMuscle)).length;
    const lower = day.exercises.filter(item => ['Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(item.primaryMuscle)).length;
    assert.ok(lower >= 2);
    assert.ok(Math.abs(upper - lower) <= 1);
    assert.ok(day.exercises.length <= 7);
  }
});

test('unavailable lower-body exercises fail full-body validation rather than passing an upper-only plan', () => {
  const { context, storage } = engine([]);
  context.getAllExercises = () => exercises.filter(exercise => !['Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(exercise.muscleGroup));
  const result = context.build({ days: 3, duration: 60, splitPreference: 'full-body', priorities: [], variation: 0 });
  assert.equal(result.validation.passed, false);
  assert.ok(result.validation.issues.some(issue => issue.includes('needs two lower-body')));
  context.save({});
  assert.equal(storage.has('forge_workout_plans'), false);
});
