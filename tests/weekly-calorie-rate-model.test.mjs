import test from 'node:test';import assert from 'node:assert/strict';
globalThis.localStorage={getItem:()=>null};
const {buildWeeklyCalorieRate}=await import('../js/progress/weekly-calorie-rate-model.js');
const log=calories=>[{nutrition:{calories}}];
test('calorie averages exclude missing days and need four logging days',()=>{
 const foodLog={'2026-10-05':log(2000),'2026-10-06':log(2200),'2026-10-07':log(2400),'2026-10-08':log(2600)};
 const row=buildWeeklyCalorieRate({foodLog,today:'2026-10-09',weeks:1})[0];
 assert.equal(row.calories,2300);assert.equal(row.foodDays,4);assert.equal(row.partial,true);assert.equal(row.rate,null);
 delete foodLog['2026-10-08'];assert.equal(buildWeeklyCalorieRate({foodLog,today:'2026-10-09',weeks:1})[0].calories,null);
});
test('today food data waits for complete tracking',()=>{
 const foodLog={'2026-10-05':log(2000),'2026-10-06':log(2000),'2026-10-07':log(2000),'2026-10-09':log(2800)};
 assert.equal(buildWeeklyCalorieRate({foodLog,today:'2026-10-09',weeks:1})[0].calories,null);
 assert.equal(buildWeeklyCalorieRate({foodLog,completeDays:{'2026-10-09':true},today:'2026-10-09',weeks:1})[0].calories,2200);
});
test('weekly rates are historical snapshots unaffected by later weigh-ins',()=>{
 const weights=Array.from({length:50},(_,i)=>({date:new Date(Date.UTC(2026,7,24+i)).toISOString().slice(0,10),weight:170+i*.05}));
 const rows=buildWeeklyCalorieRate({weights,today:'2026-10-09',weeks:4});
 assert.ok(rows[0].rate>0);assert.equal(rows[0].startDate,'2026-09-14');
 const changed=weights.map(w=>w.date>'2026-09-20'?{...w,weight:250}:w);
 assert.equal(buildWeeklyCalorieRate({weights:changed,today:'2026-10-09',weeks:4})[0].rate,rows[0].rate);
});
test('a week with no weigh-ins has a rate gap instead of stale weight data',()=>{
 const rows=buildWeeklyCalorieRate({weights:[{date:'2026-09-01',weight:170}],today:'2026-10-09',weeks:1});
 assert.equal(rows[0].rate,null);assert.equal(rows[0].weighIns,0);
});
test('comparison follows the same bottom range windows including phase and all time',async()=>{
 const {weeklyComparisonWindow}=await import('../js/progress/weekly-calorie-rate-model.js');
 assert.equal(weeklyComparisonWindow({range:'1w',today:'2026-10-09'}).startDate,'2026-10-03');
 assert.equal(weeklyComparisonWindow({range:'1y',today:'2026-10-09'}).startDate,'2025-10-10');
 assert.equal(weeklyComparisonWindow({range:'phase',today:'2026-10-09',phase:{startDate:'2026-09-10'}}).startDate,'2026-09-10');
 const all=weeklyComparisonWindow({range:'all',today:'2026-10-09',weights:[{date:'2026-09-01',weight:170},{date:'2026-10-08',weight:171}]});
 assert.equal(all.startDate,'2026-09-01');assert.equal(all.today,'2026-10-08');
});
test('selected range excludes calorie days outside its boundary',()=>{
 const foodLog={'2026-10-05':log(10000),'2026-10-06':log(2000),'2026-10-07':log(2000),'2026-10-08':log(2000),'2026-10-09':log(2000)};
 const row=buildWeeklyCalorieRate({foodLog,completeDays:{'2026-10-09':true},today:'2026-10-09',startDate:'2026-10-06',weeks:1})[0];assert.equal(row.calories,2000);
});
