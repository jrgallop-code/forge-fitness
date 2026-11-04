import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('js/nutrition/calories-full-adjustment-display.js','utf8');
const fn=source.slice(source.indexOf('function openWeeklyReviewModal('),source.indexOf('\nfunction getVisibleTrend('));
function open({ready=true,change=0}={}){
 let appended=null,applied=null;
 const listeners={};
 const recommendation={targetChange:change,targetCalories:2800+change,previousTarget:2800,weeklyAverageCalories:2937,actualRate:.75,targetRate:.5};
 const modal={dataset:{},addEventListener(){},querySelector(selector){return {addEventListener(type,callback){listeners[selector]=callback;},focus(){}};}};
 const context={getMaintenanceUpdateMode:()=>"review",getActiveNutritionPhase:()=>({id:'phase'}),getActivePhaseMetrics:()=>({recommendationReady:ready,targetRateLbPerWeek:.5}),sessionStorage:{getItem:()=>null},WEEKLY_REVIEW_PREVIEW_KEY:'preview',getVisibleTrend:()=>({weeklyChange:.75,windowDays:21}),buildSharedRecommendation:()=>recommendation,closeWeeklyReviewModal(){},document:{createElement:()=>modal,body:{appendChild(node){appended=node;}}},hasTodaysWeighIn:()=>true,formatRate:String,formatSignedCalories:String,applyFullAdjustment(event,value){applied=value;}};
 vm.runInNewContext(fn+'\nopenWeeklyReviewModal();',context);
 return {get appended(){return appended;},get applied(){return applied;},listeners};
}
test('review opens and confirms an unchanged 2800-calorie recommendation',()=>{
 const result=open();
 assert.ok(result.appended);
 assert.match(result.appended.innerHTML,/No calorie change is needed/);
 assert.match(result.appended.innerHTML,/Confirm current target/);
 result.listeners['#weekly-modal-review-apply']({});
 assert.equal(result.applied.recommendation.targetCalories,2800);
});
test('review opens when a target change is recommended',()=>{
 const result=open({change:-100});
 assert.ok(result.appended);
 assert.match(result.appended.innerHTML,/Update to 2700/);
});
test('review still waits for the minimum data requirements',()=>{
 assert.equal(open({ready:false}).appended,null);
});
