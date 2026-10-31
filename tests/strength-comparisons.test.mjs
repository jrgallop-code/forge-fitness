import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../js/core/strength-comparisons.js', import.meta.url),'utf8');
function harness(enabled=false) {
 const storage = new Map(enabled?[['level_up_strength_comparisons','true']]:[]), events=[];
 const context = vm.createContext({localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  window:{dispatchEvent:e=>events.push(e)},CustomEvent:class {constructor(type){this.type=type}},
  AbortController,setTimeout,clearTimeout,fetch:()=>{throw Error('Unexpected network request')}});
 vm.runInContext(source.replace(/export /g,''),context);
 return {context,storage,events};
}
const item={name:'Barbell Bench Press',estimatedOneRepMax:185,reps:7};
const profile={sex:'male',weightLb:165,age:37};
const response={success:true,gym:{tier:'Novice',percentile:34,sample_size:100},verified:{tier:'Beginner',percentile:11,sample_size:100}};
test('comparisons default off; personal data is not queried until opted in',async()=>{
 const {context:c}=harness();assert.equal(c.strengthComparisonsEnabled(),false);
 assert.equal(await c.getGymComparison(item,profile),null);
});
test('toggle persists and announces changes',()=>{
 const {context:c,events}=harness();c.setStrengthComparisonsEnabled(true);assert.equal(c.strengthComparisonsEnabled(),true);
 c.setStrengthComparisonsEnabled(false);assert.equal(c.strengthComparisonsEnabled(),false);assert.equal(events.length,2);
});
test('only exact supported exercises map; dumbbell, machine and assisted variants are excluded',()=>{
 const {context:c}=harness();assert.equal(c.comparisonLift('Barbell Bench Press'),'bench-press');
 for(const name of ['Dumbbell Bench Press','Smith Machine Bench Press','Assisted Pull-Up','Incline Bench Press','Hip Thrust'])assert.equal(c.comparisonLift(name),null);
});
test('canonical pounds are sent for both bodyweight unit preferences; no names or logs sent',()=>{
 const {context:c}=harness();const input=c.comparisonInput(item,profile);assert.equal(input.weight,185);assert.equal(input.bodyweight,165);assert.equal(input.reps,1);
 const metric=c.comparisonInput(item,{sex:'female',weightKg:60});assert.ok(Math.abs(metric.bodyweight-132.277)<.01);assert.equal(metric.sex,'female');
 assert.deepEqual(Object.keys(input).sort(),['age','bodyweight','lift','reps','sex','unit','weight']);
});
test('missing profile, unsupported set and higher rep estimates have no comparison',()=>{
 const {context:c}=harness();for(const p of [{},{sex:'male'},{sex:'unknown',weightLb:165}])assert.equal(c.comparisonInput(item,p),null);
 assert.equal(c.comparisonInput({...item,reps:20},profile),null);
});
test('gym rating is parsed independently from competition; no fallback to headline tier',()=>{
 const {context:c}=harness();assert.equal(c.parseGymComparison(response).tier,'Novice');
 assert.equal(c.parseGymComparison({...response,gym:null}),null);
 assert.equal(c.parseGymComparison({...response,gym:{...response.gym,sample_size:10}}),null);
 assert.equal(c.parseGymComparison({...response,gym:{...response.gym,tier:'invented'}}),null);
});
test('network failures omit ratings without interrupting completion',async()=>{
 const {context:c}=harness(true);c.fetch=async()=>{throw Error('offline')};assert.equal(await c.getGymComparison(item,profile),null);
});
test('successful requests deduplicate; disabling while loading discards the result',async()=>{
 const {context:c}=harness(true);let finish,calls=0;c.fetch=()=>{calls++;return new Promise(resolve=>finish=resolve)};
 const a=c.getGymComparison(item,profile),b=c.getGymComparison(item,profile);assert.equal(calls,1);
 c.setStrengthComparisonsEnabled(false);finish({ok:true,json:async()=>response});assert.equal(await a,null);assert.equal(await b,null);
});
test('completion display and image export both respect the preference; cards have no percentile graph',()=>{
 const recap=fs.readFileSync(new URL('../js/workouts/workout-complete-recap.js',import.meta.url),'utf8');
 assert.ok(recap.includes('data-recap-strength="${index}" hidden'));
 assert.ok(recap.includes('strengthComparisonsEnabled()?data.strengthRatings?.[i]:null'));
 assert.ok(recap.includes('await payload.strengthReady'));
 assert.ok(recap.includes('Gym ratings · Powered by FitnessVolt'));
 assert.ok(recap.includes('STRENGTH_COMPARISONS_EVENT, refresh'));
});
