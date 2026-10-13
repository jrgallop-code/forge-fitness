import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = path => fs.readFileSync(new URL('../'+path, import.meta.url),'utf8');

test('graph readiness retries activate nutrition tab only once',()=>{
 const source=read('js/dashboard/dashboard-insights-analytics-v5.js');
 const start=source.indexOf('function openProgressGraph(kind)');
 const fn=source.slice(start,source.indexOf('\ndocument.addEventListener("click"',start));
 let clicks=0;const pending=[];
 const context={isNutritionEnabled:()=>true,closeDashboardInsights(){},TDEE_RANGE_KEY:'range',localStorage:{setItem(){}},document:{getElementById:()=>({click:()=>clicks++}),querySelector:s=>s.startsWith('.nav-btn')?{click(){}}:null},window:{setTimeout:fn=>pending.push(fn)}};
 vm.createContext(context);vm.runInContext(fn,context);vm.runInContext('openProgressGraph("comparison")',context);
 while(pending.length)pending.shift()();assert.equal(clicks,1);
});

test('meal reuse selects the latest earlier meal across gaps, excluding future dates',()=>{
 const source=read('js/nutrition/food-log.js');
 const start=source.indexOf('function latestMealSource('),end=source.indexOf('\nfunction mealMarkup',start);
 const context={};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const log={'2026-10-01':[{meal:'Breakfast',name:'older'}],'2026-10-08':[{meal:'Breakfast',name:'latest'}],'2026-10-11':[{meal:'Lunch'}],'2026-10-13':[{meal:'Breakfast',name:'future'}]};
 const result=context.latestMealSource(log,'2026-10-12','Breakfast');assert.equal(result.date,'2026-10-08');assert.equal(result.entries[0].name,'latest');assert.equal(context.latestMealSource(log,'2026-10-12','Dinner').date,null);
});

test('repair persistence failure does not hide a saved workout from recap',()=>{
 const source=read('js/workouts/workout-complete-recap.js');const fn=source.match(/function readSessions\(\)\{[^\n]+/)[0];
 const context={SESSION_STORAGE_KEY:'sessions',localStorage:{getItem:()=> '[{"id":"saved"}]',setItem(){throw Error('quota');}},repairWorkoutSessionList:sessions=>({sessions,changed:true})};
 vm.createContext(context);vm.runInContext(fn,context);assert.equal(context.readSessions()[0].id,'saved');
});

test('recap includes logged sets consistently but excludes empty rows and warmups',()=>{
 const source=read('js/workouts/workout-complete-recap.js');const start=source.indexOf('function isCompletedSet('),end=source.indexOf('function getMuscleSetStats(',start);
 const context={calculateWorkoutVolume:()=>0};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const session={exercises:[{sets:[{weight:70,reps:20,completed:false},{weight:85,reps:12,completed:true},{weight:null,reps:null,completed:false},{weight:20,reps:10,isWarmup:true},{weight:0,durationSeconds:45,completed:true}]}]};
 assert.equal(context.summarizeSession(session).workingSets,3);assert.equal(context.summarizeSession(session).totalReps,32);
});
