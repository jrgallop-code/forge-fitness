// iOS-only Meal Plan dashboard inspired by the Level Up visual mockup.
// Source-of-truth recipes, favorites and planned entries are reused; no diary writes.
import {macrosForIngredients} from "./meal-planner-data.js?v=3";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const svg=(body)=>'<svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
const icons={
 week:svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>'),
 groceries:svg('<circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 2h2l2.6 12.5a2 2 0 0 0 2 1.6h11.8a2 2 0 0 0 2-1.6L23 6H4"/>'),
 recipes:svg('<path d="M7 21h10M4 21V11c-3-3-1-8 3-8 1.6 0 3 .7 4 2 2.2-2.8 7-2.6 8 1 4-1 7 4 3 7v8"/><path d="M10 16v2M14 16v2"/>'),
 favorites:svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>'),
 chevron:svg('<path d="m9 18 6-6-6-6"/>')
};
const niceDate=date=>new Date(date+"T12:00:00");
const key=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
function weekDates(plan){
 const planned=[...new Set(plan?.entries?.map(x=>x.date)||[])].sort();
 if(planned.length)return planned.slice(0,7);
 const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 start.setDate(start.getDate()-(start.getDay()+6)%7);
 return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return key(d)});
}
function recipeNutrition(recipe,entry){
 if(!recipe)return null;
 if(entry?.ingredients?.length)return macrosForIngredients(entry.ingredients);
 if(recipe?.publishedEstimate)return recipe.publishedEstimate;
 return recipe?.ingredients?.length?macrosForIngredients(recipe.ingredients):null;
}
function recipeCard(recipe,entry,photoMarkup,favs){
 const m=recipeNutrition(recipe,entry);
 const calories=Number.isFinite(m?.calories)?Math.round(m.calories):null;
 const macros=Number.isFinite(m?.protein)&&Number.isFinite(m?.carbs)&&Number.isFinite(m?.fat)
 ?'<div class="mp-home-macros"><span><strong>'+Math.round(m.protein)+'g</strong><small>Protein</small></span><span><strong>'+Math.round(m.carbs)+'g</strong><small>Carbs</small></span><span><strong>'+Math.round(m.fat)+'g</strong><small>Fat</small></span></div>':'';
 return '<article class="mp-home-recipe">'+
 '<button type="button" class="mp-home-recipe-open" data-mp-recipe="'+esc(recipe.id)+'" aria-label="View '+esc(recipe.name)+'">'+photoMarkup(recipe,"mp-home-recipe-photo")+
 '<span class="mp-home-recipe-info"><strong>'+esc(recipe.name)+'</strong><small>'+(calories!==null?'≈ '+calories+' kcal':'Recipe nutrition under review')+'</small>'+macros+'</span></button>'+
 '<button type="button" class="mp-home-heart'+(favs.has(recipe.id)?" active":"")+'" data-mp-favorite="'+esc(recipe.id)+'" aria-label="'+(favs.has(recipe.id)?"Remove":"Save")+' favorite">'+(favs.has(recipe.id)?"♥":"♡")+'</button></article>';
}
export function mealPlannerHomeMarkup({plan,selectedDate="",recipes,photoMarkup,favoriteIds=[]}){
 const dates=weekDates(plan);
 const active=dates.includes(selectedDate)?selectedDate:dates[0];
 const savedEntries=(plan?.entries||[]).filter(x=>x.date===active);
 const scheduled=savedEntries.map(e=>({recipe:recipes.find(r=>r.id===e.recipeId),entry:e})).filter(x=>x.recipe);
 const recommendations=["Chicken rice bowl","Lean beef rice skillet","Turkey avocado wrap","Salmon and sweet potato"].map(name=>recipes.find(r=>r.name===name)).filter(Boolean);
 const highlights=scheduled.length?scheduled:recommendations.map(recipe=>({recipe,entry:null}));
 const favorites=new Set(favoriteIds);
 const actions=[["week","My Week","calendar"],["groceries","Grocery","groceries"],["recipes","Recipes","catalog"],["favorites","Favorites","favorites"]];
 const count=plan?.entries?.length||0;
 return '<section class="lu-meal-planner mp-home mp-standalone">'+
 '<header class="mp-home-header"><div><span class="mp-home-eyebrow">LEVEL UP · NUTRITION</span><h1>Meal Plan</h1></div><button type="button" class="mp-home-close" data-mp-exit aria-label="Return to Food Log">✕</button></header>'+
 '<nav class="mp-home-quick" aria-label="Meal Plan shortcuts">'+actions.map(([icon,label,screen])=>'<button type="button" class="mp-home-shortcut" data-mp-open="'+screen+'" aria-label="Open '+label+'"><span class="mp-home-shortcut-icon">'+icons[icon]+'</span><span>'+label+'</span></button>').join("")+'</nav>'+
 '<div class="mp-home-heading"><h2>'+(scheduled.length?'This Week':'Discover recipes')+'</h2><button type="button" data-mp-open="'+(plan?'calendar':'catalog')+'">'+(plan?'View week':'Browse all')+icons.chevron+'</button></div>'+
 '<div class="mp-home-date-strip" role="group" aria-label="Select meal plan day">'+dates.map(date=>{const d=niceDate(date);return '<button type="button" data-mp-home-date="'+esc(date)+'" class="'+(date===active?'active':'')+'" aria-pressed="'+(date===active)+'"><span>'+esc(d.toLocaleDateString(undefined,{weekday:"short"}))+'</span><small>'+d.getDate()+'</small></button>'}).join("")+'</div>'+
 '<p class="mp-home-subcopy">'+(scheduled.length?scheduled.length+' planned meal'+(scheduled.length===1?'':'s')+' for this day. Planning does not log food.':'Choose a recipe to start planning meals for your week.')+'</p>'+
 '<div class="mp-home-grid">'+highlights.map(({recipe,entry})=>recipeCard(recipe,entry,photoMarkup,favorites)).join("")+'</div>'+
 '<button class="mp-home-grocery-banner" type="button" data-mp-open="groceries"><span class="mp-home-grocery-icon">'+icons.groceries+'</span><span><strong>Grocery List</strong><small>'+(count?count+' planned meal slots':'Build your list from planned meals')+'</small></span>'+icons.chevron+'</button>'+
 '<button type="button" class="mp-home-generate" data-mp-open="wizard">Generate a personalized meal plan</button>'+
 '<p class="mp-home-disclaimer">Nutrition and meal values are estimates. Planned meals are never counted as consumed.</p></section>';
}
