import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('tests/fixtures/fitnessvolt-model-tables.html');
function context(gym=null,enabled=true){
 const store=new Map(),requests=[];
 const c=vm.createContext({FITNESSVOLT_MODEL_EXERCISES:JSON.parse(read('js/core/strength-model-catalog.js').match(/= (\[.*\]);/s)[1]),
  strengthComparisonsEnabled:()=>enabled,getGymComparison:async()=>gym,
  localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
  Capacitor:{Plugins:{CapacitorHttp:{get:async options=>{requests.push(options);return {status:200,data:'<link rel="canonical" href="https://fitnessvolt.com/strength-standards/dumbbell-bench-press/">'+html};}}}},
  URL,AbortController,setTimeout,clearTimeout});
 vm.runInContext(read('js/core/strength-model-standards.js').replace(/^import .*;\n/gm,'').replace(/export /g,''),c);
 return {c,requests};
}
test('real public table structure parses independent male/female model thresholds',()=>{
 const {c}=context(),tables=c.parseModelTables(html);assert.ok(tables.male.length>10);assert.ok(tables.female.length>10);
 assert.equal(c.evaluateModel(tables,{estimatedOneRepMax:94},{sex:'male',weightLb:180}).tier,'Intermediate');
 assert.equal(c.evaluateModel(tables,{estimatedOneRepMax:55},{sex:'female',weightLb:180}).tier,'Intermediate');
});
test('malformed tables, wrong units and unordered thresholds never generate a grade',()=>{
 const {c}=context();assert.equal(c.parseModelTables('<p>Error</p>'),null);assert.equal(c.parseModelTables(html.replace('BW (lbs)','BW (kg)')),null);
 assert.equal(c.parseModelTables(html.replace('<td>18</td>','<td>9999</td>')),null);
});
test('dumbbell and Smith variants connect to their own tables, not barbell percentiles',()=>{
 const {c}=context();assert.equal(c.modelExercise({name:'Dumbbell Bench Press'}),'dumbbell-bench-press');
 assert.equal(c.modelExercise({name:'Bench Press',equipment:'Dumbbells'}),'dumbbell-bench-press');
 assert.equal(c.modelExercise({name:'Smith Machine Incline Bench Press'}),'smith-incline-bench-press');
 assert.equal(c.modelExercise({name:'Unknown custom movement'}),null);
});
test('model grade and next threshold exist even with no population percentile',async()=>{
 const {c,requests}=context();const rating=await c.getStrengthComparison({name:'Dumbbell Bench Press',estimatedOneRepMax:94,reps:7},{sex:'male',weightLb:180});
 assert.equal(rating.tier,'Intermediate');assert.equal(rating.nextTier,'Advanced');assert.equal(rating.nextWeight,130);assert.equal(rating.percentile,null);
 assert.equal(requests.length,1);assert.equal(requests[0].url,'https://fitnessvolt.com/strength-standards/dumbbell-bench-press/');
 assert.ok(!JSON.stringify(requests).includes('bodyweight'));assert.ok(!JSON.stringify(requests).includes('e1rm'));
});
test('model and percentile remain separate when both are available',async()=>{
 const {c}=context({tier:'Novice',percentile:34,sampleSize:100,tierIndex:1});
 const rating=await c.getStrengthComparison({name:'Dumbbell Bench Press',estimatedOneRepMax:94,reps:7},{sex:'male',weightLb:180});
 assert.equal(rating.tier,'Intermediate');assert.equal(rating.percentile,34);
});
test('opt-out suppresses both model downloads and output',async()=>{
 const {c,requests}=context(null,false);assert.equal(await c.getStrengthComparison({name:'Dumbbell Bench Press'},{sex:'male',weightLb:180}),null);assert.equal(requests.length,0);
});
