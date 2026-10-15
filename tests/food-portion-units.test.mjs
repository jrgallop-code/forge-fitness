import test from 'node:test';
import assert from 'node:assert/strict';
import {withFoodWeightUnits,convertPortionAmount,directPortionSelection,validFoodAmount} from '../js/nutrition/food-portion-units.js';
import {foodPhotoIndex} from '../js/nutrition/food-photo.js';
import {createLogEntry} from '../js/nutrition/food-log-data-core.js';
const original={name:'Grilled chicken breast',portions:[{label:'100 g',nutrition:{calories:165,protein:31,carbs:0,fat:3.6}}]};
test('a 100g-only result supports direct grams and exact mass conversions without changing source data',()=>{
 const food=withFoodWeightUnits(original), g=food.portions.find(p=>p.inputUnit==='g'),oz=food.portions.find(p=>p.inputUnit==='oz'),lb=food.portions.find(p=>p.inputUnit==='lb');
 assert.equal(original.portions.length,1);
 assert.equal(g.nutrition.calories,1.6500000000000001);
 const selected=directPortionSelection(food);assert.equal(selected.quantity,100);assert.equal(food.portions[selected.index],g);
 for(const target of [oz,lb]) {
  const amount=convertPortionAmount(175,g,target);
  assert.ok(Math.abs(amount*target.nutrition.calories-288.75)<1e-8);
  assert.ok(Math.abs(convertPortionAmount(amount,target,g)-175)<1e-8);
 }
 const entry=createLogEntry({meal:'Dinner',food,portion:g,quantity:175});
 assert.equal(entry.servingLabel,'1 g');assert.equal(entry.quantity,175);assert.ok(Math.abs(entry.nutrition.calories-288.75)<1e-8);
 const reopened=withFoodWeightUnits(entry.food);assert.equal(reopened.portions.length,food.portions.length);
});
test('measured serving weights preserve the original portion and provide mass units',()=>{
 const food=withFoodWeightUnits({portions:[{label:'1 burger (170 g)',nutrition:{calories:290}}]});
 const g=food.portions.find(p=>p.inputUnit==='g');assert.equal(convertPortionAmount(1,food.portions[0],g),170);
});
test('unknown serving weights never invent gram or volume conversions',()=>{
 const food=withFoodWeightUnits({portions:[{label:'1 slice',nutrition:{calories:100}}]});
 assert.equal(food.portions.length,1);assert.equal(convertPortionAmount(1,food.portions[0],{grams:1}),null);
});
test('volume-only foods retain mL while avoiding invented mass or density',()=>{
 const food=withFoodWeightUnits({portions:[{label:'250 mL',nutrition:{calories:125}}]});
 assert.equal(food.portions.some(p=>p.inputUnit==='g'),false);
 const ml=food.portions.find(p=>p.inputUnit==='mL');assert.equal(convertPortionAmount(1,food.portions[0],ml),250);assert.equal(ml.nutrition.calories,.5);
});
test('empty, zero, negative and nonfinite quantities cannot be saved',()=>{
 for(const amount of ['',0,-1,'NaN',Infinity,10001])assert.equal(validFoodAmount(amount),false);
 for(const amount of ['.5',175,'1.75'])assert.equal(validFoodAmount(amount),true);
});
test('category photos match specific food names before a broad category',()=>{
 assert.equal(foodPhotoIndex({name:'Chicken burger'}),9);
 assert.equal(foodPhotoIndex({name:'Grilled chicken breast'}),0);
 assert.equal(foodPhotoIndex({name:'Unknown food'}),null);
});

test('the bound editor clears changed units and blocks blank saves', async()=>{
 const {bindFoodAmountEditor}=await import('../js/nutrition/food-portion-editor.js');
 const food=withFoodWeightUnits(original);
 const controls=new Map();
 const node=(value='')=>({value,textContent:'',hidden:true,disabled:false,handlers:{},dataset:{},setAttribute(key,value){this[key]=value;},addEventListener(key,fn){this.handlers[key]=fn;}});
 const g=food.portions.findIndex(p=>p.inputUnit==='g'),oz=food.portions.findIndex(p=>p.inputUnit==='oz');
 controls.set('[data-food-serving]',node(String(g)));controls.set('[data-food-quantity]',node('175'));
 for(const key of ['calories','protein','carbs','fat'])controls.set(`[data-food-live-${key}]`,node());
 for(const key of ['equivalent','amount-error','confirm'])controls.set(`[data-food-${key}]`,node());
 const chip=node();chip.dataset.foodUnit=String(oz);
 const root={querySelector:s=>controls.get(s),querySelectorAll:()=>[chip]};
 bindFoodAmountEditor(root,food);
 assert.equal(controls.get('[data-food-live-calories]').textContent,'289');
 chip.handlers.click();assert.equal(controls.get('[data-food-live-calories]').textContent,String(Math.round(food.portions[oz].nutrition.calories)));
 assert.equal(controls.get('[data-food-quantity]').value,'');
 assert.equal(controls.get('[data-food-live-protein]').textContent,`${Number(food.portions[oz].nutrition.protein.toFixed(1))} g`);
 const input=controls.get('[data-food-quantity]');input.value='';input.handlers.input();assert.equal(controls.get('[data-food-confirm]').disabled,true);
 input.value='2';input.handlers.input();assert.equal(controls.get('[data-food-confirm]').disabled,false);
});

