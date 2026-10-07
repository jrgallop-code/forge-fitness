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

test('guard holds logged intake while preserving maintenance without double counting', () => {
    const update = buildCoordinatedWeeklyUpdate({ currentMaintenance: 2300, proposedMaintenance: 2400, currentTarget: 2700, actualIntakeCalories: 2600, actualRate: 1.1, targetRate: .5, adaptiveReady: true, recentTrendGuard: decision(1.1, .4) });
    assert.equal(update.guardedHold, true);
    assert.equal(update.targetCalories, 2600);
    assert.equal(update.maintenanceCalories, 2300);
    assert.equal(update.targetChange, -100);
    assert.equal(update.behavioralChange, 0);
});

test('guard compares the intended behavioral correction even when intake exceeds the saved target', () => {
    const update = buildCoordinatedWeeklyUpdate({ currentMaintenance: 2300, proposedMaintenance: 2400, currentTarget: 2400, actualIntakeCalories: 2800, actualRate: 1, targetRate: .5, adaptiveReady: true, recentTrendGuard: decision(1, .5) });
    assert.equal(update.guardedHold, true);
    assert.equal(update.targetCalories, 2800);
});

test('automatic maintenance cannot bypass a conflicting recent trend', () => {
    const result = buildAutomaticMaintenanceUpdate({ ready: true, currentMaintenance: 2300, proposedMaintenance: 2400, currentTarget: 2700, adaptiveMetrics: { recommendationReady: true, actualRateLbPerWeek: 1.1, targetRateLbPerWeek: .5, recentTrendGuard: decision(1.1, .4) } });
    assert.equal(result, null);
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

 test('guard rounds an eligible 2841 average to 2850 and falls back without intake', () => {
 const args = {currentMaintenance:2300, proposedMaintenance:2400,currentTarget:2700,actualRate:1.1,targetRate:.5,adaptiveReady:true,recentTrendGuard:decision(1.1,.4)};
 assert.equal(buildCoordinatedWeeklyUpdate({...args,actualIntakeCalories:2841}).targetCalories,2850);
 assert.equal(buildCoordinatedWeeklyUpdate(args).targetCalories,2700);
 assert.equal(buildCoordinatedWeeklyUpdate({...args,actualIntakeCalories:2812.5}).targetCalories,2825);
 });
