import test from 'node:test';
import assert from 'node:assert/strict';
import { readGoals, saveGoal, deleteGoal, goalProgress, badgeMetrics, reconcileBadges, BADGES, BADGES_KEY, GOALS_KEY } from '../js/goals/lifting-goals-engine.js';
import { badgeArt } from '../js/goals/training-badge-art.js';
import { canonicalMass, displayMass, UNIT_KINDS } from '../js/core/unit-system.js';

function storage() {const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};}
function session(id,date,weight=50,reps=12,overrides={}) { return {id,date,completedAt:`${date}T15:00:00Z`,exercises:[{exerciseId:'dumbbell-bench-press',sets:[{weight,reps,completed:true}]}],...overrides}; }
const goalInput={exerciseId:'dumbbell-bench-press',name:'Dumbbell Bench Press',targetWeight:65,targetReps:12};
const created=new Date('2026-09-20T16:00:00Z');
test('baseline-relative goal shows 67% at 60 lb, and requires the actual rep target',()=>{
 const s=storage(), history=[session('baseline','2026-09-19')];
 const goal=saveGoal(goalInput,history,s,created);
 assert.equal(goal.baselineWeight,50);
 assert.equal(goalProgress(goal,[...history,session('new','2026-09-21',60)]).percent,67);
 assert.equal(goalProgress(goal,[...history,session('lowreps','2026-09-21',65,10)]).percent,0);
 assert.equal(goalProgress(goal,[...history,session('hit','2026-09-21',65,12)]).percent,100);
 assert.equal(goalProgress(goal,[...history,session('exceeded','2026-09-21',80,12)]).percent,100);
 assert.equal(goalProgress(goal,[...history,session('almost','2026-09-21',64.99,12)]).percent,99);
});
test('circuits, unfinished sets, warmups, other machines and pre-goal sessions cannot advance goals',()=>{
 const s=storage(),goal=saveGoal({...goalInput,equipmentProfileId:'machine-a'},[],s,created);
 const excluded=[session('circuit','2026-09-21',100,20,{trainingContext:'circuit'}),session('before','2026-09-19',100,20),session('machine','2026-09-21',100,20,{exercises:[{exerciseId:goal.exerciseId,equipmentProfileId:'machine-b',sets:[{weight:100,reps:20}]}]}),session('draft','2026-09-21',100,20,{exercises:[{exerciseId:goal.exerciseId,equipmentProfileId:'machine-a',sets:[{weight:100,reps:20,completed:false},{weight:100,reps:20,isWarmup:true}]}]})];
 assert.equal(goalProgress(goal,excluded).percent,0);
 const valid=session('valid','2026-09-22',60,12);valid.exercises[0].equipmentProfileId='machine-a';
 assert.equal(goalProgress(goal,[...excluded,valid]).percent,92);
});
test('multiple goals persist independently, editing preserves baseline and deletion leaves workouts intact',()=>{
 const s=storage(),history=[session('base','2026-09-19')];
 s.setItem('forge_workout_sessions',JSON.stringify(history)); const original=s.getItem('forge_workout_sessions');
 const a=saveGoal(goalInput,history,s,created),b=saveGoal({...goalInput,exerciseId:'barbell-bench-press',targetWeight:100},history,s,new Date(created.getTime()+1));
 assert.equal(readGoals(s).length,2);
 const edited=saveGoal({...a,targetWeight:70},[...history,session('new','2026-09-21',60)],s);
 assert.equal(edited.baselineWeight,50);assert.equal(edited.createdAt,a.createdAt);
 assert.throws(()=>saveGoal({...a,targetReps:8},history,s));
 deleteGoal(a.id,s);assert.equal(readGoals(s)[0].id,b.id);assert.equal(s.getItem('forge_workout_sessions'),original);
});
test('goal without rep target allows any positive rep set and lighter workouts do not reduce progress',()=>{
 const s=storage(),g=saveGoal({...goalInput,targetReps:null},[session('base','2026-09-19',50,1)],s,created);
 const history=[session('new','2026-09-21',60,1),session('lighter','2026-09-22',40,15)];
 assert.equal(goalProgress(g,history).percent,67);
});
test('invalid or already-achieved new goals are rejected; corrupt goals are handled',()=>{
 const s=storage();
 for(const input of [{targetWeight:0},{targetWeight:NaN},{targetReps:0},{targetReps:1.5},{targetReps:101}])assert.throws(()=>saveGoal({...goalInput,...input},[],s));
 assert.throws(()=>saveGoal(goalInput,[session('base','2026-09-19',70)],s,created));
 s.setItem(GOALS_KEY,'invalid');assert.deepEqual(readGoals(s),[]);
});
test('kg input is stored in canonical lb and displays back in kg without changing goal progress',()=>{
 const s=storage();globalThis.localStorage=s;s.setItem('level_up_unit_system','metric');
 const canonical=canonicalMass(30,UNIT_KINDS.LIFTING_WEIGHT);
 assert.ok(Math.abs(canonical-66.13867865)<.001);
 assert.equal(displayMass(canonical,2,UNIT_KINDS.LIFTING_WEIGHT),30);
 const goal=saveGoal({...goalInput,targetWeight:canonical},[],s,created);
 assert.equal(goalProgress(goal,[session('new','2026-09-21',canonical,12)]).percent,100);
});
test('streak uses consecutive calendar weeks including morning completions, handles gaps and future entries',()=>{
 const sessions=['2026-09-14','2026-09-21','2026-09-28','2026-10-05'].map((d,i)=>session(String(i),d));
 const metrics=badgeMetrics(sessions,new Date('2026-10-05T09:00:00'));
 assert.equal(metrics.weeks,4);assert.equal(metrics.currentWeeks,4);
 assert.equal(badgeMetrics(sessions,new Date('2026-10-19T09:00:00')).currentWeeks,0);
 assert.equal(badgeMetrics([sessions[0],sessions[2]],new Date('2026-10-05T09:00:00')).weeks,1);
 assert.equal(badgeMetrics(sessions,new Date('2026-09-28T09:00:00')).sessions,3);
});
test('circuits count toward consistency but never strength PR badges; duplicate and empty completions do not count',()=>{
 const base=session('a','2026-09-19'),circuit=session('b','2026-09-21',1000,50,{trainingContext:'circuit'}),empty=session('empty','2026-09-21',0,0);
 const metrics=badgeMetrics([base,base,circuit,empty],new Date('2026-10-05'));
 assert.equal(metrics.sessions,2);assert.equal(metrics.prs,0);
 assert.ok(badgeMetrics([base,circuit,session('regular','2026-09-22',60)],new Date('2026-10-05')).prs>0);
});
test('historical awards bootstrap quietly, new awards appear once, and earned badges survive missed weeks or edits',()=>{
 const s=storage(),history=[session('a','2026-09-19')];
 const initial=reconcileBadges(history,{storage:s,now:new Date('2026-09-20')});assert.deepEqual(initial.newlyEarned,[]);assert.ok(initial.earned.first);
 history.push(session('b','2026-09-21'),session('c','2026-09-22'));
 const result=reconcileBadges(history,{storage:s,now:new Date('2026-09-23'),notify:true,sessionId:'c'});
 assert.ok(result.newlyEarned.includes('three'));assert.equal(result.earned.three.sessionId,'c');
 assert.deepEqual(reconcileBadges(history,{storage:s,now:new Date('2026-09-23'),notify:true,sessionId:'c'}).newlyEarned,[]);
 assert.ok(reconcileBadges([],{storage:s,now:new Date('2026-12-01')}).earned.three);
 assert.ok(JSON.parse(s.getItem(BADGES_KEY)).earned.first);
});
test('all classic artwork has a transparent SVG background and appearance-aware strokes',()=>{
 for(const kind of ['shoe','dumbbells','trophy','calendar','plant','plate']){
   const svg=badgeArt(kind);assert.match(svg,/fill="none"/);assert.match(svg,/stroke="currentColor"/);assert.doesNotMatch(svg,/#fff|#000|<image|fill="white"|fill="black"/);
 }
});
test('expanded collection has unique milestones and circuit awards stay independent of PR awards',()=>{
 assert.equal(BADGES.length,24);assert.equal(new Set(BADGES.map(b=>b.id)).size,24);
 const history=Array.from({length:10},(_,i)=>session(`c${i}`,'2026-09-21',1000,20,{trainingContext:'circuit'}));
 const result=reconcileBadges(history,{storage:storage(),now:new Date('2026-10-05')});
 assert.ok(result.earned['circuits-1']);assert.ok(result.earned['circuits-10']);
 assert.equal(result.earned.pr,undefined);assert.equal(result.earned['prs-5'],undefined);
 assert.match(badgeArt('plate',{milestone:500}),/>500<\/text>/);
 assert.match(badgeArt('calendar',{milestone:52}),/>52<\/text>/);
});
