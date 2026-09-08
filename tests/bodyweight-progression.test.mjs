import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildBodyweightProgression,
  isBodyweightEquipment,
  isWeightedBodyweightEquipment
} from '../js/workouts/bodyweight-progression.js';

test('bodyweight progression is limited to bodyweight equipment classifications', () => {
  assert.equal(isBodyweightEquipment('Bodyweight'), true);
  assert.equal(isBodyweightEquipment('Weighted Bodyweight'), true);
  assert.equal(isBodyweightEquipment('Body Weight'), true);
  assert.equal(isBodyweightEquipment('Dumbbells'), false);
  assert.equal(isBodyweightEquipment('Barbell'), false);
  assert.equal(isBodyweightEquipment('Cable'), false);
  assert.equal(isBodyweightEquipment('Machine'), false);
  assert.equal(isWeightedBodyweightEquipment('Bodyweight'), false);
  assert.equal(isWeightedBodyweightEquipment('Weighted Bodyweight'), true);
});

test('mixed pull-up sets preserve above-range reps and advance the lower set', () => {
  const progression = buildBodyweightProgression({ completedReps: [11, 8], lower: 6, upper: 10 });
  assert.equal(progression.allAtTop, false);
  assert.deepEqual(progression.repGoals, [11, 9]);
});

test('bodyweight sets at the ceiling offer more reps or a small added load', () => {
  const progression = buildBodyweightProgression({ completedReps: [11, 10], lower: 6, upper: 10 });
  assert.equal(progression.allAtTop, true);
  assert.deepEqual(progression.repGoals, [12, 11]);
  assert.equal(progression.minimumAddedLoad, 2.5);
  assert.equal(progression.maximumAddedLoad, 5);
  assert.equal(progression.loadRepMinimum, 6);
  assert.equal(progression.loadRepMaximum, 8);
});

test('weighted bodyweight progression increases external load rather than total bodyweight', () => {
  const progression = buildBodyweightProgression({ completedReps: [10, 10], lower: 6, upper: 10, currentAddedWeight: 5 });
  assert.equal(progression.minimumAddedLoad, 7.5);
  assert.equal(progression.maximumAddedLoad, 10);
});

test('the logger keeps the established weighted-exercise progression path', () => {
  const source = readFileSync('js/workouts/progression-prompt-v2.js', 'utf8');
  assert.match(source, /isBodyweightEquipment\(exercise\?\.equipment\)/);
  assert.match(source, /\(isBodyweight \|\| Number\(set\.weight\) > 0\)/);
  assert.match(source, /if \(isBodyweight && renderBodyweightTopRangePrompt/);
  assert.match(source, /const range = getRecommendedLoadRange\(currentWeight, exerciseId\)/);
});
