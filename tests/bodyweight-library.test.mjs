import test from 'node:test';
import assert from 'node:assert/strict';
import {isBodyweightPlan} from '../js/workouts/workout-equipment-filter.js';
import {bodyweightWorkoutPlans} from '../js/workouts/bodyweight-workout-plans.js';
import {getExerciseById} from '../js/workouts/exercise-library.js?v=exercise-library-catalogue-2';
globalThis.localStorage={getItem:()=>null};
const plan=ids=>({days:[{exercises:ids.map(id=>({id}))}]});
test('mixed gym routines are not bodyweight even if they contain pushups',()=>assert.equal(isBodyweightPlan(plan(['push-up','dumbbell-curl']),getExerciseById),false));
test('weighted bodyweight does not qualify for the bodyweight-only filter',()=>assert.equal(isBodyweightPlan(plan(['weighted']),()=>({equipment:'Weighted Bodyweight'})),false));
test('unresolved exercise IDs and empty plans fail closed',()=>{assert.equal(isBodyweightPlan(plan(['missing']),getExerciseById),false);assert.equal(isBodyweightPlan(plan([]),getExerciseById),false);});
test('all new templates contain only real bodyweight exercises and no more than four sets',()=>{for(const p of bodyweightWorkoutPlans){assert.equal(isBodyweightPlan(p,getExerciseById),true,p.id);assert.equal(p.days.length,p.daysPerWeek);for(const day of p.days)for(const e of day.exercises){assert.ok(e.sets>=2&&e.sets<=4);assert.equal(getExerciseById(e.id).trackingType,'reps');}}});
test('no-equipment template avoids movements requiring bars or gym apparatus',()=>{const allowed=new Set(['push-up','pike-push-up','bodyweight-squat','glute-bridge','single-leg-calf-raise','bird-dog','dead-bug']);for(const day of bodyweightWorkoutPlans[0].days)for(const e of day.exercises)assert.ok(allowed.has(e.id));});
const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
test('recommendation fallback and actual filter never include non-bodyweight programs',()=>{
 const gym={id:'gym',trainingType:'Hypertrophy',daysPerWeek:4,level:'Beginner',days:[{exercises:[{id:'dumbbell-curl'},{id:'push-up'}]}]};
 const sandbox={presetPlans:[gym,...bodyweightWorkoutPlans],celebrityWorkoutPlans:[],bodybuilderWorkoutPlans:[],celebrityExpansionPlans:[],circuitTemplates:[],isBodyweightPlan,getAllExercises:()=>['push-up','pull-up','chin-up','bodyweight-squat','pike-push-up','glute-bridge','bird-dog','dead-bug','single-leg-calf-raise','dumbbell-curl'].map(getExerciseById),console};vm.createContext(sandbox);
 const source=readFileSync(new URL('../js/workouts/workout-landing-live.js',import.meta.url),'utf8').replace(/^import\s[\s\S]*?;\n/gm,'').replace(/^export /gm,'');vm.runInContext(source+'\nglobalThis.api={filteredPlans,selectRecommended};',sandbox);
 const filters={goal:'Hypertrophy',days:4,level:'Any level',equipment:'Bodyweight'};const matches=sandbox.api.filteredPlans(filters);assert.equal(matches.length,1);const recommended=sandbox.api.selectRecommended(matches,filters,5);assert.equal(recommended.length,3);assert.ok(recommended.every(p=>isBodyweightPlan(p,getExerciseById)));
});
