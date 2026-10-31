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

for(const mode of ['recovery','volume'])test(`${mode} destination is requested before one synchronous navigation`,()=>{
 const source=read('js/dashboard/dashboard-recovery-card.js');const start=source.indexOf('function openMuscleMode(');const fn=source.slice(start,source.indexOf('\nfunction queueEnsureMuscleSnapshot',start));
 let navigations=0;const window={};
 const context={window,document:{querySelector:()=>({click(){navigations++;assert.equal(window.__levelUpProgressMuscleMode,mode);}})}};
 vm.createContext(context);vm.runInContext(fn,context);context.openMuscleMode(mode);
 assert.equal(navigations,1);assert.doesNotMatch(fn,/requestAnimationFrame|scrollIntoView/);
});
