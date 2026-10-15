import test from 'node:test';
import assert from 'node:assert/strict';
import { addCustomExercise } from '../js/workouts/exercise-library.js';
import { isStaticHold, holdTrackingType } from '../js/workouts/static-holds.js';
import { holdProgressRecords } from '../js/progress/hold-progress-model.js';
import { calculateSetVolume } from '../js/workouts/volume-calculator.js';

test('custom timed exercises persist and use hold logging and progress by ID', () => {
 const original = globalThis.localStorage;
 const storage = new Map();
 globalThis.localStorage = {getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,value)};
 try {
  const timed = addCustomExercise({name:'Wall sit test',trackingType:'duration'});
  const reps = addCustomExercise({name:'Custom curl test'});
  assert.equal(timed.recommendedReps,'20-60 sec');
  assert.equal(isStaticHold(timed.id),true);
  assert.equal(holdTrackingType({id:timed.id,reps:'30-45'}),'duration');
  assert.equal(isStaticHold({exerciseId:timed.id}),true);
  assert.equal(isStaticHold(reps.id),false);
  assert.equal(reps.trackingType,'reps');
  const sessions=[{date:'2026-10-15',exercises:[{exerciseId:timed.id,trackingType:'duration',sets:[{durationSeconds:45,weight:0,completed:true}]}]}];
  assert.equal(holdProgressRecords(sessions,timed.id,{load:0})[0].bestSeconds,45);
  assert.equal(calculateSetVolume({weight:10,reps:45},timed.id),0);
 } finally { if(original === undefined) delete globalThis.localStorage; else globalThis.localStorage=original; }
});
