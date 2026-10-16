import test from 'node:test';
import assert from 'node:assert/strict';
import {extraUsdaNutrition,extraFatSecretNutrition,extraOpenFoodFactsNutrition,extraOpenFoodFactsSetNutrition} from '../cloud/src/food-extra-nutrients.js';
import {normalizeUsdaFood,normalizeOpenFoodFactsProduct} from '../cloud/src/index.js';
import {normalizeFatSecretFood} from '../cloud/src/fatsecret-food-provider.js';
test('USDA preserves vitamins in micrograms and rejects unrelated IU quantities',()=>{
 const nutrients=extraUsdaNutrition({foodNutrients:[{nutrient:{id:1114,unitName:'UG'},amount:2.5},{nutrient:{id:1178,unitName:'µg'},amount:.04},{nutrient:{id:1090,unitName:'MG'},amount:40},{nutrient:{id:1104,unitName:'IU'},amount:100}]});
 assert.equal(nutrients.vitaminD,2.5);assert.equal(nutrients.vitaminB12,.04);assert.equal(nutrients.magnesium,40);assert.equal(nutrients.vitaminA,undefined);
});
test('FatSecret detailed servings preserve vitamin A, D, added sugar and unsaturated fats',()=>{
 const food=normalizeFatSecretFood({food_id:'123',food_name:'Test',servings:{serving:{serving_id:'456',serving_description:'100 g',metric_serving_amount:'100',metric_serving_unit:'g',calories:'100',protein:'5',fat:'2',carbohydrate:'15',vitamin_a:'80',vitamin_d:'2.5',added_sugars:'0',monounsaturated_fat:'1.5'}}});
 assert.equal(food.portions[0].nutrition.vitaminA,80);assert.equal(food.portions[0].nutrition.vitaminD,2.5);assert.equal(food.portions[0].nutrition.addedSugars,0);assert.equal(food.portions[0].nutrition.monounsaturatedFat,1.5);assert.equal(food.portions[0].nutrition.magnesium,undefined);assert.equal(food.nutrientSchemaVersion,2);
});
test('OFF legacy and structured units normalize to the same vitamin amounts',()=>{
 const legacy=extraOpenFoodFactsNutrition({'vitamin-d_100g':.0000025,'vitamin-b12_100g':.00000004},'100g');
 const structured=extraOpenFoodFactsSetNutrition({nutrients:{'vitamin-d':{value:2.5,unit:'µg'},'vitamin-b12':{value:.04,unit:'mcg'},iron:{value:null,unit:'mg'}}});
 assert.ok(Math.abs(legacy.vitaminD-structured.vitaminD)<1e-10);assert.ok(Math.abs(legacy.vitaminB12-structured.vitaminB12)<1e-10);assert.equal(structured.iron,undefined);
 assert.deepEqual(extraFatSecretNutrition({vitamin_d:null,added_sugars:''}),{});
});
test('USDA label overrides preserve additional nutrients at correct serving size and tiny gram amounts',()=>{
 const food=normalizeUsdaFood({fdcId:123,description:'Test',servingSize:50,servingSizeUnit:'g',labelNutrients:{calories:{value:75},sodium:{value:100}},foodNutrients:[{nutrient:{id:1008,unitName:'KCAL'},amount:150},{nutrient:{id:1178,unitName:'UG'},amount:.04}]});
 assert.equal(food.portions[0].nutrition.sodium,100);assert.equal(food.portions[0].nutrition.vitaminB12,.02);
 assert.equal(food.portions.find(p=>p.grams===1).nutrition.vitaminB12,.0004);
});
