import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveExerciseThumbnailId } from '../js/workouts/exercise-thumbnail-identity.js';

test('saved workout exerciseId resolves without requiring id', () => {
 assert.equal(resolveExerciseThumbnailId({ exerciseId:'good-morning' }), 'good-morning');
});
test('imported copies with an exact built-in name reuse its exercise-specific image', () => {
 assert.equal(resolveExerciseThumbnailId({ id:'custom-copy-123', name:'Trap-Bar Deadlift' }), 'trap-bar-deadlift');
 assert.equal(resolveExerciseThumbnailId({ id:'imported-abc', exerciseName:'Single Leg Romanian Deadlift' }), 'single-leg-romanian-deadlift');
});
test('unfamiliar custom exercises and related but different variations keep the fallback', () => {
 assert.equal(resolveExerciseThumbnailId({ id:'custom-123', name:'Good Morning With Resistance Band' }), null);
 assert.equal(resolveExerciseThumbnailId({ id:'custom-456', name:'My special exercise' }), null);
});
