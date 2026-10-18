import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {withFoodWeightUnits} from '../js/nutrition/food-portion-units.js';
import {DEMO_FOODS} from '../js/more/nutrition-tutorial-demo.js';
import {nutritionPracticeSeed} from '../js/more/nutrition-tutorial-demo.js';
import {NUTRITION_WALKTHROUGH_STEPS as steps} from '../js/more/nutrition-walkthrough-steps.js';
const bootstrap=readFileSync(new URL('../js/more/nutrition-practice-bootstrap.js',import.meta.url),'utf8');
function realm(practice=true){
 const persistent=new Map([['forge_weight_entries','real history'],['level_up_cloud_session','secret']]);
 let requests=0,beacons=0;
 const navigator={sendBeacon:()=>{beacons++;}};
 const window={parent:practice?{}:null,name:practice?'level-up-nutrition-practice:'+JSON.stringify(nutritionPracticeSeed({level_up_cloud_session:'MUST NOT COPY'},new Date(2026,9,18,12))):'',localStorage:{getItem:k=>persistent.get(k),setItem:(k,v)=>persistent.set(k,v)},fetch:async()=>{requests++;return 'asset';},stop(){}};
 if(!practice)window.parent=window;
 const context=vm.createContext({window,navigator,location:{search:practice?'?nutrition-practice=1':'',href:'https://app.example/index.html?nutrition-practice=1',origin:'https://app.example'},URL,URLSearchParams,Response,Map,Object,JSON,document:{}});
 return {window,persistent,navigator,context,requests:()=>requests,beacons:()=>beacons};
}
test('normal app startup never replaces real storage',()=>{const r=realm(false),original=r.window.localStorage;vm.runInContext(bootstrap,r.context);assert.equal(r.window.localStorage,original);assert.equal(r.window.localStorage.getItem('level_up_cloud_session'),'secret');});
test('practice saves, clears and resets only memory, with no cloud credentials',()=>{
 const r=realm();vm.runInContext(bootstrap,r.context);const s=r.window.localStorage;
 assert.equal(JSON.parse(s.getItem('forge_weight_entries')).length,56);assert.equal(s.getItem('level_up_cloud_session'),null);
 s.setItem('forge_weight_entries','practice edit');s.removeItem('level_up_food_log_v1');
 assert.equal(r.persistent.get('forge_weight_entries'),'real history');assert.equal(r.persistent.get('level_up_cloud_session'),'secret');
 s.clear();assert.equal(s.length,0);assert.equal(r.persistent.size,2);assert.equal(r.window.name,'');assert.equal(r.window.indexedDB,undefined);
});
test('practice blocks network writes and telemetry but allows app assets',async()=>{
 const r=realm();vm.runInContext(bootstrap,r.context);
 assert.equal(await r.window.fetch('assets/example.webp'),'asset');
 for(const [url,options] of [['https://api.example/v1/backup',{method:'POST'}],['https://app.example/v1/sync',{}],['https://app.example/backup',{method:'POST'}]])assert.equal((await r.window.fetch(url,options)).status,503);
 r.navigator.sendBeacon('https://api.example/events','example');assert.equal(r.requests(),1);assert.equal(r.beacons(),0);
});
test('walkthrough includes real food, goal, weight, trend and rate controls',()=>{
 assert.equal(new Set(steps.map(s=>s.id)).size,steps.length);
 for(const s of steps){assert.ok(s.title&&s.body&&s.target);assert.ok(['energy','progress'].includes(s.route));}
 for(const id of ['goals','goal-weight','search','grams','macros','nutrients','weight','trend','rate','progress'])assert.ok(steps.some(s=>s.id===id));
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.indexOf('nutrition-practice-bootstrap')<index.indexOf('localStorage.getItem'));
 const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');assert.match(app,/!window.__levelUpNutritionPractice && "serviceWorker"/);
});

test('practice foods normalize to one chip for each direct weight unit',()=>{
 for(const food of DEMO_FOODS){const normalized=withFoodWeightUnits(food);for(const unit of ['g','oz','lb'])assert.equal(normalized.portions.filter(p=>p.inputUnit===unit).length,1);}
});
