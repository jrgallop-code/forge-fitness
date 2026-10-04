import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectCalendarDate, calendarMonthCells } from '../js/nutrition/calorie-range-calendar.js';
test('date taps select a start and end, then restart the selection',()=>{
 let state={start:'2026-09-28',end:'2026-10-04',choosingEnd:false};
 state=selectCalendarDate(state,'2026-09-24');assert.equal(state.choosingEnd,true);
 state=selectCalendarDate(state,'2026-09-30');assert.deepEqual(state,{start:'2026-09-24',end:'2026-09-30',choosingEnd:false});
 state=selectCalendarDate(state,'2026-10-02');state=selectCalendarDate(state,'2026-09-28');
 assert.equal(state.start,'2026-09-28');assert.equal(state.end,'2026-10-02');
});
test('month cells align Monday-first, including leap years and row padding',()=>{
 const oct=calendarMonthCells('2026-10');assert.equal(oct[3],'2026-10-01');assert.equal(oct.filter(Boolean).length,31);assert.equal(oct.length%7,0);
 assert.equal(calendarMonthCells('2024-02').filter(Boolean).at(-1),'2024-02-29');
 const march=calendarMonthCells('2026-03');assert.equal(march.filter(Boolean).length,31);
});
test('expenditure stays together above intake, and duplicate average card is removed',()=>{
 const source=readFileSync('js/nutrition/calorie-stats.js','utf8');
 const summary=source.indexOf('${maintenanceCard(maintenance, checkIn)}'),graph=source.indexOf('${expenditureTrendCard(tdeeTrend'),tutorial=source.indexOf('${expenditureTutorialCard()}'),intake=source.indexOf('<div data-calorie-range-card>'),target=source.indexOf('<article class="calorie-stat-card calorie-target-rule">');
 assert.ok(summary<graph&&graph<tutorial&&tutorial<intake&&intake<target);
 assert.ok(!source.includes('<article class="calorie-stat-card calorie-stat-week">'));
});
