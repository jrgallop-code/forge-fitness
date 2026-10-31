import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const strip=s=>s.replace(/^import[\s\S]*?;\n/gm,'').replace(/export /g,'');
function overview() {
 const state={sessions:'[]',sex:'male',writes:0},nodes=[{dataset:{sevenDayMuscle:'Chest'},style:{v:{},setProperty(k,v){this.v[k]=v}}}];
 const root={querySelectorAll:()=>nodes,set innerHTML(s){state.writes++;this.html=s},get innerHTML(){return this.html}};
 const c=vm.createContext({document:{querySelector:s=>s==='[data-seven-day-volume-root]'?root:null,getElementById:()=>null,addEventListener:()=>{}},window:{addEventListener:()=>{},setTimeout:()=>{}},requestAnimationFrame:()=>{},localStorage:{getItem:k=>k==='forge_workout_sessions'?state.sessions:'all'},getAnatomyConfig:()=>({sex:state.sex,asset:'map.svg',regions:{},viewBox:'0 0 960 1920',imageX:0}),renderSetRangeLegend:()=>'<div>Legend</div>',setBandStyle:()=>'',getSetBandColor:n=>'color-'+n});
 vm.runInContext(strip(read('js/progress/muscle-overview-v2.js')),c);
 c.getLastSevenDayVolume=()=>({startDate:'2026-10-24',endDate:'2026-10-30',volume:new Map([['Chest',10]])});
 return {c,state,root,nodes};
}
test('map renders once for unchanged data, with colors before first paint; rebuilds for logs or sex changes',()=>{
 const {c,state,root,nodes}=overview();c.renderSevenDayVolume();c.renderSevenDayVolume();
 assert.equal(state.writes,1);assert.equal(nodes[0].dataset.completedSets,'10');assert.equal(nodes[0].style.v.fill,'color-10');assert.ok(root.html.includes('Last 7 days'));
 state.sessions='[{"id":"new"}]';c.renderSevenDayVolume();assert.equal(state.writes,2);
 state.sex='female';c.renderSevenDayVolume();assert.equal(state.writes,3);
});
test('selected-range bars update without querying or mutating seven-day map or heading',()=>{
 const {c,root,nodes}=overview();c.renderSevenDayVolume();const initial=root.innerHTML;let added='';const queried=[];
 const breakdown={querySelector:()=>({textContent:''}),querySelectorAll:()=>[],insertAdjacentHTML:(_,s)=>added+=s};
 c.document.querySelector=s=>{queried.push(s);return s==='.seven-day-volume-breakdown'?breakdown:null};c.setTimeout=()=>{};c.clearTimeout=()=>{};
 const b=vm.createContext({...c});vm.runInContext(strip(read('js/progress/muscle-breakdown-range-sync.js')),b);
 b.calculateSelectedVolume=()=>({window:{option:{label:'ALL'}},volume:new Map([['Chest',80]])});
 b.syncBreakdownToSelectedRange();assert.ok(added.includes('80 sets'));assert.equal(nodes[0].dataset.completedSets,'10');assert.equal(root.innerHTML,initial);
 assert.deepEqual(queried.filter(s=>s!=='.seven-day-volume-breakdown'),[]);
});
test('dashboard muscle destination uses one navigation, no polling or staged tab clicks',()=>{
 const s=read('js/dashboard/dashboard-recovery-card.js');const fn=s.slice(s.indexOf('function openMuscleMode(mode)'),s.indexOf('function queueEnsureMuscleSnapshot()'));
 let clicks=0;const c=vm.createContext({document:{querySelector:()=>({click(){clicks++}})},window:{}});vm.runInContext(fn,c);
 c.openMuscleMode('volume');assert.equal(clicks,1);assert.equal(c.window.__levelUpProgressMuscleMode,'volume');c.openMuscleMode('recovery');assert.equal(clicks,2);assert.equal(c.window.__levelUpProgressMuscleMode,'recovery');
 assert.ok(!fn.includes('requestAnimationFrame'));assert.ok(!fn.includes('scrollIntoView'));
});
test('destination panels are selected synchronously before route is revealed',()=>{
 const {c}=overview();const tabs=[{id:'lifting-tab'},{id:'weight-tab'}].map(b=>({...b,classList:{toggle(_,v){b.active=v}}}));
 const buttons=[{dataset:{view:'training'}},{dataset:{view:'overview'}}];buttons.forEach(b=>b.classList={toggle(_,v){b.active=v}});
 const panels=[{dataset:{view:'training'}},{dataset:{view:'overview'}}];const nav={};const lifting={hidden:true,querySelectorAll:s=>s.includes('tab')?buttons:panels,querySelector:()=>nav};
 const weight={hidden:false};c.document.querySelectorAll=()=>tabs;c.document.getElementById=id=>id==='lifting-progress'?lifting:id==='weight-progress'?weight:null;let mode;
 c.enhanceMuscleOverview=m=>mode=m;assert.equal(c.initializeMuscleOverviewDestination('volume'),nav);assert.equal(mode,'volume');assert.equal(lifting.hidden,false);assert.equal(weight.hidden,true);assert.equal(panels[0].hidden,false);assert.equal(panels[1].hidden,true);
});

