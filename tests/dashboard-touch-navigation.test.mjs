import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('real taps get one haptic while synthetic navigation is silent across duplicate module bindings',()=>{
 const source=read('js/core/native-capabilities.js');const start=source.indexOf('function bindNativeTouchFeedback()');const fn=source.slice(start,source.indexOf('\nif (typeof document',start));
 const listeners=[];const impacts=[];const control={disabled:false,matches:()=>false};
 const context={isNative:()=>true,window:{addEventListener(){}},document:{addEventListener:(name,fn)=>{if(name==='click')listeners.push(fn);}},plugin:()=>null,syncNativeRestTimerState(){},hapticImpact:style=>impacts.push(style)};
 vm.createContext(context);vm.runInContext(fn,context);context.bindNativeTouchFeedback();vm.runInContext(fn,context);context.bindNativeTouchFeedback();assert.equal(listeners.length,1);
 for(const isTrusted of [true,false,false,false,false])listeners[0]({isTrusted,target:{closest:()=>control}});
 assert.deepEqual(impacts,['LIGHT']);control.disabled=true;listeners[0]({isTrusted:true,target:{closest:()=>control}});assert.equal(impacts.length,1);
});

for(const mode of ['recovery','volume'])test(`${mode} readiness retries activate each destination tab once`,()=>{
 const source=read('js/dashboard/dashboard-recovery-card.js');const start=source.indexOf('function openMuscleMode(');const fn=source.slice(start,source.indexOf('\nfunction queueEnsureMuscleSnapshot',start));
 let lifting=0,training=0,selected=0,frames=0;const queue=[];
 const tab=counter=>({classList:{contains:()=>false},click:counter});
 const context={document:{getElementById:()=>tab(()=>lifting++),querySelector:selector=>selector.startsWith('.nav-btn')?{click(){}}:selector.startsWith('.training-progress-tab')?tab(()=>training++):selector.startsWith('[data-muscle-overview-mode=')&&frames>=5?{click:()=>selected++}:null},requestAnimationFrame:fn=>queue.push(fn)};
 vm.createContext(context);vm.runInContext(fn,context);context.openMuscleMode(mode);while(queue.length){frames++;queue.shift()();}
 assert.equal(lifting,1);assert.equal(training,1);assert.equal(selected,1);
});
