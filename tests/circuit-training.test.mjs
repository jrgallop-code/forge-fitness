import { stopHoldTimer } from "../js/workouts/static-holds.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as circuits from '../js/workouts/circuit-history.js';
globalThis.localStorage={getItem:()=>null};
const {circuitTemplates}=await import('../js/workouts/circuit-templates.js');
import {getExerciseById} from '../js/workouts/exercise-library.js?v=exercise-library-catalogue-2';
import {evaluateLiveWorkoutPrs,calculatePrCounts} from '../js/workouts/workout-pr-badges.js';
import {createResumedWorkout,resumeProgressionHistory} from '../js/workouts/workout-resume.js';
const plan=circuitTemplates[2];
const regular={id:'regular',planId:'strength',trainingDayIndex:0,date:'2026-10-03',exercises:[{exerciseId:'dumbbell-curl',sets:[{weight:40,reps:10,completed:true}]}]};
const sample=()=>circuits.tagCircuitSession({id:'active-circuit',status:'in_progress',planId:plan.id,planSnapshot:structuredClone(plan),startedAt:new Date().toISOString(),date:'2026-10-04',trainingDayIndex:0,exercises:plan.days[0].exercises.map(ex=>({exerciseId:ex.id,sets:Array.from({length:plan.rounds},()=>({weight:20,reps:12,completed:true}))}))},plan);
const storage=()=>{const data=new Map([['forge_workout_sessions',JSON.stringify([regular])]]);return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
function harness(){
 const localStorage=storage();globalThis.localStorage=localStorage;
 const sandbox={stopHoldTimer,...circuits,showCircuitCompletion(){},createResumedWorkout,resumeProgressionHistory,localStorage,getExerciseById,repairWorkoutSessionList:sessions=>({sessions,changed:false}),resolveSessionExerciseIdentity:()=>({}),classifyWorkoutSource:()=> 'circuit',window:{confirm:()=>true,dispatchEvent:()=>{}},document:{getElementById:()=>null},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}},clearInterval(){},console,Date,JSON};vm.createContext(sandbox);
 const source=readFileSync(new URL('../js/workouts/workout-session.js',import.meta.url),'utf8').replace(/^import\s[\s\S]*?;\n/gm,'').replace(/^export /gm,'');
 vm.runInContext(source+'\nrenderActiveWorkoutBanner=()=>{};renderWorkoutLogger=()=>{};resumeRuntimeTimers=()=>{};globalThis.api={saveCompletedSession,getWorkoutSessions,deleteCompletedWorkout,resumeCompletedWorkout,getPreviousPerformance,getActiveWorkout};',sandbox);
 return {localStorage,api:sandbox.api};
}
const save=(h,session,editingSessionId=null)=>h.api.saveCompletedSession({plan,logger:{querySelector:()=>null},session,editingSessionId});
test('all templates resolve real exercises and equal rounds, capped at four',()=>{for(const p of circuitTemplates)for(const e of p.days[0].exercises){assert.ok(getExerciseById(e.id),e.id);assert.equal(e.sets,p.rounds);assert.ok(e.sets<=4);assert.equal(e.supersetGroup,p.id);}});
test('context markers survive at every level including drops',()=>{const s=sample();s.exercises[0].sets[0].dropSets=[{weight:10,reps:8}];circuits.tagCircuitSession(s);assert.equal(s.trainingContext,'circuit');assert.equal(s.exercises[0].circuitId,plan.id);assert.equal(s.exercises[0].sets[0].dropSets[0].circuitId,plan.id);});
test('completion saves only to circuit history; strength history is byte-identical',()=>{const h=harness(),s=sample(),before=h.localStorage.getItem('forge_workout_sessions');h.localStorage.setItem('level_up_active_workout',JSON.stringify(s));save(h,s);assert.equal(h.localStorage.getItem('forge_workout_sessions'),before);assert.equal(circuits.readCircuitSessions(h.localStorage).length,1);assert.equal(h.api.getWorkoutSessions().length,2);assert.equal(h.api.getActiveWorkout(),null);});
test('regular and circuit curls have completely separate previous weights',()=>{const h=harness(),s=sample();s.id='saved';s.completedAt='2026-10-04T12:00:00Z';h.localStorage.setItem(circuits.CIRCUIT_SESSION_KEY,JSON.stringify([s]));assert.equal(h.api.getPreviousPerformance('strength',0,'dumbbell-curl').sets[0].weight,40);assert.equal(h.api.getPreviousPerformance(plan.id,0,'dumbbell-curl').sets[0].weight,20);});
test('another circuit cannot supply previous curls',()=>{const store=storage();store.setItem(circuits.CIRCUIT_SESSION_KEY,JSON.stringify([sample()]));assert.equal(circuits.circuitPreviousPerformance('other','dumbbell-curl',null,store),null);});
test('editing replaces one circuit record without touching strength sessions',()=>{const h=harness(),s=sample();s.id='saved';h.localStorage.setItem(circuits.CIRCUIT_SESSION_KEY,JSON.stringify([s]));save(h,s,s.id);assert.equal(circuits.readCircuitSessions(h.localStorage).length,1);assert.equal(JSON.parse(h.localStorage.getItem('forge_workout_sessions')).length,1);});
test('deleting a circuit leaves strength history intact',()=>{const h=harness(),s=sample();s.id='saved';h.localStorage.setItem(circuits.CIRCUIT_SESSION_KEY,JSON.stringify([s]));assert.equal(h.api.deleteCompletedWorkout(s.id),true);assert.equal(circuits.readCircuitSessions(h.localStorage).length,0);assert.equal(JSON.parse(h.localStorage.getItem('forge_workout_sessions')).length,1);});
test('resume preserves context and replaces the original circuit record',()=>{const h=harness(),s=sample();s.id='saved';s.completedAt='2026-10-04T12:00:00Z';h.localStorage.setItem(circuits.CIRCUIT_SESSION_KEY,JSON.stringify([s]));assert.equal(h.api.resumeCompletedWorkout(s.id),true);const active=h.api.getActiveWorkout();assert.equal(active.circuitId,plan.id);save(h,active);assert.equal(circuits.readCircuitSessions(h.localStorage).length,1);assert.equal(JSON.parse(h.localStorage.getItem('forge_workout_sessions')).length,1);});
test('extreme circuit loads cannot trigger live strength PRs',()=>{const s=sample();s.exercises[2].sets[0].weight=1000;const result=evaluateLiveWorkoutPrs(s,[regular]);assert.equal(result.count,0);assert.equal(result.details.size,0);});
test('circuit history cannot pollute later strength PR baselines',()=>{const s=sample();s.exercises[2].sets[0].weight=1000;const later={...regular,id:'later',date:'2026-10-05',exercises:[{exerciseId:'dumbbell-curl',sets:[{weight:45,reps:10,completed:true}]}]};const result=calculatePrCounts([regular,s,later]);assert.equal(result.get(s.id),0);assert.equal(result.get('later'),1);});
test('partial rounds are not counted as completed rounds',()=>{const s=sample();assert.equal(circuits.circuitRoundsCompleted(s),3);s.exercises[1].sets[1].completed=false;assert.equal(circuits.circuitRoundsCompleted(s),2);});
test('next exercise has no rest, next round rests, final round has no rest',()=>{const s=sample(),members=s.exercises.map((_,index)=>({index}));for(const e of s.exercises)for(const set of e.sets)set.completed=false;s.exercises[0].sets[0].completed=true;assert.deepEqual(circuits.circuitRoundTransition(s,members,0),{exerciseIndex:1,setIndex:0,rest:false});for(const e of s.exercises)e.sets[0].completed=true;assert.deepEqual(circuits.circuitRoundTransition(s,members,0),{exerciseIndex:0,setIndex:1,rest:true});for(const e of s.exercises)for(const set of e.sets)set.completed=true;assert.equal(circuits.circuitRoundTransition(s,members,2),null);});
test('unfinished draft sets are not shown as previous results',()=>{const store=storage(),s=sample();s.exercises[2].sets[0]={weight:999,reps:99,completed:false};store.setItem(circuits.CIRCUIT_SESSION_KEY,JSON.stringify([s]));const prev=circuits.circuitPreviousPerformance(plan.id,'dumbbell-curl',null,store);assert.equal(prev.sets[0].weight,undefined);assert.equal(prev.sets[1].weight,20);});
function completeCircuitSet(active,exerciseIndex,setIndex,{reps='12',weight='20',kg=false}={}) {
 const localStorage=storage();localStorage.setItem('level_up_active_workout',JSON.stringify(active));
 const completedClass={toggle(){}};
 const button={textContent:'',closest:selector=>selector==='#workout-session-logger'?logger:selector==='.session-exercise-card'?card:selector==='.session-set-row'?row:null};
 const row={dataset:{setIndex:String(setIndex)},classList:completedClass,querySelector:selector=>selector==='.session-reps'?{value:reps}:selector==='.session-weight'?{value:weight}:selector==='.complete-set-btn'?button:null};
 const card={dataset:{exerciseIndex:String(exerciseIndex)}};
 const logger={dataset:{editingSessionId:''}};
 const sandbox={...circuits,localStorage,canonicalInputValue:input=>input.value===''?null:Number(input.value)*(kg?2.2046226218:1),getExerciseById,ACTIVE_WORKOUT_STORAGE_KEY:'level_up_active_workout',Date,JSON,CustomEvent:class{},setTimeout(){},console};vm.createContext(sandbox);
 let source=readFileSync(new URL('../js/workouts/superset-runtime.js',import.meta.url),'utf8').replace(/^import\s[\s\S]*?;\n/gm,'');source=source.split('document.addEventListener("click", handleClick')[0];
 vm.runInContext(source+'\nshowCue=()=>{};globalThis.api={handleClick};',sandbox);
 sandbox.api.handleClick({target:{closest:selector=>selector==='.complete-set-btn'?button:null},preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});
 return JSON.parse(localStorage.getItem('level_up_active_workout'));
}
test('real completion handler keeps kg loads canonical and does not start rest between exercises',()=>{
 const s=sample();for(const e of s.exercises)for(const set of e.sets)set.completed=false;
 const after=completeCircuitSet(s,0,0,{kg:true,weight:'20'});assert.ok(Math.abs(after.exercises[0].sets[0].weight-44.092452436)<0.001);assert.equal(after.currentExerciseIndex,1);assert.equal(after.restTimer,null);
});
test('real completion handler starts configured rest only at the end of a round',()=>{
 const s=sample();for(const e of s.exercises)for(const set of e.sets)set.completed=false;for(let i=0;i<s.exercises.length-1;i++)s.exercises[i].sets[0].completed=true;
 const after=completeCircuitSet(s,3,0);assert.equal(after.restTimer.durationSeconds,90);assert.equal(after.currentExerciseIndex,0);assert.equal(after.currentSetIndex,1);
});
test('real completion handler has no timer after the last round or when rest is Off',()=>{
 const s=sample();s.exercises[3].sets[2].completed=false;assert.equal(completeCircuitSet(s,3,2).restTimer,null);
 const off=sample();off.planSnapshot.circuitRestSeconds=0;for(const e of off.exercises)e.sets[1].completed=false;off.exercises[3].sets[0].completed=false;assert.equal(completeCircuitSet(off,3,0).restTimer,null);
});
test('actual reps are required; a template target is never silently logged',()=>{
 const s=sample();s.exercises[0].sets[0].completed=false;const after=completeCircuitSet(s,0,0,{reps:''});assert.equal(after.exercises[0].sets[0].completed,false);
});
