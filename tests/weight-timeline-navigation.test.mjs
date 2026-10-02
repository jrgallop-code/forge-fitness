import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Element } from './tiny-dom.mjs';
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
  vm.createContext(sandbox);vm.runInContext(source+'\nglobalThis.api={effectiveWindow,domainFor,zoomBy,commitWindow,drawWeight,calendarPeriods,sampleWeightPoints,shiftDate,daysBetween,bindGestures,weightChartHeight,openExpandedWeightChart,closeExpandedWeightChart,layoutWeightCard};',sandbox);
  return { api:sandbox.api,instance,dates,storage,handlers,labels,context,canvas,sandbox };
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

test('weight rendering uses the previous quadratic smoothing for both trend line and fill', () => {
 const {api,instance:i,context}=harness();let curves=0;context.quadraticCurveTo=()=>curves++;
 const result=api.drawWeight(i,api.effectiveWindow(i));assert.ok(curves>0,'trend must use curved segments');
 assert.equal(curves%2,0,'line and fill trace the same curve');
 assert.equal(i.canvas.style.height,'385px');
 const expected=calculateTrendWeightSeries(JSON.parse(harness().storage.get('forge_weight_entries')));
 assert.equal(result.points.at(-1).trend,expected.at(-1).weight);
});


test('expanded view reuses chart and controls, preserves viewport and restores page focus and scrolling', () => {
 const h=harness(),{api,instance:i,sandbox}=h;
 const body=new Element('body'),app=new Element('div'),card=new Element('section');card.className='weight-chart-card';body.appendChild(app);app.appendChild(card);
 const doc={body,documentElement:{},getElementById:id=>id==='app'?app:null,createElement:tag=>new Element(tag),createComment:()=>new Element('#comment'),addEventListener(){},removeEventListener(){},querySelector:()=>null};sandbox.document=doc;sandbox.window.addEventListener=()=>{};sandbox.window.removeEventListener=()=>{};sandbox.window.innerHeight=844;body.style.overflow='auto';
 const legacy=new Element('canvas');card.appendChild(legacy);i.legacy=legacy;
 const stage=new Element('div');stage.clientWidth=340;const canvas=new Element('canvas');canvas.style={};canvas.getContext=()=>h.context;stage.appendChild(canvas);card.appendChild(stage);i.stage=stage;i.canvas=canvas;
 const ranges=new Element('div');ranges.className='weight-chart-range-control';card.appendChild(ranges);
 let selected=0;const range=new Element('button');range.textContent='3M';range.setAttribute('data-weight-chart-range','3m');range.setAttribute('aria-pressed','true');range.addEventListener('click',()=>selected++);ranges.appendChild(range);
 for(const name of ['controls','datePanel','scrubber','hint']){i[name]=new Element('div');card.appendChild(i[name]);}i.datePanel.hidden=true;
 const summary=new Element('div');summary.className='weight-chart-period-summary';card.appendChild(summary);
 api.layoutWeightCard(i);const order=[...card.children];const before=api.effectiveWindow(i);const trigger=new Element('button');
 api.openExpandedWeightChart(i,trigger);const modal=i.expandedDialog;
 assert.ok(modal.open);assert.equal(i.stage,stage);assert.equal(stage.parentNode,modal);assert.equal(i.controls.parentNode,modal);assert.equal(app.inert,true);assert.equal(body.style.overflow,'hidden');
 assert.ok(api.weightChartHeight(i)>api.weightChartHeight({...i,expandedDialog:null}));
 i.expandedRanges.children[0].click();assert.equal(selected,1,'range buttons forward to original controls');
 api.closeExpandedWeightChart(i);assert.equal(i.expandedDialog,null);assert.equal(stage.parentNode,card);assert.deepEqual(card.children,order);assert.equal(app.inert,false);assert.equal(body.style.overflow,'auto');assert.ok(trigger.focused);assert.deepEqual(api.effectiveWindow(i),before);
});

test('weekends are neutral shaded and daily grids simplify at decade scale',()=>{
 const {api,instance:i,context}=harness();const bands=[];let strokes=0;context.fillRect=(x,y,w,h)=>bands.push({x,w,color:context.fillStyle});context.stroke=()=>strokes++;
 api.drawWeight(i,{start:'2026-09-26',end:'2026-10-02'});assert.equal(bands.length,2);assert.ok(bands.every(b=>b.color==='#64748b'));const weeklyStrokes=strokes;
 bands.length=0;strokes=0;api.drawWeight(i,{start:'2016-10-05',end:'2026-10-02'});assert.equal(bands.length,0);assert.ok(weeklyStrokes>0&&strokes>0);
});

test('daily labels sit at block centers and All retains partial October label',()=>{
 const {api,instance:i,labels}=harness();api.drawWeight(i,{start:'2026-09-17',end:'2026-09-23'});
 const day=labels.find(l=>l.s==='17'&&l.y===39);assert.ok(Math.abs(day.x-(50+272/14))<.1);
 labels.length=0;api.drawWeight(i,{start:'2026-08-05',end:'2026-10-02'});assert.ok(labels.some(l=>l.s==='OCT'&&l.y===39));
});
