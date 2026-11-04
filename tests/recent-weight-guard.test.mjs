import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecentWeightEvidence, decideRecentWeightGuard, recentWeightGuardCopy } from '../js/nutrition/recent-weight-guard.js';
import { calculateTrendWeightSeries } from '../js/core/weight-trend.js';
import { buildCoordinatedWeeklyUpdate } from '../js/nutrition/calorie-adjustment-coordinator.js';
import { buildAutomaticMaintenanceUpdate } from '../js/nutrition/maintenance-check-in.js';
import { GOAL_PRESETS, calculateGoalCalories } from '../js/nutrition/tdee-calculator.js';

const date = i => new Date(Date.UTC(2026, 7, 1 + i)).toISOString().slice(0, 10);
const weights = Array.from({ length: 65 }, (_, i) => ({ date: date(i), weight: 160 + i / 14 }));
const foodLog = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [date(57 + i), [{ calories: 2700 }]]));
const completedDays = Object.fromEntries(Object.keys(foodLog).map(d => [d, true]));
const evidence = (overrides = {}) => buildRecentWeightEvidence({ weights, foodLog, completedDays, asOfDate: date(64), longRate: 1, targetRate: .5, ...overrides });
const decision = (longRate, recentRate, targetRate = .5) => ({ confidence: 'available', longRate, recentRate, targetRate, disagrees: Math.abs(longRate - recentRate) >= .3 - 1e-9, recentNearGoal: Math.abs(targetRate - recentRate) <= .2 + 1e-9 });

test('recent evidence uses exactly seven elapsed days of the same smoothed signal', () => {
    const result = evidence();
    const series = calculateTrendWeightSeries(weights, { allowFuture: true, endDate: date(64) });
    assert.equal(result.confidence, 'available');
    assert.equal(result.startDate, date(57));
    assert.equal(result.recentRate, series.at(-1).weight - series.find(p => p.date === date(57)).weight);
    assert.equal(result.foodDays, 7);
    assert.equal(result.weighIns, 7);
});

test('holds a reduction when the latest week is near the goal despite the faster long trend', () => {
    const result = decideRecentWeightGuard(decision(1.1, .4), -150);
    assert.equal(result.hold, true);
    assert.equal(result.confidence, 'conflicting');
    assert.match(recentWeightGuardCopy(result, 2700), /Keep 2700 kcal\/day/);
});

test('holds increases and direction reversals symmetrically', () => {
    assert.equal(decideRecentWeightGuard(decision(0, .5), 150).hold, true);
    assert.equal(decideRecentWeightGuard(decision(1, -.2), -150).hold, true);
});

test('does not block agreement, small discrepancies, or a zero adjustment', () => {
    assert.equal(decideRecentWeightGuard(decision(1.2, .9), -150).hold, false);
    assert.equal(decideRecentWeightGuard(decision(.8, .6), -150).hold, false);
    assert.equal(decideRecentWeightGuard({ confidence: 'insufficient' }, 0).hold, false);
});

test('interpolation and stale or future readings cannot manufacture sufficient coverage', () => {
    const sparse = weights.filter(w => w.date < date(58) || [date(59), date(61), date(64)].includes(w.date));
    assert.equal(evidence({ weights: sparse }).confidence, 'insufficient');
    assert.equal(evidence({ asOfDate: date(67) }).confidence, 'insufficient');
    const future = evidence({ weights: [...weights, { date: date(65), weight: 250 }] });
    assert.equal(future.recentRate, evidence().recentRate);
    assert.equal(future.endDate, date(64));
    const noBaseline = evidence({ weights: weights.slice(-7) });
    assert.equal(noBaseline.confidence, 'insufficient');
});

test('today and explicitly incomplete food logs do not count; empty completed dates do not count', () => {
    const incomplete = evidence({ completedDays: { [date(57)]: false, [date(58)]: false }, foodLog: { ...foodLog, [date(64)]: [{ calories: 3000 }] } });
    assert.equal(incomplete.foodDays, 5);
    assert.equal(decideRecentWeightGuard(incomplete, -100).hold, true);
    assert.equal(evidence({ foodLog: {}, completedDays: Object.fromEntries(Object.keys(foodLog).map(d => [d, true])) }).foodDays, 0);
});

test('aggressive bulk is a distinct one-pound preset after the existing bulk choices', () => {
    assert.equal(GOAL_PRESETS.bulk_aggressive.weeklyWeightChangeLb, 1);
    assert.equal(GOAL_PRESETS.bulk_aggressive.dailyCalorieAdjustment, 500);
    assert.equal(calculateGoalCalories(2300, 'bulk_aggressive').calories, 2800);
    assert.deepEqual(Object.keys(GOAL_PRESETS).filter(k => k.startsWith('bulk_')), ['bulk_conservative', 'bulk_standard', 'bulk_aggressive']);
});

test("unconfirmed historical food logs do not imply complete intake evidence", () => {
    assert.equal(evidence({ completedDays: {} }).confidence, "insufficient");
});

 test('four completed days unlock matching evidence; three days explain the hold', () => {
 const days = Object.keys(foodLog);
 const four = Object.fromEntries(days.slice(0,4).map(d=>[d,true]));
 assert.equal(evidence({completedDays:four}).confidence,'available');
 const three = Object.fromEntries(days.slice(0,3).map(d=>[d,true]));
 const insufficient = evidence({completedDays:three});
 assert.equal(insufficient.confidence,'insufficient');
 assert.match(recentWeightGuardCopy(insufficient,2800), /3\/4/);
 });
 test('screenshot regression keeps 2800 with supported and insufficient evidence', () => {
 const args={currentMaintenance:2530,proposedMaintenance:2530,currentTarget:2800,actualIntakeCalories:2937,actualRate:.75,targetRate:.5,adaptiveReady:true};
 const supported=buildCoordinatedWeeklyUpdate({...args,recentTrendGuard:decision(.75,.70)});
 assert.equal(supported.targetCalories,2800);
 assert.equal(supported.guardedHold,undefined);
 const held=buildCoordinatedWeeklyUpdate({...args,recentTrendGuard:{confidence:'insufficient'}});
 assert.equal(held.targetCalories,2800);
 assert.equal(held.targetChange,0);
 assert.equal(held.guardedHold,undefined);
 });

test('seven-day disagreement cannot override the three-week pace calculation', () => {
 const args={currentMaintenance:2530,proposedMaintenance:2530,currentTarget:2800,actualIntakeCalories:2937,actualRate:1.1,targetRate:.5,adaptiveReady:true};
 const baseline=buildCoordinatedWeeklyUpdate(args);
 assert.equal(baseline.targetCalories,2625);
 for(const recentTrendGuard of [decision(1.1,.4),{confidence:'insufficient'}]){
   assert.deepEqual(buildCoordinatedWeeklyUpdate({...args,recentTrendGuard}),baseline);
 }
});
