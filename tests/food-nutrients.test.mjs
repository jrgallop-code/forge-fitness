import test from 'node:test';
import assert from 'node:assert/strict';
import {nutrientRows,nutrientMarkup} from '../js/nutrition/food-nutrients.js';
import {withFoodWeightUnits} from '../js/nutrition/food-portion-units.js';
import {scaledNutrition} from '../js/nutrition/food-log-data-core.js';
import {extraUsdaNutrition,extraFatSecretNutrition,extraOpenFoodFactsNutrition} from '../cloud/src/food-extra-nutrients.js';
import {readFileSync} from 'node:fs';
test('nutrient rows scale amounts, preserve known zeroes and distinguish missing values',()=>{
 const rows=nutrientRows({sodium:80,saturatedFat:0},2,'all');
 assert.equal(rows.find(r=>r.key==='sodium').text,'160 mg');
 assert.equal(rows.find(r=>r.key==='saturatedFat').text,'0 g');
 assert.equal(rows.find(r=>r.key==='iron').text,'—');
 assert.equal(nutrientRows({sodium:80},null).find(r=>r.key==='sodium').text,'—');
 assert.ok(nutrientRows({},1,'all').length>nutrientRows({}).length);
 assert.match(nutrientMarkup(),/<details[^>]*open/);
});
test('optional nutrients survive unit conversion and saving without inventing missing data',()=>{
 const food=withFoodWeightUnits({name:'Test',portions:[{label:'100 g',grams:100,nutrition:{calories:100,protein:5,carbs:10,fat:2,sodium:200,saturatedFat:0}}]});
 const g=food.portions.find(p=>p.inputUnit==='g');assert.equal(g.nutrition.sodium,2);assert.equal(g.nutrition.saturatedFat,0);assert.equal(g.nutrition.iron,undefined);
 assert.equal(scaledNutrition(g.nutrition,150).sodium,300);
});
test('providers keep only reported nutrients and normalize milligrams',()=>{
 assert.deepEqual(extraFatSecretNutrition({sodium:'80',saturated_fat:'0'}),{saturatedFat:0,sodium:80});
 assert.deepEqual(extraOpenFoodFactsNutrition({sodium_100g:.08,iron_100g:.001},'100g'),{sodium:80,iron:1});
 assert.deepEqual(extraUsdaNutrition({foodNutrients:[{nutrient:{id:1093,unitName:'MG'},amount:80},{nutrientNumber:'606',unitName:'G',value:0}]}),{saturatedFat:0,sodium:80});
});
test('food detail keeps X dismissal and removes the redundant bottom navigation',()=>{
 const source=readFileSync('js/nutrition/food-log.js','utf8');
 assert.ok(source.includes('data-food-portion-close'));assert.ok(!source.includes('class="food-detail-back"'));
});
