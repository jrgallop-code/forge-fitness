import test from 'node:test';
import assert from 'node:assert/strict';
import { exerciseContext, eligibleStrengthSet, matchesStrengthContext } from '../js/workouts/strength-context.js';
import { calculatePrCounts } from '../js/workouts/workout-pr-badges.js';
const exercise = (weight, extra={}) => ({exerciseId:'dumbbell-curl', sets:[{weight,reps:10,completed:true}], ...extra});
const session = (id, e, group=null) => ({id,date:`2026-10-${id}`,completedAt:`2026-10-${id}T12:00:00Z`,exercises:[e],planSnapshot:{days:[{exercises:[{id:'dumbbell-curl',supersetGroup:group}]}]}});
test('legacy context comes from saved snapshot and snapshot stays authoritative',()=>{
 const e=exercise(20), s=session('10',e,'A');
 assert.equal(exerciseContext(s,e),'superset');
 e.supersetGroup=null;
 assert.equal(exerciseContext(s,e),'superset');
 assert.equal(exerciseContext({},e),'standalone');
 assert.equal(matchesStrengthContext(s,e,'all'),true);
});
test('exclusions preserve recorded sets while making them ineligible for strength',()=>{
 const set={weight:25,reps:10,completed:true,excludeFromStrength:true};
 assert.equal(eligibleStrengthSet(set),false);
 assert.equal(set.weight*set.reps,250);
 assert.equal(eligibleStrengthSet({...set,excludeFromStrength:false}),true);
 assert.equal(eligibleStrengthSet({isWarmup:true}),false);
 assert.equal(eligibleStrengthSet({completed:false}),false);
});
test('superset records cannot beat standalone records and exclusions cannot earn PRs',()=>{
 const a=session('10',exercise(20));
 const b=session('11',exercise(30),'A');
 const c=session('12',exercise(22));
 const d=session('13',exercise(35),'A');
 const e=session('14',{...exercise(50),sets:[{weight:50,reps:10,completed:true,excludeFromStrength:true}]});
 const counts=calculatePrCounts([a,b,c,d,e]);
 assert.equal(counts.get('11'),0);
 assert.equal(counts.get('12'),1);
 assert.equal(counts.get('13'),1);
 assert.equal(counts.get('14'),0);
});

test('chart keeps excluded and superset work in volume but separates strength records', async()=>{
 const {getExerciseRecords}=await import('../js/progress/exercise-progress-v2.js');
 const a=session('10',exercise(20));
 const b=session('11',exercise(30),'A');
 const c=session('12',exercise(50)); c.exercises[0].sets[0].excludeFromStrength=true;
 globalThis.localStorage={getItem:key=>key==='forge_workout_sessions'?JSON.stringify([a,b,c]):null};
 const volume=getExerciseRecords('dumbbell-curl',{metric:'volume'});
 assert.equal(volume.length,3);
 assert.equal(volume[2].completedSets,1);
 assert.equal(getExerciseRecords('dumbbell-curl',{metric:'strength',context:'standalone'}).length,1);
 const supersets=getExerciseRecords('dumbbell-curl',{metric:'strength',context:'superset'});
 assert.equal(supersets.length,1); assert.equal(supersets[0].bestSet.weight,30);
 assert.equal(getExerciseRecords('dumbbell-curl',{metric:'strength',context:'all'}).length,2);
});

test('context controls stay absent until this exercise has recorded superset work',async()=>{
 const {updateStrengthContextControls}=await import('../js/progress/exercise-progress-v2.js');
 let removed=0, inserted=0;
 globalThis.document={getElementById:()=>({remove(){removed++;}})};
 globalThis.localStorage={getItem:()=>JSON.stringify([session('10',exercise(20))])};
 updateStrengthContextControls('dumbbell-curl',{before(){inserted++;}},'strength');
 assert.equal(removed,1); assert.equal(inserted,0);
 // An unrelated exercise's superset must not add tabs to this exercise.
 globalThis.localStorage={getItem:()=>JSON.stringify([session('10',{...exercise(20),exerciseId:'other'},'A')])};
 updateStrengthContextControls('dumbbell-curl',{before(){inserted++;}},'strength');
 assert.equal(inserted,0);
});


test('recorded supersets reveal three compact context tabs on strength views',async()=>{
 const {updateStrengthContextControls}=await import('../js/progress/exercise-progress-v2.js');
 const nodes=[];
 const element=()=>({children:[],dataset:{},setAttribute(){},addEventListener(){},appendChild(node){this.children.push(node);},querySelectorAll(){return this.children.filter(node=>node.dataset.context);}});
 globalThis.document={getElementById:()=>null,createElement:element};
 globalThis.localStorage={getItem:()=>JSON.stringify([session('10',exercise(20),'A')])};
 updateStrengthContextControls('dumbbell-curl',{before(node){nodes.push(node);}},'strength');
 assert.equal(nodes.length,1);
 assert.deepEqual(nodes[0].children.filter(node=>node.dataset.context).map(node=>node.textContent),['Standalone','Superset','All']);
});
