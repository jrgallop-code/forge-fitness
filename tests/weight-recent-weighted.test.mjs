import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRecentWeightedWeeklyChange, recentWeekRegressionWeight, calculateVisibleWeightTrend } from '../js/core/weight-trend.js';
const date = i => new Date(Date.UTC(2026, 7, 1 + i)).toISOString().slice(0, 10);
const entries = slope => Array.from({length: 68}, (_, i) => ({date: date(i), weight: 160 + (i <= 60 ? i / 7 : 60 / 7 + (i - 60) * slope / 7)}));
test('full calendar weeks receive 60, 30, 10 percent influence', () => {
  for (const [block, expected] of [[0,.6],[1,.3],[2,.1]]) {
    const sum = Array.from({length:7}, (_,i) => recentWeekRegressionWeight(date(67 - block*7 - i), date(67))).reduce((a,b)=>a+b,0);
    assert.ok(Math.abs(sum-expected)<1e-12);
  }
  assert.equal(recentWeekRegressionWeight(date(46),date(67)),0);
});
test('weighted regression preserves linear slopes in either direction', () => {
  for (const slope of [-1,0,1]) {
    const values = Array.from({length:21},(_,i)=>({date:date(i),weight:160+i*slope/7}));
    assert.ok(Math.abs(calculateRecentWeightedWeeklyChange(values,date(20))-slope)<1e-10);
  }
  assert.equal(calculateRecentWeightedWeeklyChange([{date:date(0),weight:160}],date(0)),null);
});
test('reacts sooner to sustained slowing and acceleration without changing trend weights', () => {
  for (const slope of [.5,1.5]) {
    const data=entries(slope);
    const weighted=calculateVisibleWeightTrend(data,{allowFuture:true});
    const equal=calculateVisibleWeightTrend(data,{allowFuture:true,rateWeighting:'equal'});
    assert.deepEqual(weighted.series,equal.series);
    assert.ok(Math.abs(weighted.weeklyChange-slope)<Math.abs(equal.weeklyChange-slope));
  }
});
test('interpolation cannot unlock a rate without enough real weigh-ins', () => {
  const result=calculateVisibleWeightTrend([{date:date(0),weight:160},{date:date(20),weight:163}],{allowFuture:true});
  assert.equal(result.weeklyChange,null);
  assert.equal(result.entries,2);
});
