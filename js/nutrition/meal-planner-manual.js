// Manual planner: date-stable, recipe-versioned calendar entries. No consumption writes.
import {featuredIngredients} from "./meal-planner-featured-recipes.js?v=1";
export const isoDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
export function nextMonday(date=new Date()){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()+((8-d.getDay())%7));return isoDate(d);}
export function dateForOffset(start,offset){const d=new Date(start+"T12:00:00");if(Number.isNaN(d.valueOf()))throw new Error("Invalid start date");d.setDate(d.getDate()+offset);return isoDate(d);}
export function recipeServingIngredients(recipe){if(recipe.groups)return featuredIngredients(recipe).map(item=>({food:item.food,grams:item.grams/recipe.servings,unit:item.unit||"g",group:item.group}));return (recipe.ingredients||[]).map(item=>({food:item.food,grams:item.grams,unit:item.unit||"g"}));}
export function scheduleRecipe(plan,recipe,{startDate,dayOffsets,slots,portionsPerDay=1}={}){
 if(!recipe||!recipe.id)throw new Error("Recipe required");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate||""))throw new Error("Valid start date required");
 const days=[...new Set((dayOffsets||[]).map(Number))].sort((a,b)=>a-b);
 const safeSlots=[...new Set(slots||[])].filter(x=>["Breakfast","Lunch","Dinner","Meal 4"].includes(x));
 const portions=Number(portionsPerDay);
 if(!days.length||days.some(x=>!Number.isInteger(x)||x<0||x>6))throw new Error("Choose weekdays");
 if(!safeSlots.length)throw new Error("Choose at least one meal slot");
 if(!Number.isInteger(portions)||portions<1||portions>12)throw new Error("Choose 1–12 portions");
 const recipeSnapshot=recipeServingIngredients(recipe);
 if(!recipeSnapshot.length||recipeSnapshot.some(x=>!Number.isFinite(x.grams)||x.grams<=0))throw new Error("Recipe has no valid ingredients");
 const previous=plan&&Array.isArray(plan.entries)?plan.entries:[];
 const replacements=new Set(days.flatMap(i=>safeSlots.map(slot=>dateForOffset(startDate,i)+"|"+slot)));
 const occupied=previous.filter(entry=>replacements.has(entry.date+"|"+entry.slot)&&entry.consumed);
 if(occupied.length)throw new Error("Cannot replace an already-consumed meal");
 const batchId="manual-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
 const generated=days.flatMap(i=>safeSlots.map(slot=>({
   date:dateForOffset(startDate,i),slot,recipeId:recipe.id,recipeVersion:recipe.recipeVersion||1,
   servings:portions,ingredients:recipeSnapshot.map(x=>({...x})),batchId,
   recipeName:recipe.name,
   recipePublishedEstimate:recipe.publishedEstimate?{...recipe.publishedEstimate}:null,
   recipeSteps:Array.isArray(recipe.steps)?recipe.steps.slice():[],
   recipeSourceName:recipe.sourceName||null,
   batchCookDate:dateForOffset(startDate,days[0]),sourceStatus:recipe.reviewStatus||recipe.nutritionStatus||"estimated-not-verified",
   nutritionVerified:false,manuallyScheduled:true
 })));
 const entries=[...previous.filter(x=>!replacements.has(x.date+"|"+x.slot)),...generated].sort((a,b)=>a.date.localeCompare(b.date)||["Breakfast","Lunch","Dinner","Meal 4"].indexOf(a.slot)-["Breakfast","Lunch","Dinner","Meal 4"].indexOf(b.slot));
 return {...(plan||{}),version:Math.max(3,plan?.version||0),startDate:plan?.startDate||startDate,preferences:plan?.preferences||{},entries,consumed:false,updatedAt:new Date().toISOString()};
}
export function batchPortionCount(entries,batchId){return (entries||[]).filter(x=>x.batchId===batchId).reduce((n,x)=>n+(Number(x.servings)||0),0);}

/** Remove only a scheduled meal. Logged Food Log entries are intentionally untouched. */
export function removeScheduledMeal(plan,date,slot){
 if(!plan||!Array.isArray(plan.entries))return plan;
 const entries=plan.entries.filter(entry=>!(entry.date===date&&entry.slot===slot));
 if(entries.length===plan.entries.length)return plan;
 return {...plan,entries,updatedAt:new Date().toISOString()};
}
