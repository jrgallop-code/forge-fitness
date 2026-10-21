import test from 'node:test';
import assert from 'node:assert/strict';
const storage = new Map();
globalThis.localStorage = { getItem:key => storage.get(key) ?? null, setItem:(key,value) => storage.set(key,String(value)), removeItem:key => storage.delete(key) };
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class {};
const { getWeeklyCheckInStatus } = await import('../js/nutrition/weekly-check-in-status.js');
const { setMaintenanceUpdateMode } = await import('../js/nutrition/maintenance-check-in.js?v=calendar-checkin-day-1');
globalThis.document = { documentElement:{ dataset:{} } };
const day = offset => {
 const date = new Date(); date.setDate(date.getDate()+offset);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};
function seed(completed = 0) {
 storage.clear(); document.documentElement.dataset = { weeklyCalorieReviewReady:'false' };
 localStorage.setItem('forge_weight_entries', JSON.stringify(Array.from({length:42}, (_,i) => ({date:day(i-41),weight:170}))));
 localStorage.setItem('level_up_nutrition_phases', JSON.stringify([{id:'existing-phase',goalId:'bulk_standard',startDate:day(-41),targetWeeklyRate:0.5,maintenanceCalories:2500,startCalories:2750,currentCalories:2750}]));
 const log = {}, complete = {};
 for(let i=1;i<=7;i++) { log[day(-i)] = [{nutrition:{calories:2750}}]; if(i<=completed) complete[day(-i)]=true; }
 localStorage.setItem('level_up_food_log_v1',JSON.stringify(log));
 localStorage.setItem('level_up_food_log_complete_days_v1',JSON.stringify(complete));
}
test('logged but unfinished food days cannot look complete or postpone a due review', () => {
 seed(2); const status=getWeeklyCheckInStatus();
 assert.equal(status.state,'waiting'); assert.equal(status.foodDays,2); assert.equal(status.foodNeeded,2);
 assert.equal(status.reviewDate,day(0));
});
test('returning from manual to coach preserves the phase and reopens the due check-in', () => {
 seed(7); const original=localStorage.getItem('level_up_nutrition_phases');
 setMaintenanceUpdateMode('track'); assert.equal(getWeeklyCheckInStatus().state,'tracking');
 setMaintenanceUpdateMode('review'); const status=getWeeklyCheckInStatus();
 assert.equal(status.state,'waiting'); assert.equal(status.reviewDate,day(0));
 assert.equal(localStorage.getItem('level_up_nutrition_phases'),original);
 document.documentElement.dataset.weeklyCalorieReviewReady='true';
 assert.equal(getWeeklyCheckInStatus().reviewReady,true);
});
test('a missing recommendation is not presented as a completed no-change assessment', () => {
 seed(7); assert.equal(getWeeklyCheckInStatus().headline,'Check-in due — review pending');
 document.documentElement.dataset.weeklyCalorieReviewReason='no-change';
 assert.equal(getWeeklyCheckInStatus().state,'upcoming');
});
