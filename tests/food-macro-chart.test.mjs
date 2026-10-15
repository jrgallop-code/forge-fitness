import test from 'node:test';
import assert from 'node:assert/strict';
import {foodMacroModel} from '../js/nutrition/food-macro-chart.js';
import {foodPhotoIndex} from '../js/nutrition/food-photo.js';
import {foodHeroMarkup} from '../js/nutrition/food-portion-editor.js';
test('pie uses calorie shares, not grams, and updates proportionally with amount',()=>{
 const m=foodMacroModel({carbs:25,protein:25,fat:10},2);
 assert.equal(m.total,580);assert.equal(m.grams.fat,20);
 assert.ok(Math.abs(m.shares.fat-90/290*100)<1e-9);
 assert.ok(Math.abs(Object.values(m.shares).reduce((a,b)=>a+b,0)-100)<1e-9);
 assert.deepEqual(m.shares,foodMacroModel({carbs:25,protein:25,fat:10},1).shares);
});
test('bars use saved daily macro targets and retain over-target labels',()=>{
 const m=foodMacroModel({protein:30,carbs:40,fat:10},2,{protein:40,carbs:200,fat:60});
 assert.equal(m.hasTargets,true);assert.equal(m.bars.protein,150);assert.equal(m.bars.carbs,40);
});
test('missing targets use labeled calorie shares, and zero foods have no fake pie',()=>{
 const m=foodMacroModel({protein:30},1,{});assert.equal(m.hasTargets,false);assert.equal(m.bars.protein,100);
 const zero=foodMacroModel({});assert.equal(zero.total,0);assert.deepEqual(Object.values(zero.shares),[0,0,0]);
});
test('blueberries and plurals cannot fall through to chicken or broad API categories',()=>{
 for(const name of ['Blueberry','Blueberries','Blueberries, raw','Frozen blueberries'])assert.equal(foodPhotoIndex({name,category:'Poultry'}),16);
 assert.equal(foodPhotoIndex({name:'Strawberries'}),17);assert.equal(foodPhotoIndex({name:'Bananas'}),18);
 assert.equal(foodPhotoIndex({name:'Unknown product',category:'chicken'}),null);
});
test('unmatched foods and composite recipes never show a chicken fallback',()=>{
 for(const name of ['Blueberry muffin','Protein shake','Chocolate cake','Pork chop','Tuna','Unknown food']){
  assert.equal(foodPhotoIndex({name}),null);
  const html=foodHeroMarkup({name});assert.ok(html.includes('food-photo-neutral'));assert.ok(!html.includes('category-0.webp'));
 }
 assert.equal(foodPhotoIndex({name:'Chicken breast'}),0);assert.equal(foodPhotoIndex({name:'Cheddar cheese'}),20);
});
