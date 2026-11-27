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
export function markPlannedMealConsumed(date,slot,ingredients){
 if(hasConsumedMeal(date,slot)) return {ok:false,reason:"already_logged"};
 if(!Array.isArray(ingredients)||ingredients.length===0)return {ok:false,reason:"empty_meal"};
 const entries=ingredients.filter(item=>Number(item.grams)>0).map(item=>{
  const reference=FOOD_VALUES[item.food];
  if(!reference)return null;
  const nutrition={calories:reference[0],protein:reference[1],carbs:reference[2],fat:reference[3],fiber:0};
  const food={source:"custom",name:item.food,servingLabel:"100 g (estimated)",nutrition,portions:[{label:"100 g (estimated)",grams:100,nutrition}]};
  return {...createLogEntry({meal:slotToLogMeal(slot),food,portion:{label:"100 g (estimated)",nutrition},quantity:Number(item.grams)/100}),mealPlannerKey:plannerEntryKey(date,slot),mealPlannerEstimated:true};
 }).filter(Boolean);
 if(entries.length===0||entries.length!==ingredients.filter(item=>Number(item.grams)>0).length)return {ok:false,reason:"unknown_ingredient"};
 try{saveEntries(date,entries);return {ok:true,entryIds:entries.map(item=>item.id)}}catch(error){return {ok:false,reason:error.message||"storage_error"}}
}
export function undoPlannedMealConsumed(date,slot){
 const items=consumedEntries(date,slot);
 if(!items.length)return {ok:false,reason:"not_logged"};
 try{items.forEach(item=>removeEntry(date,item.id));return {ok:true,count:items.length}}catch(error){return {ok:false,reason:error.message||"storage_error"}}
}
