import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNutritionDemo,saveDemoWeight,toDisplayWeight,toPounds,DEMO_FOODS,demoMealTotals } from '../js/more/nutrition-tutorial-demo.js';
import {calculateVisibleWeightTrend} from '../js/core/weight-trend.js';
test('eight weeks of practice history, independent of every new session',()=>{
 const a=createNutritionDemo(new Date(2026,9,18,12)),b=createNutritionDemo(new Date(2026,9,18,12));
 assert.equal(a.weights.length,56);assert.equal(a.weights[0].date,'2026-08-23');assert.equal(a.weights.at(-1).date,'2026-10-17');
 assert.equal(saveDemoWeight(a,173.8,'lb'),true);assert.equal(a.weights.length,57);assert.equal(b.weights.length,56);
 saveDemoWeight(a,174,'lb');assert.equal(a.weights.length,57);assert.equal(a.weights.at(-1).weight,174);
 assert.equal(saveDemoWeight(a,'bad','lb'),false);assert.equal(saveDemoWeight(a,0,'lb'),false);
});
test('metric weigh-ins convert to canonical pounds and preserve trend direction',()=>{
 const s=createNutritionDemo(new Date(2026,9,18,12));saveDemoWeight(s,79,'kg');assert.ok(Math.abs(s.weights.at(-1).weight-toPounds(79,'kg'))<.001);
 assert.equal(toDisplayWeight(toPounds(79,'kg'),'kg'),79);
 const r=calculateVisibleWeightTrend(s.weights,{endDate:new Date(2026,9,18,12)});assert.ok(r.weeklyChange<0);assert.equal(r.series.length,57);assert.ok(r.trendWeight>170);
});
test('food portions and meal review use the same scaled nutrition',()=>{
 const f=DEMO_FOODS[1];assert.equal(f.portions[1].grams,1);assert.ok(Math.abs(f.portions[1].nutrition.calories*100-57)<.001);
 const totals=demoMealTotals([{food:1,portion:1,quantity:100},{food:0,portion:0,quantity:1}]);assert.equal(Math.round(totals.calories),157);assert.equal(totals.protein,17.7);
 assert.equal(f.portions[0].nutrition.sodium,undefined);
});
test('practice module has no persistence, sync, recording or production-save calls',()=>{
 const source=readFileSync(new URL('../js/more/interactive-nutrition-tutorial.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/localStorage\.(setItem|removeItem|clear)|fetch\(|getUserMedia|data-food-confirm|saveWeightEntry/);
 assert.match(source,/bindFoodAmountEditor/);assert.match(source,/dialog.showModal/);assert.match(source,/dialog.addEventListener\('cancel'/);
});
