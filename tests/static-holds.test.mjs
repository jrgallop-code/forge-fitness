import test from 'node:test';
import assert from 'node:assert/strict';
import { isStaticHold, holdSeconds, holdTarget, elapsedHoldSeconds, stopHoldTimer } from '../js/workouts/static-holds.js';
import { holdProgressRecords } from '../js/progress/hold-progress-model.js';
import { calculateSetVolume } from '../js/workouts/volume-calculator.js';
import { renderCircuitRounds } from '../js/workouts/circuit-round-logger.js';
import { setHasRecordedData } from '../js/workouts/logger-set-removal.js';
test('only confirmed holds change; dynamic movements keep reps',()=>{
  for (const id of ['plank','side-plank','copenhagen-plank']) assert.equal(isStaticHold(id),true);
  for (const id of ['bird-dog','glute-bridge','pallof-press','burpee']) assert.equal(isStaticHold(id),false);
  assert.equal(holdTarget('30-45'),'30-45 sec'); assert.equal(holdTarget('1 min'),'1 min');
  assert.equal(holdSeconds('1:30'),90); assert.equal(holdSeconds('1:90'),null); assert.equal(holdSeconds(''),null);
});
test('timer uses elapsed clock time across interruption and stores seconds on stop',()=>{
  const set={holdStartedAt:10000,reps:null};
  assert.equal(elapsedHoldSeconds(set,65500),55); stopHoldTimer(set,65500);
  assert.equal(set.durationSeconds,55); assert.equal(set.holdStartedAt,undefined); assert.equal(set.reps,null);
  assert.equal(setHasRecordedData(set),true);
  assert.equal(JSON.parse(JSON.stringify(set)).durationSeconds,55);
});
test('holds never contribute repetition tonnage',()=>{
  assert.equal(calculateSetVolume({weight:10,reps:60,durationSeconds:60},'plank'),0);
  assert.equal(calculateSetVolume({weight:10,reps:60},'plank'),0);
  assert.equal(calculateSetVolume({weight:10,reps:12},'dumbbell-bench-press'),240);
});
test('hold progression compares completed sets at the same load, not reps or unfinished sets',()=>{
 const sessions=[{date:'2026-10-09',exercises:[{exerciseId:'plank',sets:[
 {completed:true,weight:0,durationSeconds:60},{completed:true,weight:10,durationSeconds:40},
 {completed:true,weight:10,durationSeconds:35},{completed:false,weight:10,durationSeconds:99},
 {completed:true,weight:10,reps:80},{completed:true,weight:20,durationSeconds:20}]}]}];
 let records=holdProgressRecords(sessions,'plank',{load:10});
 assert.equal(records[0].bestSeconds,40);assert.equal(records[0].totalSeconds,75);assert.equal(records[0].sets,2);
 assert.equal(holdProgressRecords(sessions,'plank',{load:0})[0].bestSeconds,60);
 assert.equal(holdProgressRecords(sessions,'plank',{metric:'weight',minimumSeconds:30})[0].addedWeight,10);
 assert.equal(holdProgressRecords(sessions,'pallof-press').length,0);
});
test('circuit mixes time for holds and reps for dynamic exercises without adding targets',()=>{
 const html=renderCircuitRounds({plan:{days:[{exercises:[{id:'plank',reps:''},{id:'dumbbell-curl',reps:'8-12'}]}]},session:{exercises:[{exerciseId:'plank',sets:[{}]},{exerciseId:'dumbbell-curl',sets:[{}]}]},exerciseName:id=>id,unit:'lb'});
 assert.match(html,/data-hold-time/); assert.match(html,/data-hold-timer/);assert.match(html,/data-round-reps/);assert.match(html,/Time \(sec\)/);assert.doesNotMatch(html,/20-60/);
});

test('creating a workout session preserves timed holds and normal repetitions',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
 const helpers=await import('../js/workouts/static-holds.js');
 const sandbox={...helpers,getExerciseById:id=>({id,name:id,equipment:'Bodyweight'}),supportsEquipmentProfiles:()=>false};
 vm.createContext(sandbox);
 const source=readFileSync(new URL('../js/workouts/workout-session.js',import.meta.url),'utf8').replace(/^import\s[\s\S]*?;\n/gm,'').replace(/^export /gm,'');
 vm.runInContext(source+'\nglobalThis.create=createExerciseState;',sandbox);
 const exercises=sandbox.create({exercises:[{id:'plank',sets:3,reps:'30-60 sec'},{id:'dumbbell-curl',sets:2,reps:'8-12'}]});
 assert.equal(exercises[0].trackingType,'duration');assert.equal(exercises[0].sets.length,3);
 assert.equal(exercises[0].sets[0].durationSeconds,null);assert.equal(exercises[0].sets[0].reps,null);
 assert.equal(exercises[1].trackingType,'reps');assert.equal(exercises[1].sets.length,2);
});

test('session cleanup retains bodyweight holds and does not reinterpret legacy reps',async()=>{
 const {sanitizeExistingWorkoutSessions}=await import('../js/workouts/workout-session-sanitizer.js');
 let saved=JSON.stringify([{exercises:[{exerciseId:'plank',trackingType:'duration',sets:[{weight:0,reps:null,durationSeconds:45,completed:true}]},{exerciseId:'side-plank',trackingType:'reps',sets:[{weight:null,reps:30}]}]}]);
 globalThis.localStorage={getItem:()=>saved,setItem:(_,value)=>saved=value};
 const sessions=sanitizeExistingWorkoutSessions();
 assert.equal(sessions[0].exercises.length,2);assert.equal(sessions[0].exercises[0].sets[0].durationSeconds,45);
 assert.equal(sessions[0].exercises[1].sets[0].reps,30);assert.equal(sessions[0].exercises[1].sets[0].durationSeconds,undefined);
});
