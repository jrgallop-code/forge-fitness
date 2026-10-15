import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('js/nutrition/food-log.js','utf8');
const handler=source.slice(source.indexOf('function closeFoodPortionPanel()'),source.indexOf('function renderFoodPortionPanel('));
for(const context of ['edit','log','meal-builder'])test(`food detail exit returns correctly from ${context}`,()=>{
 let sheetClosed=0,aborted=0,hidden=0,builder=0;
 const sandbox={addContext:context,foodSelectionRequest:0,foodDetailController:{abort(){aborted++;}},document:{querySelector(){return {setAttribute(){hidden++;}};}},closeFoodSheet(){sheetClosed++;},mealDraft:{items:[]},editingMealItemIndex:2,renderMealBuilder(){builder++;}};
 vm.createContext(sandbox);vm.runInContext(handler+';closeFoodPortionPanel();',sandbox);
 assert.equal(sheetClosed,context==='edit'?1:0);
 assert.equal(hidden,context==='edit'?0:1);
 assert.equal(aborted,context==='edit'?0:1);
 assert.equal(builder,context==='meal-builder'?1:0);
 if(context==='meal-builder')assert.equal(sandbox.editingMealItemIndex,null);
});
