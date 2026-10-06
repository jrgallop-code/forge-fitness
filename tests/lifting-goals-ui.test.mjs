import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as engine from '../js/goals/lifting-goals-engine.js';
import { badgeArt } from '../js/goals/training-badge-art.js';

function harness() {
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 globalThis.localStorage=storage;
 class Element {
   constructor(){this.attributes={};this.classList={add(){},remove(){}};this.isConnected=true;this.writes=0;this.listeners={};}
   set innerHTML(value){this.html=value;this.writes++;}get innerHTML(){return this.html||'';}
   setAttribute(k,v){this.attributes[k]=v;}focus(){}remove(){this.isConnected=false;}addEventListener(k,v){this.listeners[k]=v;}
   querySelector(){return new Element();}
 }
 const elements=new Map(),welcome=new Element(),anchor=new Element(),content=new Element();
 content.querySelector=s=>s.includes('welcome')?welcome:s.includes('dashboard-muscle-snapshot')?anchor:new Element();
 content.contains=e=>e.isConnected;
 anchor.insertAdjacentElement=(where,e)=>{anchor.nextElementSibling=e;elements.set(e.id,e);};
 const documentListeners={},windowListeners={},frame=[];
 const body=new Element();body.appendChild=e=>elements.set('modal',e);
 const document={body,activeElement:new Element(),getElementById:id=>id==='content'?content:elements.get(id),createElement:()=>new Element(),querySelectorAll:()=>[],addEventListener:(k,v)=>documentListeners[k]=v};
 const context=vm.createContext({...engine,badgeArt,console,Date,localStorage:storage,document,window:{addEventListener:(k,v)=>windowListeners[k]=v},requestAnimationFrame:f=>frame.push(f),MutationObserver:class{constructor(f){this.callback=f;}observe(){}},getAllExercises:()=>[],getEquipmentProfiles:()=>[],supportsEquipmentProfiles:()=>false,UNIT_KINDS:{LIFTING_WEIGHT:'liftingWeight'},formatMass:w=>`${w} lb`,displayMass:w=>w,canonicalMass:w=>Number(w),massUnit:()=> 'lb'});
 const source=fs.readFileSync(new URL('../js/goals/lifting-goals-ui.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
 vm.runInContext(source,context);
 return {context,storage,documentListeners,windowListeners,elements,anchor,frame,flush(){while(frame.length)frame.shift()();}};
}
test('dashboard stays compact, lists multiple goals, and does not continuously rewrite normalized markup',()=>{
 const h=harness();
 h.storage.setItem(engine.GOALS_KEY,JSON.stringify([{id:'one',exerciseId:'bench',name:'Bench Press',targetWeight:100,baselineWeight:50},{id:'two',exerciseId:'curl',name:'Dumbbell Curl',targetWeight:30,baselineWeight:20}]));
 h.flush();const root=h.elements.get('lifting-goals-dashboard');
 assert.match(root.innerHTML,/Bench Press/);assert.match(root.innerHTML,/Dumbbell Curl/);assert.match(root.innerHTML,/data-goal-add/);
 assert.doesNotMatch(root.innerHTML,/100 lb|30 lb|Starting best|Best at target/);
 const writes=root.writes;root.html+=' normalized by browser';vm.runInContext('renderDashboard()',h.context);assert.equal(root.writes,writes);
 assert.equal(h.anchor.nextElementSibling,root);
});
test('dashboard badges open collection, each collection badge opens its own description, and goal opens details',()=>{
 const h=harness();h.flush();
 h.documentListeners.click({target:{closest:()=>({dataset:{dashboardBadge:'first'},hasAttribute:k=>k==='data-dashboard-badge'})}});
 assert.match(h.elements.get('modal').innerHTML,/Your Badges/);assert.match(h.elements.get('modal').innerHTML,/data-badge="ten"/);
 assert.match(h.elements.get('modal').innerHTML,/is-locked/);assert.match(h.elements.get('modal').innerHTML,/View requirements/);
 h.documentListeners.click({target:{closest:()=>({dataset:{badge:'two-weeks'},hasAttribute:()=>false})}});
 assert.match(h.elements.get('modal').innerHTML,/two consecutive Monday/);
 h.storage.setItem(engine.GOALS_KEY,JSON.stringify([{id:'one',exerciseId:'bench',name:'Bench Press',targetWeight:100,baselineWeight:50}]));
 h.documentListeners.click({target:{closest:()=>({dataset:{goalDetail:'one'},hasAttribute:()=>false})}});
 assert.match(h.elements.get('modal').innerHTML,/100 lb/);assert.match(h.elements.get('modal').innerHTML,/Add another goal/);
});
test('completion earns badges, renders notification only once, and resumes cannot duplicate awards',()=>{
 const h=harness();h.storage.setItem('forge_workout_sessions',JSON.stringify([{id:'session-1',date:'2026-10-04',completedAt:'2026-10-04T10:00:00Z',exercises:[{exerciseId:'bench',sets:[{weight:50,reps:12,completed:true}]}]}]));
 h.windowListeners['levelup:workout-completed']({detail:{sessionId:'session-1'}});
 const first=vm.runInContext("renderSessionBadges('session-1')",h.context);assert.match(first,/First Workout/);
 assert.equal(vm.runInContext("renderSessionBadges('session-1')",h.context),'');
 h.windowListeners['levelup:workout-completed']({detail:{sessionId:'session-1'}});
 assert.equal(vm.runInContext("renderSessionBadges('session-1')",h.context),'');
});
test('collection filters expose new requirements and progress uses the correct metric label',()=>{
 const h=harness();h.flush();
 h.documentListeners.click({target:{closest:()=>({dataset:{badgeFilter:'Goals'},hasAttribute:()=>false})}});
 assert.match(h.elements.get('modal').innerHTML,/First Summit/);assert.doesNotMatch(h.elements.get('modal').innerHTML,/data-badge="first"/);
 h.documentListeners.click({target:{closest:()=>({dataset:{badge:'goal-collector'},hasAttribute:()=>false})}});
 assert.match(h.elements.get('modal').innerHTML,/distinct goals reached/);assert.doesNotMatch(h.elements.get('modal').innerHTML,/NaN/);
});
test('reviewing a completed report awards First Chapter and announces it only once',()=>{
 const h=harness();h.flush();h.storage.setItem('level_up_monthly_report_seen_v1',JSON.stringify(['2026-09']));
 h.windowListeners['levelup:monthly-report-reviewed']();
 assert.match(h.elements.get('modal').innerHTML,/Badge earned: First Chapter/);
 const state=JSON.parse(h.storage.getItem(engine.BADGES_KEY));assert.ok(state.earned['first-chapter']);
 assert.deepEqual(engine.reconcileBadges([],{storage:h.storage,notify:true}).newlyEarned,[]);
});

test('nutrition category hides immediately with feature disabled while earned badges persist',()=>{
 const h=harness();h.flush();h.storage.setItem(engine.BADGES_KEY,JSON.stringify({earned:{'first-plate':{earnedAt:'2026-10-01'}}}));
 vm.runInContext('openBadgeCollection()',h.context);assert.match(h.elements.get('modal').innerHTML,/First Plate/);
 h.storage.setItem('level_up_training_preferences',JSON.stringify({nutritionEnabled:false}));
 vm.runInContext('openBadgeCollection()',h.context);assert.doesNotMatch(h.elements.get('modal').innerHTML,/First Plate|data-badge-filter="Nutrition"/);assert.ok(JSON.parse(h.storage.getItem(engine.BADGES_KEY)).earned['first-plate']);
});
