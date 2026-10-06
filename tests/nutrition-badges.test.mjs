import test from 'node:test';
import assert from 'node:assert/strict';
import {availableBadges,reconcileBadges,BADGES_KEY} from '../js/goals/lifting-goals-engine.js';
import {nutritionBadgeMetrics} from '../js/goals/nutrition-badges.js';
const now=new Date('2026-10-05T12:00:00');
function storage(values={}){const m=new Map(Object.entries(values).map(([k,v])=>[k,JSON.stringify(v)]));return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
const logs=Object.fromEntries(Array.from({length:5},(_,i)=>[`2026-10-0${i+1}`,[{nutrition:{calories:2700,protein:150}}]]));
const complete=Object.fromEntries(Object.keys(logs).map(d=>[d,true]));
test('nutrition disabled hides all 12 badges, skips earning and preserves existing awards',()=>{
 const s=storage({'level_up_training_preferences':{nutritionEnabled:false},[BADGES_KEY]:{earned:{'first-plate':{earnedAt:'2026-10-01'}}},'level_up_food_log_v1':logs,'level_up_food_log_complete_days_v1':complete});
 assert.equal(availableBadges(s).length,48);const result=reconcileBadges([],{storage:s,now,notify:true});assert.ok(result.earned['first-plate']);assert.equal(result.earned['nutrition-rhythm'],undefined);
 s.setItem('level_up_training_preferences','{}');assert.equal(availableBadges(s).length,60);
});
test('completed days only, rolling windows, missing targets excluded and target snapshots prevent retroactive scoring',()=>{
 const s=storage({'level_up_food_log_v1':logs,'level_up_food_log_complete_days_v1':{...complete,'2026-10-06':true},'level_up_nutrition_plan':{currentCalories:2700},'level_up_nutrition_macro':{useManual:true,manualMacros:{protein:150}}});
 let m=nutritionBadgeMetrics(s,now);assert.equal(m.foodDays,5);assert.equal(m.foodRhythm,5);assert.equal(m.proteinWeek,0);
 for(const d of Object.keys(logs))reconcileBadges([],{storage:s,now,nutritionEvent:{action:'day_completed',dateKey:d}});
 let state=JSON.parse(s.getItem(BADGES_KEY));m=nutritionBadgeMetrics(s,now,state);assert.equal(m.proteinWeek,5);assert.equal(m.calorieDays,5);
 s.setItem('level_up_nutrition_macro',JSON.stringify({useManual:true,manualMacros:{protein:300}}));assert.equal(nutritionBadgeMetrics(s,now,state).proteinWeek,5);
 s.setItem('level_up_food_log_complete_days_v1',JSON.stringify({'2026-10-01':true}));assert.equal(nutritionBadgeMetrics(s,now,state).foodDays,1);
});
test('under eating gives no calorie credit, excessive protein gives only one day credit',()=>{
 const s=storage({'level_up_food_log_v1':{'2026-10-01':[{nutrition:{calories:1800,protein:400}}]},'level_up_food_log_complete_days_v1':{'2026-10-01':true}});
 const m=nutritionBadgeMetrics(s,now,{nutritionTargets:{'2026-10-01':{calories:2700,protein:150}}});assert.equal(m.calorieDays,0);assert.equal(m.proteinWeek,1);
});
test('recipes dedupe contents; intake reviews dedupe weeks; review must be completed with an estimate',()=>{
 const meal={items:[{name:'Oats',amount:100,nutrition:{calories:300}}]};const s=storage({'level_up_saved_meals_v1':[meal,{...meal,name:'Copy'},{items:[]}],'level_up_maintenance_check_in_v1':{reviewedAt:'2026-10-01',estimate:2400}});
 const m=nutritionBadgeMetrics(s,now,{intakeReviewed:['2026-09-01','2026-09-02','2026-09-08','2026-09-15','2026-09-22','2026-12-01']});assert.equal(m.savedMeals,1);assert.equal(m.intakeWeeks,4);assert.equal(m.nutritionReviews,1);
});
test('weight goal uses trend and minimum history; maintenance needs four weeks and regular weigh-ins',()=>{
 const weights=Array.from({length:35},(_,i)=>({date:new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10),weight:160}));
 const s=storage({'forge_weight_entries':weights,'level_up_nutrition_phases':[{type:'maintenance',startDate:'2026-09-01',startWeight:160}]});assert.equal(nutritionBadgeMetrics(s,now).maintenanceGoals,1);
 s.setItem('forge_weight_entries',JSON.stringify(weights.filter((_,i)=>i%7===0)));assert.equal(nutritionBadgeMetrics(s,now).maintenanceGoals,0);
 s.setItem('level_up_nutrition_phases',JSON.stringify([{type:'lean_bulk',startDate:'2026-09-01',startWeight:150,goalWeight:159}]));s.setItem('forge_weight_entries',JSON.stringify(weights));assert.equal(nutritionBadgeMetrics(s,now).weightGoals,1);
 s.setItem('forge_weight_entries',JSON.stringify(weights.slice(-1)));assert.equal(nutritionBadgeMetrics(s,now).weightGoals,0);
});
test('new nutrition awards announce once and survive reopened logs',()=>{
 const s=storage({'level_up_food_log_v1':logs,'level_up_food_log_complete_days_v1':complete});const first=reconcileBadges([],{storage:s,now,notify:true});assert.ok(first.newlyEarned.includes('first-plate'));assert.equal(reconcileBadges([],{storage:s,now,notify:true}).newlyEarned.length,0);s.setItem('level_up_food_log_complete_days_v1','{}');assert.ok(reconcileBadges([],{storage:s,now}).earned['first-plate']);
});
