import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCalorieRange, summarizeCalorieRange, validateCalorieRange, shiftCalorieDate } from '../js/nutrition/calorie-range-model.js';
const entry=calories=>[{nutrition:{calories}}];
test('custom seven-day window compares the preceding seven days',()=>{
 const log={};for(let i=0;i<14;i++)log[shiftCalorieDate('2026-09-21',i)]=entry(i<7?2800:2700);
 const r=compareCalorieRange(log,{},'2026-09-28','2026-10-04','2026-10-05');
 assert.equal(r.current.average,2700);assert.equal(r.previous.average,2800);assert.equal(r.difference,-100);
 assert.equal(r.previous.start,'2026-09-21');assert.equal(r.previous.end,'2026-09-27');
 const custom=compareCalorieRange(log,{},'2026-09-25','2026-10-01','2026-10-05');
 assert.equal(custom.current.days.length,7);assert.equal(custom.previous.end,'2026-09-24');
});
test('missing days are excluded and completed zero-calorie days included',()=>{
 const r=summarizeCalorieRange({'2026-09-28':entry(2700)},{'2026-09-29':true},'2026-09-28','2026-09-30','2026-10-04');
 assert.equal(r.average,1350);assert.equal(r.loggedDays,2);assert.equal(r.includedDays,2);
});
test('today remains outside average until complete; absent comparison is null',()=>{
 const log={'2026-10-03':entry(2700),'2026-10-04':entry(1000)};
 const r=compareCalorieRange(log,{},'2026-10-03','2026-10-04','2026-10-04');
 assert.equal(r.current.average,2700);assert.equal(r.current.loggedDays,2);assert.equal(r.difference,null);
 assert.equal(summarizeCalorieRange(log,{'2026-10-04':true},'2026-10-03','2026-10-04','2026-10-04').average,1850);
});
test('date validation and shifting handle DST, leap years, reversed and future dates',()=>{
 assert.equal(shiftCalorieDate('2026-03-07',2),'2026-03-09');
 assert.equal(shiftCalorieDate('2024-02-28',1),'2024-02-29');
 for(const [start,end] of [['2026-02-30','2026-03-02'],['2026-10-04','2026-10-03'],['2026-10-04','2026-10-05']])assert.ok(validateCalorieRange(start,end,'2026-10-04'));
 assert.equal(validateCalorieRange('2026-09-28','2026-10-04','2026-10-04'),'');
 assert.equal(summarizeCalorieRange({}, {},'2026-09-28','2026-10-04','2026-10-04').average,null);
});
