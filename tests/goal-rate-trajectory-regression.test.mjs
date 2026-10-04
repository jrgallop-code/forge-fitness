import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const authority = readFileSync('js/nutrition/nutrition-authority-sync.js','utf8');
const source = readFileSync('js/progress/goal-trajectory-card.js','utf8');
test('Goals rate is independent of the preserved expenditure rate', () => {
  const body=authority.slice(authority.indexOf('function getAuthoritySignals()'),authority.indexOf('function setText'));
  const context={getCalculatedMaintenanceEstimate:()=>({weightRateLbPerWeek:1.07,liveMaintenanceCalories:2335}),getActiveNutritionPhase:()=>({currentCalories:2700}),getActivePhaseMetrics:()=>({actualRateLbPerWeek:1.01}),currentExpenditure:e=>e.liveMaintenanceCalories,positive:Number,finite:v=>v==null?null:Number(v)};
  vm.createContext(context);vm.runInContext(body+';result=getAuthoritySignals();',context);
  assert.equal(context.result.weightRate,1.01);
  assert.equal(context.result.expenditure,2335);
});
test('target trajectory is connected and partial ranges do not jump to goal weight', () => {
  const body=source.slice(source.indexOf('function goalEndMs'),source.indexOf('function projectedEndDate'));
  const now=Date.now(), date=t=>new Date(t).toISOString().slice(0,10);
  const data={startMs:now-17*86400000,goal:{startWeight:160.1,currentWeight:162.2,selectedRateLbPerWeek:.5,goalWeight:175,status:'scheduled',estimatedDate:date(now+180*86400000)},points:[{date:date(now-2*86400000),weight:162.1}]};
  const context={Date,finite:v=>v==null?null:Number(v),dateValue:v=>new Date(v+'T12:00:00').getTime(),format:v=>v.toFixed(1)};
  vm.createContext(context);vm.runInContext(body,context);
  for(const range of ['all','1m']) {
    const html=context.graph(data,range);
    const path=html.match(/<path d="([^"]+)" stroke="#f25265"/)[1];
    assert.equal((path.match(/M/g)||[]).length,1);
    assert.ok(!/NaN|Infinity/.test(path));
  }
});
