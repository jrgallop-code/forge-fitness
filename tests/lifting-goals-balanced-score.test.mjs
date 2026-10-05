import test from 'node:test';
import assert from 'node:assert/strict';
import { goalProgress, saveGoal, readGoals, GOALS_KEY } from '../js/goals/lifting-goals-engine.js';
const storage=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}};
const session=(id,weight,reps,date='2026-10-02')=>({id,date,completedAt:`${date}T15:00:00Z`,exercises:[{exerciseId:'bench',sets:[{weight,reps,completed:true}]}]});
const goal={id:'g',exerciseId:'bench',targetWeight:65,targetReps:8,baselineWeight:55,baselineReps:8,createdAt:'2026-10-01T16:00:00Z'};
test('approved 50/50 examples match rounded scores',()=>{
 for(const [weight,reps,score] of [[55,9,7],[55,10,14],[55,11,22],[55,12,29],[60,5,26],[60,6,34],[60,8,50],[65,5,74],[65,7,91],[65,8,100]])
   assert.equal(goalProgress(goal,[session(`${weight}-${reps}`,weight,reps)]).percent,score,`${weight} × ${reps}`);
});
test('lighter high-rep performance and heavier low-rep performance cannot complete a goal',()=>{
 assert.equal(goalProgress(goal,[session('light',55,50)]).percent,50);
 assert.equal(goalProgress(goal,[session('heavy',100,1)]).percent,99);
 assert.equal(goalProgress(goal,[session('light',55,50),session('heavy',100,1)]).reached,false);
 assert.equal(goalProgress(goal,[session('achieved',70,8)]).reached,true);
});
test('selects the highest score from one set and never combines weight and reps from different sets',()=>{
 const result=goalProgress(goal,[session('weight',65,3),session('reps',55,20)]);
 assert.equal(result.reached,false);assert.equal(result.percent,57);assert.equal(result.bestSet.sessionId,'weight');
 const best=goalProgress(goal,[session('good',60,8),session('lighter',50,5)]);
 assert.equal(best.percent,50);assert.equal(best.bestSet.sessionId,'good');
});
test('starting performance is fixed and rep target is required for new goals',()=>{
 const s=storage(),now=new Date(goal.createdAt),history=[session('before',55,8,'2026-09-30')];
 assert.throws(()=>saveGoal({exerciseId:'bench',targetWeight:65},history,s,now));
 const saved=saveGoal({exerciseId:'bench',targetWeight:65,targetReps:8},history,s,now);
 assert.equal(saved.baselineWeight,55);assert.equal(saved.baselineReps,8);
 const edited=saveGoal({...saved,targetWeight:70},[...history,session('after',60,9)],s);
 assert.equal(edited.baselineWeight,55);assert.equal(edited.baselineReps,8);
});
test('legacy rep goals recover baseline reps only from pre-goal history',()=>{
 const legacy={...goal};delete legacy.baselineReps;
 const history=[session('before',55,8,'2026-09-30'),session('new',55,12)];
 assert.equal(goalProgress(legacy,history).baseline.reps,8);
 assert.equal(goalProgress(legacy,history).percent,29);
});
test('legacy weight-only goals remain stored and can add a rep target without losing their origin',()=>{
 const s=storage(),legacy={...goal,targetReps:null};delete legacy.baselineReps;
 s.setItem(GOALS_KEY,JSON.stringify([legacy]));
 assert.equal(goalProgress(readGoals(s)[0],[session('new',60,5)]).percent,50);
 const upgraded=saveGoal({...legacy,targetReps:8,baselineReps:8},[],s);
 assert.equal(upgraded.id,legacy.id);assert.equal(upgraded.createdAt,legacy.createdAt);
 assert.equal(goalProgress(upgraded,[session('new',60,5)]).percent,26);
});
test('explicit starting performance permits same-weight rep goals and heavier targets with lower reps',()=>{
 const s=storage();const g=saveGoal({exerciseId:'bench',targetWeight:55,targetReps:12,baselineWeight:55,baselineReps:8},[],s,new Date(goal.createdAt));
 assert.equal(goalProgress(g,[session('new',55,12)]).percent,100);
 assert.equal(goalProgress(g,[]).percent,0);
});
