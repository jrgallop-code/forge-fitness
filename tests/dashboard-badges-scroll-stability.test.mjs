import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup({goalsPresent=true}={}) {
 let mutations=0;
 class Node {
   constructor(id=''){this.id=id;this.children=[];this.dataset={};this.style={};this.classList={contains:()=>true,add(){}};this.isConnected=true;}
   get nextElementSibling(){const a=this.parentElement?.children||[];return a[a.indexOf(this)+1]||null;}
   get lastElementChild(){return this.children.at(-1)||null;}
   appendChild(child){this.insertBefore(child,null);}
   insertBefore(child,anchor){if(child.parentElement){const a=child.parentElement.children;a.splice(a.indexOf(child),1);}const i=anchor?this.children.indexOf(anchor):this.children.length;this.children.splice(i,0,child);child.parentElement=this;mutations++;}
   insertAdjacentElement(where,child){assert.equal(where,'afterend');this.parentElement.insertBefore(child,this.nextElementSibling);}
   setAttribute(){}
   set innerHTML(value){this.html=value;mutations++;}get innerHTML(){return this.html||'';}
   contains(child){return this.children.includes(child)||this.children.some(c=>c.contains(child));}
   querySelectorAll(){return [];}
   querySelector(selector){return selector==='#lifting-goals-dashboard'?this.children.find(c=>c.id==='lifting-goals-dashboard')||null:null;}
 }
 const content=new Node('content'),dashboard=new Node('dashboard'),muscles=new Node('muscles'),welcome=new Node(),heading=new Node();
 muscles.dataset.signature=JSON.stringify({recovery:[],volume:[]});
 content.appendChild(dashboard);dashboard.appendChild(new Node('stats'));dashboard.appendChild(muscles);
 let goals=null;if(goalsPresent){goals=new Node('lifting-goals-dashboard');goals.__goalsMarkup='stable';dashboard.appendChild(goals);}
 content.querySelector=s=>s===':scope > .dashboard'?dashboard:s===':scope > .dashboard-welcome'?welcome:s==='[data-dashboard-muscle-snapshot]'?dashboard.children.find(c=>c.id==='muscles'):s==='.dashboard-command-insights-heading'?heading:null;
 const context=vm.createContext({document:{getElementById:id=>id==='content'?content:dashboard.children.find(c=>c.id===id)||null,createElement:()=>new Node()},getRecoveryStates:()=>new Map(),getLastSevenDayVolume:()=>new Map(),dashboardMarkup:()=> 'stable'});
 const files=[['../js/dashboard/dashboard-recovery-card.js','function ensureMuscleSnapshot()','function openMuscleMode'],['../js/dashboard/dashboard-command-center.js','function prepareInsights(','function enhanceDashboard()'],['../js/goals/lifting-goals-ui.js','function renderDashboard()','function queueRender()']];
 for(const [path,start,end] of files){const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),context);}
 const refresh=()=>vm.runInContext('ensureMuscleSnapshot(); prepareInsights(document.getElementById("content"),document.getElementById("content").querySelector(":scope > .dashboard")); renderDashboard();',context);
 return {dashboard,muscles,refresh,reset(){mutations=0;},get mutations(){return mutations;},Node};
}
test('all three dashboard modules settle with muscles followed by goals and produce no repeated layout mutations',()=>{
 const h=setup();h.refresh();h.reset();
 for(let i=0;i<120;i++)h.refresh();
 assert.equal(h.mutations,0);assert.deepEqual(h.dashboard.children.map(n=>n.id),['stats','muscles','lifting-goals-dashboard']);
});
test('late creation of goals settles immediately, without a muscle/goals reorder loop',()=>{
 const h=setup({goalsPresent:false});h.refresh();assert.equal(h.dashboard.lastElementChild.id,'lifting-goals-dashboard');h.reset();
 for(let i=0;i<60;i++)h.refresh();assert.equal(h.mutations,0);
});
test('a displaced muscle card is repaired once, then repeated updates do not move cards',()=>{
 const h=setup();h.dashboard.appendChild(h.muscles);h.reset();h.refresh();assert.equal(h.mutations,1);h.reset();
 for(let i=0;i<60;i++)h.refresh();assert.equal(h.mutations,0);
});
