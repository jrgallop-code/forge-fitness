import test from 'node:test';
import assert from 'node:assert/strict';
import {withFoodWeightUnits,convertPortionAmount,directPortionSelection} from '../js/nutrition/food-portion-units.js';
import {countedPortionSummary} from '../js/nutrition/food-counted-portions.js';
const egg={name:'Egg, whole, cooked, hard-boiled',portions:[{label:'1 large (50 g)',grams:50,nutrition:{calories:78,protein:6.3}},{label:'1 medium (44 g)',grams:44,nutrition:{calories:68,protein:5.5}},{label:'1 small (38 g)',grams:38,nutrition:{calories:59,protein:4.8}},{label:'100 g',grams:100,nutrition:{calories:155,protein:12.6}}]};
test('source egg sizes show the actual count and edible weight',()=>{
 const food=withFoodWeightUnits(egg);
 assert.equal(countedPortionSummary(food,food.portions[0],1),'1 large egg · 50 g');
 assert.equal(countedPortionSummary(food,food.portions[0],2),'2 large eggs · 100 g');
 assert.equal(countedPortionSummary(food,food.portions[1],2),'2 medium eggs · 88 g');
 assert.equal(food.portions[2].countSize,'small');
 assert.equal(food.portions[0].nutrition.calories*2,156);
});
test('mass entry can show an approximate egg count using a measured source serving',()=>{
 const food=withFoodWeightUnits(egg),g=food.portions.find(p=>p.inputUnit==='g');
 assert.equal(countedPortionSummary(food,g,100),'≈ 2 large eggs · 100 g');
 assert.equal(convertPortionAmount(100,g,food.portions[0]),2);
 assert.equal(convertPortionAmount(2,food.portions[0],g),100);
});
test('changing egg size retains number of eggs, not weight',()=>{
 const food=withFoodWeightUnits(egg);
 assert.equal(convertPortionAmount(2,food.portions[0],food.portions[1]),2);
});
test('plain whole egg 100g-only records get an explicitly estimated count option',()=>{
 const food=withFoodWeightUnits({name:'Boiled egg',portions:[{label:'100 g',grams:100,nutrition:{calories:155}}]});
 const count=food.portions.find(p=>p.countUnit==='egg');
 assert.equal(count.grams,50);assert.equal(count.nutrition.calories,77.5);assert.equal(count.estimatedCount,true);
 assert.equal(countedPortionSummary(food,count,2),'2 large eggs · 100 g · estimated');
 const initial=directPortionSelection(food);assert.equal(initial.quantity,2);assert.equal(food.portions[initial.index],count);
 assert.equal(withFoodWeightUnits(food).portions.length,food.portions.length);
});
test('egg whites, yolks, recipes and fried mass-only foods get no invented whole-egg weight',()=>{
 for(const name of ['Egg whites','Egg yolk','Egg salad','Egg substitute','Fried egg','Scrambled eggs']){
  const food=withFoodWeightUnits({name,portions:[{label:'100 g',grams:100,nutrition:{calories:150}}]});
  assert.equal(food.portions.some(p=>p.countUnit==='egg'),false,name);
 }
});
test('multi-item source portions and bread slices preserve explicit item counts',()=>{
 const food=withFoodWeightUnits({name:'Bread',portions:[{label:'2 slices (70 g)',grams:70,nutrition:{calories:180}}]});
 const selected=directPortionSelection(food);assert.equal(selected.quantity,2);
 assert.equal(countedPortionSummary(food,food.portions[selected.index],2),'2 slices · 70 g');
 assert.equal(food.portions[selected.index].nutrition.calories,90);
});

test('egg size switches clear the amount and show the per-portion weight',async()=>{
 const {bindFoodAmountEditor}=await import('../js/nutrition/food-portion-editor.js');
 const food=withFoodWeightUnits(egg),map=new Map();
 const node=(value='')=>({value,textContent:'',hidden:true,disabled:false,handlers:{},dataset:{},setAttribute(){},addEventListener(k,fn){this.handlers[k]=fn;}});
 map.set('[data-food-serving]',node('0'));map.set('[data-food-quantity]',node('2'));
 for(const selector of ['[data-food-equivalent]','[data-food-live-calories]'])map.set(selector,node());
 const root={querySelector:s=>map.get(s),querySelectorAll:()=>[]};bindFoodAmountEditor(root,food);
 const select=map.get('[data-food-serving]'),input=map.get('[data-food-quantity]');
 const change=index=>{select.value=String(index);select.handlers.change();};
 change(1);assert.equal(input.value,'');assert.match(map.get('[data-food-equivalent]').textContent,/Weight: 44 g per medium egg/);assert.equal(map.get('[data-food-live-calories]').textContent,'68');
 input.value='2';input.handlers.input();assert.match(map.get('[data-food-equivalent]').textContent,/2 medium eggs · 88 g/);assert.equal(map.get('[data-food-live-calories]').textContent,'136');
 const g=food.portions.findIndex(p=>p.inputUnit==='g');
 change(g);assert.equal(input.value,'');assert.match(map.get('[data-food-equivalent]').textContent,/Weight: 1 g per g/);
});

test('source egg-white portions never display as whole eggs',()=>{
 const food=withFoodWeightUnits({name:'Egg whites',portions:[{label:'1 large egg white (33 g)',grams:33,nutrition:{calories:17}}]});
 assert.equal(countedPortionSummary(food,food.portions[0],2),'2 large egg whites · 66 g');
 assert.equal(food.portions.some(p=>p.countUnit==='egg'),false);
});
