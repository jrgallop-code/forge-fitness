// A planned meal is never counted until explicitly confirmed. The ordinary food log
// remains the source of truth, so manual edits and deletions are reflected immediately.
import {createLogEntry,saveEntries,removeEntry,entriesForDate} from "./food-log-data.js?v=food-search-freeze-fix-1";
import {FOOD_VALUES} from "./meal-planner-data.js?v=1";
const slotToLogMeal = slot => slot === "Meal 4" ? "Snacks" : slot;
export function plannerEntryKey(date,slot){return date+"::"+slot;}
export function consumedEntries(date,slot){
 return entriesForDate(date).filter(entry=>entry?.mealPlannerKey===plannerEntryKey(date,slot));
}
export function hasConsumedMeal(date,slot){return consumedEntries(date,slot).length>0;}
export function markPlannedMealConsumed(date,slot,ingredients,servings=1){
 if(hasConsumedMeal(date,slot))return {ok:false,reason:"already_logged"};
 if(!Array.isArray(ingredients)||!ingredients.length)return {ok:false,reason:"empty_meal"};
 const portions=Number(servings);
 if(!Number.isInteger(portions)||portions<1||portions>12)return {ok:false,reason:"invalid_servings"};
 const invalid=ingredients.filter(item=>!item||!Number.isFinite(Number(item.grams))||Number(item.grams)<0);
 if(invalid.length)return {ok:false,reason:"invalid_ingredient_amount"};
 const positive=ingredients.filter(item=>Number(item.grams)>0);
 if(!positive.length)return {ok:false,reason:"empty_meal"};
 const unmapped=positive.filter(item=>!FOOD_VALUES[item.food]);
 if(unmapped.length)return {ok:false,reason:"unmapped_ingredients: "+[...new Set(unmapped.map(item=>String(item.food)))].join(", ")};
 const key=plannerEntryKey(date,slot);
 const entries=positive.map((item,index)=>{
  const reference=FOOD_VALUES[item.food];
  const nutrition={calories:reference[0],protein:reference[1],carbs:reference[2],fat:reference[3],fiber:0};
  const food={source:"custom",name:item.food,servingLabel:"100 g (estimated)",nutrition,portions:[{label:"100 g (estimated)",grams:100,nutrition}]};
  return {...createLogEntry({meal:slotToLogMeal(slot),food,portion:{label:"100 g (estimated)",nutrition},quantity:Number(item.grams)*portions/100}),
   mealPlannerKey:key,mealPlannerEstimated:true,mealPlannerIngredientIndex:index,
   mealPlannerPortions:portions};
 });
 try{
  const saved=saveEntries(date,entries);
  const persisted=consumedEntries(date,slot);
  if(!Array.isArray(saved)||saved.length!==entries.length||persisted.length!==entries.length)
   return {ok:false,reason:"ingredient_count_mismatch"};
  return {ok:true,entryIds:saved.map(item=>item.id),ingredientCount:saved.length};
 }catch(error){return {ok:false,reason:error.message||"storage_error"}}
}
// Featured recipes have a complete ingredient snapshot and an estimated
// published per-portion macro total, but not verified per-ingredient nutrients.
// Log one composite meal with every ingredient preserved in metadata rather
// than inventing nutrient values for its seasonings and sauces.
export function markFeaturedMealConsumed(date,slot,recipe,ingredients,servings=1){
 if(hasConsumedMeal(date,slot))return {ok:false,reason:"already_logged"};
 if(!recipe?.id||!recipe?.publishedEstimate||!Array.isArray(ingredients)||!ingredients.length)return {ok:false,reason:"incomplete_recipe"};
 const n=Number(servings);
 if(!Number.isInteger(n)||n<1||n>12)return {ok:false,reason:"invalid_servings"};
 if(ingredients.some(item=>!item?.food||!Number.isFinite(Number(item.grams))||Number(item.grams)<0))return {ok:false,reason:"invalid_ingredient_amount"};
 const nutrition=recipe.publishedEstimate;
 if(!["calories","protein","carbs","fat"].every(k=>Number.isFinite(Number(nutrition[k]))&&Number(nutrition[k])>=0))return {ok:false,reason:"invalid_nutrition"};
 const perPortion={calories:Number(nutrition.calories),protein:Number(nutrition.protein),carbs:Number(nutrition.carbs),fat:Number(nutrition.fat),fiber:Number(nutrition.fiber)||0};
 const portion={label:"1 meal portion (estimated)",grams:1,nutrition:perPortion};
 const food={source:"custom",name:recipe.name,servingLabel:portion.label,nutrition:perPortion,portions:[portion]};
 const snapshot=ingredients.map(x=>({food:String(x.food),grams:Number(x.grams)*n,unit:x.unit||"g",group:x.group||null}));
 const entry={...createLogEntry({meal:slotToLogMeal(slot),food,portion,quantity:n}),
  mealPlannerKey:plannerEntryKey(date,slot),mealPlannerRecipeId:recipe.id,
  mealPlannerEstimated:true,mealPlannerPortions:n,
  mealPlannerIngredientList:snapshot,
  mealPlannerNutrientBasis:"published per-portion estimate; ingredient nutrients not independently verified"};
 try{
  const saved=saveEntries(date,[entry]);
  const persisted=consumedEntries(date,slot);
  if(saved.length!==1||persisted.length!==1)return {ok:false,reason:"save_verification_failed"};
  return {ok:true,entryIds:saved.map(x=>x.id),ingredientCount:snapshot.length,composite:true};
 }catch(error){return {ok:false,reason:error.message||"storage_error"}}
}
export function undoPlannedMealConsumed(date,slot){
 const items=consumedEntries(date,slot);
 if(!items.length)return {ok:false,reason:"not_logged"};
 try{items.forEach(item=>removeEntry(date,item.id));return {ok:true,count:items.length}}catch(error){return {ok:false,reason:error.message||"storage_error"}}
}
