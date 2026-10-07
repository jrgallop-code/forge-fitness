import test from 'node:test';
import assert from 'node:assert/strict';
import {BADGES, BADGES_KEY, GOALS_KEY, badgeMetrics, reconcileBadges, getBadgeWeeklyTarget} from '../js/goals/lifting-goals-engine.js';
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
const now=new Date('2026-10-05T12:00:00');
const workout=(id,date='2026-10-01',weight=50,reps=8,extra={})=>({id,date,completedAt:`${date}T12:00:00Z`,exercises:[{exerciseId:'bench',equipment:'Dumbbell',sets:[{weight,reps,completed:true}]}],...extra});
test('all 24 additions are available alongside the original awards, including 1,000 and 2,000 workouts',()=>{
 assert.equal(BADGES.length,60);assert.equal(new Set(BADGES.map(b=>b.id)).size,60);
 const history=Array.from({length:2000},(_,i)=>workout(`w${i}`));
 const result=reconcileBadges([...history,history[0]],{storage:storage(),now});
 for(const id of ['750-club','the-thousand','living-legend'])assert.ok(result.earned[id]);
 assert.equal(result.metrics.sessions,2000);assert.deepEqual(result.newlyEarned,[]);
});
test('same-weight rep PRs and weight PRs are independent and compare previous workouts on the same machine',()=>{
 const base=workout('a','2026-09-01');
 assert.equal(badgeMetrics([base,workout('b','2026-09-02',50,9)],now).repRecords,1);
 assert.equal(badgeMetrics([base,workout('b','2026-09-02',60,5)],now).weightRecords,1);
 const other=workout('b','2026-09-02',100,20);other.exercises[0].equipmentProfileId='another';
 assert.equal(badgeMetrics([base,other],now).repRecords,0);assert.equal(badgeMetrics([base,other],now).weightRecords,0);
 const sameWorkout=workout('c');sameWorkout.exercises[0].sets.push({weight:60,reps:10});
 assert.equal(badgeMetrics([sameWorkout],now).weightRecords,0);
});
test('five-exercise PR window is exactly 30 calendar days and machines do not inflate distinct exercises',()=>{
 const exercises=weight=>Array.from({length:5},(_,i)=>({exerciseId:`e${i}`,sets:[{weight,reps:8}]}));
 const base=workout('base','2026-08-01',0,0,{exercises:exercises(50)});
 const events=Array.from({length:5},(_,i)=>workout(`r${i}`,`2026-09-${String(i+1).padStart(2,'0')}`,0,0,{exercises:[exercises(60)[i]]}));
 assert.equal(badgeMetrics([base,...events],now).diverseRecords,5);
 events[4].date='2026-10-01';events[4].completedAt='2026-10-01T12:00:00Z';
 assert.equal(badgeMetrics([base,...events],now).diverseRecords,4);
 const machines=Array.from({length:5},(_,i)=>({exerciseId:'bench',equipmentProfileId:`m${i}`,sets:[{weight:50,reps:8}]}));
 assert.equal(badgeMetrics([workout('x','2026-09-01',0,0,{exercises:machines}),workout('y','2026-09-02',0,0,{exercises:machines.map(e=>({...e,sets:[{weight:60,reps:8}]}))})],now).diverseRecords,1);
});
test('goal awards require actual weight AND reps after creation, deduplicate targets, and survive goal deletion',()=>{
 const s=storage(),goal={id:'g',exerciseId:'bench',targetWeight:65,targetReps:8,baselineWeight:55,baselineReps:8,createdAt:'2026-09-01T00:00:00Z'};
 s.setItem(GOALS_KEY,JSON.stringify([goal]));
 assert.equal(reconcileBadges([workout('x','2026-09-02',65,7)],{storage:s,now}).earned['first-summit'],undefined);
 let result=reconcileBadges([workout('x','2026-09-02',65,8)],{storage:s,now});assert.ok(result.earned['first-summit']);
 s.setItem(GOALS_KEY,JSON.stringify(Array.from({length:5},(_,i)=>({...goal,id:`g${i}`}))));
 result=reconcileBadges([workout('x','2026-09-02',65,8)],{storage:s,now});assert.equal(result.metrics.goalsReached,1);assert.equal(result.earned['goal-collector'],undefined);
 s.setItem(GOALS_KEY,'[]');assert.equal(reconcileBadges([],{storage:s,now}).metrics.goalsReached,1);
});
test('comeback needs an earlier workout and 14 days, then consecutive return weeks',()=>{
 assert.equal(badgeMetrics([workout('a','2026-09-01')],now).comebacks,0);
 assert.equal(badgeMetrics([workout('a','2026-09-01'),workout('b','2026-09-14')],now).comebacks,0);
 const history=['2026-08-01','2026-09-07','2026-09-14','2026-09-21','2026-09-28'].map((d,i)=>workout(String(i),d));
 assert.equal(badgeMetrics(history,now).comebacks,1);assert.equal(badgeMetrics(history,now).returnWeeks,4);
 history.splice(3,1);assert.equal(badgeMetrics(history,now).returnWeeks,2);
});
test('weekly targets use saved start-time snapshots, do not backfill from current settings, and reset on target change',()=>{
 const history=['2026-09-07','2026-09-14','2026-09-21','2026-09-28'].flatMap((date,i)=>[workout(`${i}a`,date,50,8,{badgeWeeklyTarget:2}),workout(`${i}b`,date,50,8,{badgeWeeklyTarget:2})]);
 assert.equal(badgeMetrics(history,now).targetWeeks,4);
 history.at(-1).badgeWeeklyTarget=1;assert.equal(badgeMetrics(history,now).targetWeeks,3);
 assert.equal(badgeMetrics(history.map(({badgeWeeklyTarget,...s})=>s),now).targetWeeks,0);
 const s=storage();s.setItem('level_up_training_preferences',JSON.stringify({days:4}));assert.equal(getBadgeWeeklyTarget(s),4);
 s.setItem('level_up_workout_schedule_v1',JSON.stringify({weekly:{1:0,3:1,5:null}}));assert.equal(getBadgeWeeklyTarget(s),2);
});
test('time-of-day uses captured local start, exact boundaries, and never substitutes completion time',()=>{
 const minutes=[299,300,479,480,1199,1200,1379,1380];
 const history=minutes.map((value,i)=>workout(String(i),'2026-09-01',50,8,{badgeLocalStartMinutes:value}));
 const result=badgeMetrics(history,now);assert.equal(result.earlyStarts,2);assert.equal(result.nightStarts,2);
 assert.equal(badgeMetrics([workout('unknown')],now).earlyStarts,0);
});
test('bodyweight requires confirmed equipment and no added load; RIR excludes circuits, warmups and unfinished sets',()=>{
 const bw=workout('bw','2026-09-01',0,15);bw.exercises[0].equipment='Bodyweight';bw.exercises[0].sets[0].rir=0;
 const weighted=structuredClone(bw);weighted.id='added';weighted.exercises[0].sets[0].weight=10;
 const unknown=workout('unknown','2026-09-01',0,15);delete unknown.exercises[0].equipment;
 const circuit=structuredClone(bw);circuit.id='c';circuit.trainingContext='circuit';circuit.circuitId='template-1';
 const ignored=workout('ignored');ignored.exercises[0].sets=[{weight:50,reps:8,rir:1,isWarmup:true},{weight:50,reps:8,rir:2,completed:false}];
 const result=badgeMetrics([bw,weighted,unknown,circuit,ignored],now);assert.equal(result.bodyweightSessions,2);assert.equal(result.rirSets,2);
});
test('circuits dedupe templates, created plans exclude library starts, reports exclude live months',()=>{
 const history=[workout('a','2026-09-01',20,10,{trainingContext:'circuit',circuitId:'x'}),workout('b','2026-09-02',20,10,{trainingContext:'circuit',circuitId:'x'}),workout('c','2026-09-03',20,10,{trainingContext:'circuit',circuitId:'y'}),workout('d','2026-09-04',50,8,{planId:'manual',workoutSource:'manual_builder'}),workout('e','2026-09-05',50,8,{planId:'template',workoutSource:'template_library'})];
 const result=badgeMetrics(history,now,{seenMonths:['2026-09','2026-10','2026-11']});assert.equal(result.circuitTemplates,2);assert.equal(result.createdPlans,1);assert.equal(result.reportsReviewed,1);
});
test('weekends count distinct Monday–Sunday weeks and seasonal award requires consecutive calendar quarters',()=>{
 const history=['2026-01-03','2026-04-04','2026-07-04','2026-10-03','2026-10-04'].map((date,i)=>workout(String(i),date));
 assert.equal(badgeMetrics(history,now).weekendWeeks,4);assert.equal(badgeMetrics(history,now).quarters,4);
 history.splice(2,1);assert.equal(badgeMetrics(history,now).quarters,2);
});
test('award migration preserves notification state and adding new badges does not re-announce old ones',()=>{
 const s=storage();s.setItem(BADGES_KEY,JSON.stringify({version:1,earned:{first:{earnedAt:'2026-09-01',notifiedAt:'2026-09-01',sessionId:'a'}}}));
 const result=reconcileBadges([workout('a')],{storage:s,now,notify:true,sessionId:'a'});
 assert.equal(result.earned.first.notifiedAt,'2026-09-01');assert.ok(!result.newlyEarned.includes('first'));
 assert.deepEqual(reconcileBadges([workout('a')],{storage:s,now,notify:true,sessionId:'a'}).newlyEarned,[]);
});
