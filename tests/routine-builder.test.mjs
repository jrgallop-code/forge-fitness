import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from '../js/workouts/routine-builder-model.js';
import {effectiveRestSetting,restOptions} from '../js/workouts/exercise-rest-settings.js';
import * as holds from '../js/workouts/static-holds.js';

test('cardio, holds and dynamic strength have distinct target fields',()=>{
 assert.equal(model.exerciseKind({trackingType:'notes'}),'cardio');
 assert.equal(model.exerciseKind({id:'plank'}),'duration');
 assert.equal(model.exerciseKind({trackingType:'duration'}),'duration');
 assert.equal(model.exerciseKind({id:'curl',trackingType:'reps'}),'strength');
});
test('per-set targets, notes, machine and cardio data survive plan JSON save/reopen',()=>{
 const p={id:'curl',sets:2,reps:'8-12',notes:'Keep elbows still',restSetting:{enabled:true,seconds:180},equipmentProfileId:'machine-2',equipmentProfileName:'Gym 2'};
 const targets=model.normalizeTargets(p,{});targets[0].weight=44.092452;targets[1].reps='10';targets[1].dropSets=[{weight:22,reps:'12'}];model.syncTargets(p,targets);
 const saved=JSON.parse(JSON.stringify(p));assert.equal(saved.setTargets[0].weight,44.092452);assert.equal(saved.setTargets[1].reps,'10');assert.equal(saved.setTargets[1].dropSets[0].weight,22);assert.equal(saved.notes,p.notes);
 assert.equal(model.plannedSessionFields(saved).equipmentProfileId,'machine-2');
 const cardio={id:'bike',cardioTarget:{durationMinutes:20,distance:'5 km',details:'Resistance 6'}};assert.deepEqual(model.plannedSessionFields(JSON.parse(JSON.stringify(cardio))).cardioTarget,cardio.cardioTarget);
});
test('starting a routine never records target weights, reps, cardio time, warmups or drop sets as results',()=>{
 const source=readFileSync(new URL('../js/workouts/workout-session.js',import.meta.url),'utf8').replace(/^import\s[\s\S]*?;\n/gm,'').replace(/^export /gm,'');
 const sandbox={...model,...holds,structuredClone,getExerciseById:id=>({id,name:id,trackingType:id==='bike'?'notes':'reps',equipment:'Bodyweight'}),supportsEquipmentProfiles:()=>false};vm.createContext(sandbox);vm.runInContext(source+'\nglobalThis.create=createExerciseState;',sandbox);
 const plan={exercises:[{id:'curl',sets:1,reps:'12',notes:'Slow eccentric',equipmentProfileId:'machine-2',setTargets:[{weight:50,reps:'12',dropSets:[{weight:30,reps:'10'}]}],warmupTargets:[{weight:20,reps:8}]},{id:'bike',notes:'Steady pace',cardioTarget:{durationMinutes:20,distance:'5 km'}}]};
 const [strength,cardio]=sandbox.create(plan);
 assert.equal(strength.routineNote,'Slow eccentric');assert.equal(strength.notes,'');assert.equal(strength.equipmentProfileId,'machine-2');
 for(const field of ['weight','reps','durationSeconds'])assert.equal(strength.sets[0][field],null);
 assert.equal(strength.sets[0].completed,false);assert.equal(strength.sets[0].targetWeight,50);
 assert.equal(strength.sets[0].dropSets[0].weight,null);assert.equal(strength.sets[0].dropSets[0].draftWeight,30);assert.equal(strength.sets[0].dropSets[0].completed,false);
 assert.equal(strength.warmupSets[0].weight,null);assert.equal(strength.warmupSets[0].targetWeight,20);assert.equal(strength.warmupSets[0].completed,false);
 assert.equal(cardio.durationMinutes,null);assert.equal(cardio.distance,'');assert.equal(cardio.cardioTarget.durationMinutes,20);assert.equal(plan.exercises[0].notes,'Slow eccentric');
});
test('reordering keeps group members contiguous, including first and last positions',()=>{
 const day={exercises:[{id:'a',supersetGroup:'A'},{id:'b',supersetGroup:'A'},{id:'c'},{id:'d'}]};
 assert.equal(model.moveRoutineExercise(day,0,3),true);assert.deepEqual(day.exercises.map(x=>x.id),['c','d','a','b']);
 model.moveRoutineExercise(day,1,2);assert.deepEqual(day.exercises.map(x=>x.id),['c','a','b','d']);
 model.moveRoutineExercise(day,1,0);assert.deepEqual(day.exercises.map(x=>x.id),['a','b','c','d']);
 assert.equal(model.moveRoutineExercise(day,0,2,true),false);model.moveRoutineExercise(day,0,1,true);assert.deepEqual(day.exercises.map(x=>x.id),['b','a','c','d']);
});
test('group creation and removal preserve notes and targets without orphaned groups',()=>{
 const day={exercises:[{id:'a',notes:'cue'},{id:'b'},{id:'c'},{id:'d'}]};model.groupRoutineExercises(day,[0,2,3],'circuit');
 assert.deepEqual(day.exercises.map(x=>x.id),['a','c','d','b']);assert.equal(day.exercises[0].notes,'cue');assert.equal(day.exercises[2].groupType,'circuit');
 model.ungroupExercise(day,1);assert.ok(day.exercises.every(x=>!x.supersetGroup));
});
test('swapping preserves position/group but discards incompatible weight, machine and cardio targets',()=>{
 const next=model.replaceRoutineExercise({id:'curl',sets:3,notes:'curl cue',restSetting:{enabled:true,seconds:90},equipmentProfileId:'cable-1',supersetGroup:'A',setTargets:[{weight:50}]},{id:'bike',trackingType:'notes',defaultSets:1});
 assert.equal(next.supersetGroup,'A');assert.equal(next.id,'bike');assert.equal(next.setTargets,undefined);assert.equal(next.equipmentProfileId,undefined);assert.equal(next.notes,'');
});
test('rest settings use the same intervals, respect per-routine Off, and fall back for legacy plans',()=>{
 globalThis.localStorage={getItem:()=>JSON.stringify({curl:{enabled:true,seconds:90}})};
 const active={trainingDayIndex:1,planSnapshot:{days:[{}, {exercises:[{id:'curl',restSetting:{enabled:false,seconds:180}}]}]},exercises:[{exerciseId:'curl'}]};
 assert.deepEqual(effectiveRestSetting('curl',active,0),{enabled:false,seconds:180});
 assert.deepEqual(effectiveRestSetting('curl'),{enabled:true,seconds:90});
 assert.deepEqual(model.REST_INTERVALS,[60,90,120,180]);assert.equal((restOptions(90).match(/selected/g)||[]).length,1);
 assert.deepEqual(model.normalizeRest({enabled:true,seconds:999}),{enabled:true,seconds:120});
});
