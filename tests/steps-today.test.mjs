import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {lastSevenDaysSteps,stepsForToday,localStepsDateKey,getDailyStepsGoal,setDailyStepsGoal} from "../js/health/steps-summary.js";
const dashboard=readFileSync("js/dashboard/dashboard-insights-analytics-v5.js","utf8");
const progress=readFileSync("js/progress/steps-progress-carousel.js","utf8");

test("today uses the device-local HealthKit date, not latest non-today entry",()=>{
 const now=new Date(2026,10,15,13,0);
 const data={steps:[{date:"2026-11-14",steps:9000},{date:"2026-11-15",steps:3800}]};
 assert.equal(localStepsDateKey(now),"2026-11-15");
 assert.equal(stepsForToday(data,now),3800);
 assert.equal(stepsForToday({steps:[{date:"2026-11-14",steps:9000}]},now),null);
 assert.equal(stepsForToday({steps:[{date:"2026-11-15",steps:0}]},now),0);
 assert.equal(stepsForToday({steps:[{date:"2026-11-15",steps:null}]},now),null);
});

test("7-day averages and totals exclude missing HealthKit days",()=>{
 const now=new Date(2026,10,15,14,0);
 const summary=lastSevenDaysSteps({steps:[{date:"2026-11-13",steps:8000},{date:"2026-11-14",steps:10000},{date:"2026-11-15",steps:4000}]},now);
 assert.equal(summary.today,4000);
 assert.equal(summary.total,22000);
 assert.equal(summary.recordedDays,3);
 assert.equal(summary.average,7333);
 assert.equal(summary.dates.length,7);
});

test("the two views display today prominently and retain history metrics",()=>{
 assert.match(dashboard,/data-insights-step-today/);
 assert.match(dashboard,/data-insights-step-average/);
 assert.match(dashboard,/data-insights-step-total/);
 assert.match(dashboard,/lastSevenDaysSteps\(data\)/);
 assert.match(progress,/data-lu-sp-today/);
 assert.match(progress,/data-lu-sp-goal-bar/);
 assert.match(progress,/data-lu-sp-goal-edit/);
 assert.match(progress,/stepsForToday\(data\)/);
 assert.match(progress,/data-lu-sp-average/);
 assert.match(progress,/class=\\"lu-sp-ranges\\"/);
 assert.match(progress,/refreshAppleHealth\(true\)/);
});

test("daily target defaults to 10k and validates bounds",()=>{
 const original=globalThis.localStorage;
 const store=new Map();
 globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
 try {
  assert.equal(getDailyStepsGoal(),10000);
  assert.equal(setDailyStepsGoal(12500),true);
  assert.equal(getDailyStepsGoal(),12500);
  assert.equal(setDailyStepsGoal(0),false);
  assert.equal(setDailyStepsGoal(100001),false);
  assert.equal(getDailyStepsGoal(),12500);
 } finally {
  if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;
 }
});
