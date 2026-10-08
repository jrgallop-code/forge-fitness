import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('circuit completion cannot schedule the previous strength summary',()=>{
 const source=readFileSync(new URL('../js/dashboard/workout-performance.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('export function initializeWorkoutPerformance'),source.indexOf('\nfunction showCompletedSummary')).replace('export ','');
 let click,scheduled=0;
 const context={completionHandlerBound:false,bindToggles(){},document:{addEventListener:(type,handler)=>click=handler},setTimeout:()=>scheduled++};
 vm.createContext(context);vm.runInContext(fn+'\ninitializeWorkoutPerformance();',context);
 const event=kind=>({target:{closest:()=>({closest:()=>({dataset:{trainingContext:kind}})})}});
 click(event('circuit'));assert.equal(scheduled,0);
 click(event('lifting'));assert.equal(scheduled,1);
});
