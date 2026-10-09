import test from 'node:test';
import assert from 'node:assert/strict';
import {applyImportExerciseDefaults} from '../js/workouts/routine-import-defaults.js';
const exercise={defaultSets:3,recommendedReps:'8-12'};
const row=()=>({sets:null,reps:'',match:{confirmed:true}});
test('regular exercise-only imports receive editable catalogue defaults',()=>{
 const item=row();applyImportExerciseDefaults(item,exercise,{kind:'regular'});
 assert.equal(item.sets,3);assert.equal(item.reps,'8-12');
 item.reps='12-15';delete item.importDefaults.reps;
 applyImportExerciseDefaults(item,{defaultSets:2,recommendedReps:'6-10'},{kind:'regular'});
 assert.equal(item.sets,2);assert.equal(item.reps,'12-15');
});
test('written prescriptions are preserved and only the missing field is filled',()=>{
 const item={...row(),sets:5};applyImportExerciseDefaults(item,exercise,{kind:'regular'});
 assert.equal(item.sets,5);assert.equal(item.reps,'8-12');
 const complete={...row(),sets:4,reps:'6-8'};applyImportExerciseDefaults(complete,exercise,{kind:'regular'});
 assert.equal(complete.sets,4);assert.equal(complete.reps,'6-8');
});
test('circuits, unchecked defaults, and unconfirmed matches stay untouched',()=>{
 for(const options of [{kind:'circuit'},{kind:'regular',useDefaults:false}]){
 const item=row();applyImportExerciseDefaults(item,exercise,options);assert.deepEqual(item,row());
 }
 const item={...row(),match:{confirmed:false}};applyImportExerciseDefaults(item,exercise,{kind:'regular'});
 assert.equal(item.sets,null);assert.equal(item.reps,'');
});