test('repeated unit switches stay blank until a new amount is entered',async()=>{
 const {bindFoodAmountEditor}=await import('../js/nutrition/food-portion-editor.js');
 const food=withFoodWeightUnits(original), map=new Map();
 const node=(value='')=>({value,textContent:'',hidden:true,disabled:false,handlers:{},dataset:{},setAttribute(){},addEventListener(k,fn){this.handlers[k]=fn;}});
 const g=food.portions.findIndex(p=>p.inputUnit==='g'),oz=food.portions.findIndex(p=>p.inputUnit==='oz'),lb=food.portions.findIndex(p=>p.inputUnit==='lb');
 map.set('[data-food-serving]',node(String(g)));map.set('[data-food-quantity]',node('130'));
 const root={querySelector:s=>map.get(s),querySelectorAll:()=>[]};bindFoodAmountEditor(root,food);
 const select=map.get('[data-food-serving]'),input=map.get('[data-food-quantity]');
 const change=index=>{select.value=String(index);select.handlers.change();};
 for(let i=0;i<30;i++){change(oz);change(lb);change(g);assert.equal(input.value,'');}
 input.value='130.25';input.handlers.input();change(oz);assert.equal(input.value,'');
 input.value='5';input.handlers.input();change(g);assert.equal(input.value,'');
});

test('legacy conversion artifacts display as useful gram precision',async()=>{
 const {formatConvertedPortionAmount}=await import('../js/nutrition/food-portion-units.js');
 assert.equal(formatConvertedPortionAmount(129.999999999,{inputUnit:'g'}),'130');
 assert.equal(formatConvertedPortionAmount(130.250000001,{inputUnit:'g'}),'130.25');
 assert.equal(formatConvertedPortionAmount(5.000000001,{inputUnit:'oz'}),'5');
});

test('expanded guide library contains thirteen distinct bundled references',async()=>{
 const {FOOD_PORTION_GUIDES}=await import('../js/nutrition/food-portion-guide-data.js');
 const {existsSync}=await import('node:fs');
 assert.equal(FOOD_PORTION_GUIDES.length,13);
 assert.equal(new Set(FOOD_PORTION_GUIDES.map(g=>g.index)).size,13);
 for(const guide of FOOD_PORTION_GUIDES)assert.ok(existsSync(`assets/food/guide-${guide.index}.webp`),guide.title);
});

test('new entries start blank while explicit saved quantities are restored',async()=>{
 const {foodAmountMarkup,bindFoodAmountEditor,restoreFoodAmount}=await import('../js/nutrition/food-portion-editor.js');
 const food=withFoodWeightUnits(original);
 assert.match(foodAmountMarkup(food),/aria-label="Food amount"[^>]*value=""/);
 const nodes=new Map();
 const node=value=>({value,textContent:'',hidden:true,handlers:{},setAttribute(){},addEventListener(k,fn){this.handlers[k]=fn;}});
 nodes.set('[data-food-serving]',node('0'));nodes.set('[data-food-quantity]',node(''));
 nodes.set('[data-food-amount-error]',node(''));nodes.set('[data-food-confirm]',node(''));
 const root={querySelector:s=>nodes.get(s),querySelectorAll:()=>[]};bindFoodAmountEditor(root,food);
 assert.equal(nodes.get('[data-food-amount-error]').hidden,true);
 assert.equal(nodes.get('[data-food-confirm]').disabled,true);
 const g=food.portions.findIndex(p=>p.inputUnit==='g');restoreFoodAmount(root,food,g,175);
 assert.equal(nodes.get('[data-food-quantity]').value,'175');
 assert.equal(nodes.get('[data-food-confirm]').disabled,false);
});
