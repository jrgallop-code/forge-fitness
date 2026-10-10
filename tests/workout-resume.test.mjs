import { stopHoldTimer } from "../js/workouts/static-holds.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createResumedWorkout,resumeProgressionHistory} from '../js/workouts/workout-resume.js';
import { isCircuit, sessionStorageKey, tagCircuitSession, circuitPreviousPerformance } from '../js/workouts/circuit-history.js';
const plan={id:'p',name:'Push',days:[{name:'Chest',exercises:[{id:'bench',sets:2,reps:'8-12'}]}]};
const completed={id:'session-1',date:'2026-10-01',planId:'p',planName:'Push',trainingDayIndex:0,startedAt:'2026-10-01T10:00:00Z',completedAt:'2026-10-01T11:00:00Z',durationMs:3600000,planSnapshot:plan,customNotes:'Keep me',exercises:[{exerciseId:'bench',notes:'Good',sets:[{weight:100,reps:10,rir:2,completed:true,dropSets:[{weight:80,reps:8}]},{weight:null,reps:null,completed:false}]}]};
function harness(){
 const data=new Map([['forge_workout_sessions',JSON.stringify([completed])]]),events=[];let opened=0;
 const sandbox={stopHoldTimer,isCircuit,sessionStorageKey,tagCircuitSession,circuitPreviousPerformance,readCircuitSessions:()=>JSON.parse(data.get('level_up_circuit_sessions_v1')||'[]'),createResumedWorkout,resumeProgressionHistory,localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},window:{confirm:()=>false,dispatchEvent:e=>events.push(e),alert:()=>{}},document:{getElementById:()=>null},repairWorkoutSessionList:rows=>({sessions:rows,changed:false}),resolveSessionExerciseIdentity:()=>({}),classifyWorkoutSource:()=> 'plan',CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},clearInterval(){},Date,JSON,console};
 vm.createContext(sandbox);let source=readFileSync(new URL('../js/workouts/workout-session.js',import.meta.url),'utf8').replace(/^import\s[\s\S]*?;\n/gm,'').replace(/^export /gm,'');
 vm.runInContext(source+'\nrenderWorkoutLogger=()=>{globalThis.opened=(globalThis.opened||0)+1};resumeRuntimeTimers=()=>{};renderActiveWorkoutBanner=()=>{};globalThis.api={resumeCompletedWorkout,getActiveWorkout,discardActiveWorkout,saveCompletedSession,getWorkoutElapsedMs};',sandbox);
 return{data,events,sandbox,api:sandbox.api};
}
test('resume retains recorded sets, RIR, drops, notes, date and identity; timer starts fresh',()=>{
 const active=createResumedWorkout(completed,plan,'2026-10-02T12:00:00Z');assert.equal(active.id,completed.id);assert.equal(active.date,completed.date);assert.equal(active.accumulatedMs,3600000);assert.equal(active.startedAt,'2026-10-02T12:00:00Z');assert.equal(active.restTimer,null);assert.equal(active.currentSetIndex,1);assert.deepEqual(active.exercises,completed.exercises);active.exercises[0].sets[0].reps=11;assert.equal(completed.exercises[0].sets[0].reps,10);
});
test('progression excludes reopened workout and later sessions',()=>{
 const active=createResumedWorkout(completed,plan);const rows=[{...completed,id:'before',completedAt:'2026-09-20T12:00:00Z'},completed,{...completed,id:'later',completedAt:'2026-10-02T12:00:00Z'}];assert.deepEqual(resumeProgressionHistory(rows,active).map(s=>s.id),['before']);
});
test('resuming opens live logger without overwriting the saved backup and survives reload',()=>{
 const h=harness();assert.equal(h.api.resumeCompletedWorkout(completed.id),true);assert.equal(h.sandbox.opened,1);assert.equal(h.api.getActiveWorkout().status,'in_progress');assert.equal(JSON.parse(h.data.get('forge_workout_sessions'))[0].exercises[0].sets[0].reps,10);assert.equal(h.events.at(-1).type,'levelup:workout-resumed');assert.equal(h.api.resumeCompletedWorkout(completed.id),true);assert.equal(h.sandbox.opened,2);
});
test('another active workout is protected and declining leaves all storage unchanged',()=>{
 const h=harness();h.data.set('level_up_active_workout',JSON.stringify({id:'active-other',status:'in_progress',planName:'Legs'}));const before=[...h.data];assert.equal(h.api.resumeCompletedWorkout(completed.id),false);assert.deepEqual([...h.data],before);
});
test('finishing again updates one original record and adds only new active time',()=>{
 const h=harness();h.api.resumeCompletedWorkout(completed.id);const active=h.api.getActiveWorkout();active.startedAt=new Date(Date.now()-60000).toISOString();active.exercises[0].sets[1]={weight:100,reps:9,completed:true};h.api.saveCompletedSession({plan,logger:{querySelector:()=>null},session:active,editingSessionId:null});const rows=JSON.parse(h.data.get('forge_workout_sessions'));assert.equal(rows.length,1);assert.equal(rows[0].id,completed.id);assert.equal(rows[0].date,completed.date);assert.equal(rows[0].startedAt,completed.startedAt);assert.equal(rows[0].customNotes,'Keep me');assert.ok(rows[0].durationMs>=3660000&&rows[0].durationMs<3661000);assert.equal(h.api.getActiveWorkout(),null);
});
test('discarding resume changes preserves original saved workout',()=>{
 const h=harness();h.api.resumeCompletedWorkout(completed.id);const saved=h.data.get('forge_workout_sessions');h.sandbox.window.confirm=()=>true;assert.equal(h.api.discardActiveWorkout(),true);assert.equal(h.data.get('forge_workout_sessions'),saved);assert.equal(h.api.getActiveWorkout(),null);
});

test('live PRs compare resumed sets to prior history rather than their own saved copy',async()=>{
 const {evaluateLiveWorkoutPrs}=await import('../js/workouts/workout-pr-badges.js');
 const prior={...completed,id:'prior',completedAt:'2026-09-20T12:00:00Z',exercises:[{exerciseId:'bench',sets:[{weight:80,reps:10,completed:true}]}]};
 const active=createResumedWorkout(completed,plan);const status=evaluateLiveWorkoutPrs(active,[prior,completed]);assert.equal(status.count,1);
});

