import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { calculateTrendWeightSeries, normalizeWeightEntries } from '../js/core/weight-trend.js';

const source = readFileSync(new URL('../js/progress/analytics-chart-zoom.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').split('document.addEventListener("click", event => resetForRangeButton')[0];
function harness() {
  const storage = new Map(), handlers = new Map(), labels = [];
  const classes = { add() {}, remove() {}, toggle() {} };
  const node = () => ({ textContent: '', style: { setProperty() {} }, classList: classes, querySelector: () => null });
  const context = new Proxy({ measureText: s => ({ width: s.length * 6 }), fillText: (s,x,y) => labels.push({s,x,y}) }, { get: (o,k) => k in o ? o[k] : () => {} });
  const canvas = { isConnected:true, clientWidth:340, style:{}, getContext:() => context, getBoundingClientRect:() => ({left:0,width:340}) };
  const stage = { clientWidth:340, classList:classes, setPointerCapture() {}, getBoundingClientRect:() => ({left:0,width:340}), addEventListener:(name,fn) => handlers.set(name,fn) };
  const instance = { kind:'weight',legacy:{isConnected:true,closest:()=>null},canvas,stage,tooltip:node(),tooltipDate:node(),tooltipValue:node(),tooltipExtra:node(),statusStrong:node(),statusSmall:node(),minus:node(),plus:node(),reset:node(),startInput:node(),endInput:node(),scrub:node(),scrubTrack:node(),scrubStart:node(),scrubEnd:node() };
  const dates=[];const now=new Date();now.setHours(12,0,0,0);
  for(let i=3649;i>=0;i--) { const d=new Date(now);d.setDate(d.getDate()-i);dates.push({date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,weight:160+5*Math.sin(i/250)+1.5*Math.sin(i*1.8)}); }
  storage.set('forge_weight_entries',JSON.stringify(dates));storage.set('level_up_weight_chart_range','3m');
  const store = { getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k) };
  const sandbox = { calculateTrendWeightSeries,normalizeWeightEntries,localStorage:store,sessionStorage:store,displayMass:v=>v,massUnit:()=> 'lb',getComputedStyle:()=>({getPropertyValue:k=>({'--accent':'#146bea','--muted':'#64748b','--line':'#dce5ef'}[k]||'')}),document:{documentElement:{},querySelector:()=>null},window:{devicePixelRatio:1},Date,Map,Set,Math,JSON,setTimeout,clearTimeout,performance,requestAnimationFrame:()=>{} };
  vm.createContext(sandbox);vm.runInContext(source+'\nglobalThis.api={effectiveWindow,domainFor,zoomBy,commitWindow,drawWeight,calendarPeriods,sampleWeightPoints,shiftDate,daysBetween,bindGestures};',sandbox);
  return { api:sandbox.api,instance,dates,storage,handlers,labels,context,canvas };
}

test('a preset can zoom out to ten years, pan beyond its initial range and retain exact trend values', () => {
 const {api,instance:i,dates}=harness();const initial=api.effectiveWindow(i);assert.equal(api.daysBetween(initial.start,initial.end),90);
 api.zoomBy(i,1/100);const all=api.effectiveWindow(i);assert.equal(api.daysBetween(all.start,all.end),3650);
 const rendered=api.drawWeight(i,all);assert.equal(rendered.points.length,3650);
 const trend=calculateTrendWeightSeries(dates);assert.equal(rendered.points.at(-1).trend,trend.at(-1).weight);
 api.commitWindow(i,'2020-06-01','2020-06-30',{animate:false});assert.equal(api.effectiveWindow(i).start,'2020-06-01');
 const historic=api.drawWeight(i,api.effectiveWindow(i));assert.equal(historic.points[0].trend,trend.find(p=>p.date==='2020-06-01').weight);
 api.commitWindow(i,api.shiftDate(all.end,-6),all.end,{animate:false});assert.equal(api.daysBetween(api.effectiveWindow(i).start,api.effectiveWindow(i).end),7);
});
test('calendar headers change across year boundaries and do not collide at decade scale', () => {
 const {api,instance:i,labels}=harness();const periods=api.calendarPeriods('2025-12-15','2026-01-20','month');assert.deepEqual(Array.from(periods,p=>p.label),['DEC','JAN']);
 api.zoomBy(i,1/100);labels.length=0;api.drawWeight(i,api.effectiveWindow(i));const yearLabels=labels.filter(l=>l.y===17);assert.ok(yearLabels.length>=2);
 for(let j=1;j<yearLabels.length;j++)assert.ok(yearLabels[j].x-yearLabels[j-1].x>=32);
});
test('pixel sampling retains first, last, minimum and maximum rather than hiding spikes', () => {
 const {api}=harness();const rows=[160,175,150,162,163].map((weight,index)=>({weight,index,date:'2026-01-01'}));
 const sampled=api.sampleWeightPoints(rows,p=>p.index,10);assert.deepEqual(Array.from(sampled,p=>p.weight),[160,175,150,163]);
});
test('pointer pinch zooms and horizontal drag pans to older history', () => {
 const {api,instance:i,handlers}=harness();api.bindGestures(i);const fire=(type,id,x)=>handlers.get(type)({type,pointerId:id,pointerType:'touch',clientX:x,clientY:100,stopPropagation(){},preventDefault(){}});
 const initial=api.effectiveWindow(i);fire('pointerdown',1,100);fire('pointerdown',2,220);fire('pointermove',1,60);fire('pointermove',2,260);fire('pointerup',1,60);fire('pointerup',2,260);
 const zoomed=api.effectiveWindow(i);assert.ok(api.daysBetween(zoomed.start,zoomed.end)<api.daysBetween(initial.start,initial.end));
 fire('pointerdown',3,90);fire('pointermove',3,290);fire('pointerup',3,290);assert.ok(api.effectiveWindow(i).start<zoomed.start);
});
