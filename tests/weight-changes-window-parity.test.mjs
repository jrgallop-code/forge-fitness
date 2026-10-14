import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('js/progress/weight-changes-summary.js','utf8');
const functions=['localDate','shiftDate','summaryForWindow'].map(name=>source.slice(source.indexOf(`function ${name}(`),source.indexOf('\n}\n',source.indexOf(`function ${name}(`))+3)).join('\n');
const RealDate=Date;
class FixedDate extends RealDate { constructor(...args){super(...(args.length?args:['2026-10-14T12:00:00']));} }
const context={Date:FixedDate,displayMass:v=>v};vm.createContext(context);vm.runInContext(functions+'\nglobalThis.summary=summaryForWindow;',context);
const series=Array.from({length:100},(_,i)=>{const date=new RealDate('2026-10-14T12:00:00');date.setDate(date.getDate()-(99-i));return {date:date.toISOString().slice(0,10),weight:150+i*.2};});
test('all Weight Changes periods use N inclusive calendar dates, matching chart preset logic',()=>{
 for(const days of [3,7,14,30,90]){
  const result=context.summary(series,days);
  assert.equal(result.points.length,days);
  assert.equal(result.delta,series.at(-1).weight-series.at(-days).weight);
 }
 assert.equal(context.summary(series,7).points[0].date,'2026-10-08');
});
test('missing today weigh-in keeps the calendar start rather than shifting the comparison backward',()=>{
 const entries=series.slice(0,-1), result=context.summary(entries,7);
 assert.equal(result.points[0].date,'2026-10-08');
 assert.equal(result.delta,entries.at(-1).weight-entries.at(-6).weight);
});
