import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function harness(){
 const source=readFileSync(new URL('../js/workouts/circuit-library.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export \{.*;\n/gm,'').replace(/export function/g,'function');
 const handlers={};let started;
 const screen={querySelector:selector=>selector==='[data-circuit-template-rest]'?{value:'45'}:{addEventListener:(type,fn)=>{handlers[selector]=fn}},remove(){},scrollIntoView(){}};
 const page={querySelector:()=>null,classList:{add(){},remove(){}},appendChild(){}};
 const context={JSON,Number,String,Set,circuitTemplates:[],ensureCircuitStyles(){},readCircuitSessions:()=>[],circuitRoundsCompleted:()=>0,CIRCUIT_PROGRESS_NOTE:'Separate circuit history',getExerciseById:id=>({name:id}),openWorkoutLogger:plan=>{started=plan},document:{createElement:()=>screen}};
 vm.createContext(context);vm.runInContext(source,context);
 return {context,screen,handlers,landing:{closest:()=>page},started:()=>started};
}
const fixture=()=>({id:'level-up-circuit-import-123',name:'Dumbbell routine',trainingContext:'circuit',rounds:3,circuitRestSeconds:45,days:[{exercises:[{id:'goblet-squat',sets:3,reps:''},{id:'plank',sets:3,reps:'30 sec'}]}]});
test('saved circuit rows belong to My Routines and never route as catalogue templates',()=>{
 const h=harness();const html=h.context.renderCircuitLibraryRow({...fixture(),isSavedPlan:true});
 assert.match(html,/is-saved/);assert.match(html,/data-workout-live-saved-plan=/);
 assert.doesNotMatch(html,/data-workout-live-catalogue-plan|undefined/);
 const builtin=h.context.renderCircuitLibraryRow(fixture());assert.match(builtin,/data-workout-live-catalogue-plan=/);
});
test('an imported circuit opens the shared overview and starts its saved round plan',()=>{
 const h=harness();const plan=fixture();assert.equal(h.context.openCircuitTemplate(plan.id,h.landing,plan),true);
 assert.match(h.screen.innerHTML,/My Routines/);assert.match(h.screen.innerHTML,/One round/);
 assert.match(h.screen.innerHTML,/goblet-squat/);assert.match(h.screen.innerHTML,/Reps optional/);
 assert.match(h.screen.innerHTML,/30 sec/);assert.doesNotMatch(h.screen.innerHTML,/undefined|30 sec reps/);
 assert.match(h.screen.innerHTML,/<option value="45" selected/);
 h.handlers['[data-start-circuit]']();
 assert.equal(h.started().id,plan.id);assert.equal(h.started().rounds,3);
 assert.equal(h.started().trainingContext,'circuit');assert.equal(h.started().circuitRestSeconds,45);
});
