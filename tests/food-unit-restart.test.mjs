import test from 'node:test';
import assert from 'node:assert/strict';
import * as live from '../js/nutrition/fatsecret-live-cache.js';
import {withFoodWeightUnits} from '../js/nutrition/food-portion-units.js';
const base={source:'fatsecret',fatSecretFoodId:'50123',catalogueId:'fatsecret:50123',name:'Chicken',portions:[{servingId:'70123',label:'1 portion (100 g)',grams:100,nutrition:{calories:200,protein:25}}]};
const entry=(food,portion,quantity)=>({source:'fatsecret',food,quantity,servingLabel:portion.label});
test('gram amounts survive JSON persistence and a cold food-cache restart',async()=>{
 const food=withFoodWeightUnits(base),portion=food.portions.find(p=>p.inputUnit==='g');
 const saved=JSON.parse(JSON.stringify(live.sanitizeFatSecretEntry(entry(food,portion,350))));
 assert.deepEqual(saved.fatSecretPortion,{unit:'g'});assert.equal(saved.quantity,350);assert.equal(saved.food,undefined);assert.equal(saved.nutrition,undefined);
 const fresh=await import('../js/nutrition/fatsecret-live-cache.js?restart-grams-test');
 assert.equal(fresh.hydrateFatSecretEntry(saved).fatSecretPending,true);
 fresh.rememberFatSecretEntry(base);
 const restored=fresh.hydrateFatSecretEntry(saved);
 assert.equal(restored.servingLabel,'1 g');assert.equal(restored.quantity,350);assert.equal(restored.nutrition.calories,700);
 assert.equal(fresh.sanitizeFatSecretEntry(restored).fatSecretPortion.unit,'g');
});
test('ounces, pounds and milliliters restore the selected measure, not serving ID fallback',async()=>{
 const source={...base,fatSecretFoodId:'50124',portions:[{servingId:'70124',label:'1 cup',grams:200,milliliters:240,nutrition:{calories:200}}]};
 const food=withFoodWeightUnits(source),fresh=await import('../js/nutrition/fatsecret-live-cache.js?restart-other-test');fresh.rememberFatSecretEntry(source);
 for(const unit of ['oz','lb','mL']){
  const portion=food.portions.find(p=>p.inputUnit===unit),saved=live.sanitizeFatSecretEntry(entry(food,portion,2));
  const restored=fresh.hydrateFatSecretEntry(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.servingLabel,portion.label);assert.equal(restored.quantity,2);assert.ok(Math.abs(restored.nutrition.calories-portion.nutrition.calories*2)<.0001);
 }
});
test('generated one-item count does not restore its inherited multi-item serving',async()=>{
 const source={...base,fatSecretFoodId:'50125',name:'Egg',portions:[{servingId:'70125',label:'2 large eggs (100 g)',grams:100,nutrition:{calories:156}}]};
 const food=withFoodWeightUnits(source),portion=food.portions.find(p=>p.count===1);
 const saved=live.sanitizeFatSecretEntry(entry(food,portion,3));
 const fresh=await import('../js/nutrition/fatsecret-live-cache.js?restart-count-test');fresh.rememberFatSecretEntry(source);
 const restored=fresh.hydrateFatSecretEntry(saved);assert.equal(restored.quantity,3);assert.equal(restored.nutrition.calories,234);assert.match(restored.servingLabel,/^1 large egg/);
});
test('legacy serving IDs retain their quantities; an unavailable selected measure never falls back',()=>{
 live.rememberFatSecretEntry(base);
 const old={fatSecretFoodId:'50123',fatSecretServingId:'70123',quantity:2};assert.equal(live.hydrateFatSecretEntry(old).nutrition.calories,400);
 const unavailable=live.hydrateFatSecretEntry({...old,fatSecretPortion:{unit:'mL'}});assert.equal(unavailable.fatSecretPending,true);assert.equal(unavailable.food,null);
});
