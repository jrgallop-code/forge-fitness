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
function expectedWednesday() {
 const now = new Date();
 now.setHours(12,0,0,0);
 now.setDate(now.getDate() + (3-now.getDay()+7)%7);
 return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
const isReviewDay = () => new Date().getDay() === 3;
const expectedStatus = () => isReviewDay() ? 'waiting' : 'upcoming';

test('past logged days count without a separate completion marker', () => {
 seed(2); const status=getWeeklyCheckInStatus();
 assert.equal(status.state,expectedStatus());
 assert.equal(status.foodDays,7); assert.equal(status.foodNeeded,0);
 assert.equal(status.reviewDate,expectedWednesday());
});
test('returning from manual to coach preserves the phase and waits for Wednesday', () => {
 seed(7); const original=localStorage.getItem('level_up_nutrition_phases');
 setMaintenanceUpdateMode('track'); assert.equal(getWeeklyCheckInStatus().state,'tracking');
 setMaintenanceUpdateMode('review'); const status=getWeeklyCheckInStatus();
 assert.equal(status.state,expectedStatus());
 assert.equal(status.reviewDate,expectedWednesday());
 assert.equal(localStorage.getItem('level_up_nutrition_phases'),original);
 document.documentElement.dataset.weeklyCalorieReviewReady='true';
 assert.equal(getWeeklyCheckInStatus().reviewReady,isReviewDay());
});
test('a missing recommendation is not presented as a completed no-change assessment', () => {
 seed(7);
 assert.equal(getWeeklyCheckInStatus().headline,
   isReviewDay() ? 'Check-in due — review pending' : `Next check-in Wednesday`);
 document.documentElement.dataset.weeklyCalorieReviewReason='no-change';
 assert.equal(getWeeklyCheckInStatus().state,'upcoming');
});
test('insufficient trend history stays scheduled for Wednesday', () => {
 seed(7);
 localStorage.setItem('forge_weight_entries',JSON.stringify(Array.from({length:7},(_,i)=>({date:day(i-6),weight:170}))));
 const status=getWeeklyCheckInStatus();
 assert.equal(status.state,expectedStatus());
 assert.equal(status.reviewDate,expectedWednesday());
});
test('an overdue phase keeps historic nutrition days but schedules next Wednesday', () => {
 seed(0);
 const phases=JSON.parse(localStorage.getItem('level_up_nutrition_phases'));
 phases[0].startDate=day(-42);
 localStorage.setItem('level_up_nutrition_phases',JSON.stringify(phases));
 const status=getWeeklyCheckInStatus();
 assert.equal(status.foodDays,7); assert.equal(status.foodNeeded,0);
 assert.equal(new Date(`${status.reviewDate}T12:00:00`).getDay(),3);
 assert.ok(status.reviewDate >= day(0));
});
test('today does not replace missing historical food days', () => {
 seed(0);
 const log={}; for(let i=0;i<4;i++) log[day(-i)]=[{nutrition:{calories:2800}}];
 localStorage.setItem('level_up_food_log_v1',JSON.stringify(log));
 const status=getWeeklyCheckInStatus();
 assert.equal(status.foodDays,3); assert.equal(status.foodNeeded,1);
});
