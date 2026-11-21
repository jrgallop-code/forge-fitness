import {MEAL_CATALOG,macrosForIngredients} from "./meal-planner-data.js?v=3";
import {FEATURED_RECIPES,featuredIngredients} from "./meal-planner-featured-recipes.js?v=1";
import {recipePhoto} from "./meal-planner-photos.js?v=1";
import {recipeSteps} from "./meal-planner-media.js?v=2";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const CATALOG_FAVORITES_KEY="level_up_meal_catalog_favorites_v1";
export const CATALOG_SLOTS=["All","Breakfast","Lunch","Dinner","Snacks"];
export const CATALOG_FILTERS=["All recipes","High protein","Quick meals","Vegetarian","Vegan","Pescatarian"];
export function baseRecipes(){return [...MEAL_CATALOG.filter((_,i)=>i%20===0),...FEATURED_RECIPES];}
export function storedFavorites(){try{const ids=JSON.parse(localStorage.getItem(CATALOG_FAVORITES_KEY)||"[]");return Array.isArray(ids)?ids.filter(x=>typeof x==="string"):[]}catch{return []}}
export function toggleFavorite(id){
 const list=new Set(storedFavorites());if(list.has(id))list.delete(id);else list.add(id);
 try{localStorage.setItem(CATALOG_FAVORITES_KEY,JSON.stringify([...list]));return list.has(id)}catch{return false}
}
export function photoMarkup(recipe,cls=""){
 if(recipe?.imageStatus)return '<span class="mp-real-photo mp-awaiting-photo '+esc(cls)+'" role="img" aria-label="Recipe-specific photograph pending review" style="display:flex;align-items:center;justify-content:center;background:var(--surface-2,#384a43);color:var(--text-primary,#fff);padding:18px;text-align:center"><span>Recipe photo pending<br><small>Ingredient-accurate image required</small></span></span>';
 const photo=recipePhoto(recipe);
 const style="background-image:url("+photo.primary+");background-size:500% 400%;background-position:"+photo.x+"% "+photo.y+"%;";
 const label="AI-generated photographic illustration of "+String(recipe?.name||"meal");
 return '<span class="mp-real-photo mp-ai-photo '+esc(cls)+'" style="'+esc(style)+'" role="img" aria-label="'+esc(label)+'"></span>';
}
function displaySlot(slot){return slot==="Meal 4"?"Snacks":slot}
export function matchesCatalog(recipe,{slot="All",filter="All recipes",search=""}={}){
 const selectedSlot=slot==="Snacks"?"Meal 4":slot;
 if(selectedSlot!=="All"&&recipe.slot!==selectedSlot)return false;
 const query=String(search).trim().toLowerCase();
 const words=[recipe.name,recipe.cuisine,recipe.diet,...(recipe.ingredients||featuredIngredients(recipe)).map(x=>x.food)].join(" ").toLowerCase();
 if(query&&!words.includes(query))return false;
 const m=macrosForIngredients(recipe.ingredients);
 if(filter==="High protein"&&m.protein<25)return false;
 if(filter==="Quick meals"&&recipe.prepMinutes>20)return false;
 if(filter==="Vegetarian"&&!["vegan","vegetarian"].includes(recipe.diet))return false;
 if(filter==="Vegan"&&recipe.diet!=="vegan")return false;
 if(filter==="Pescatarian"&&!["vegan","vegetarian","pescatarian"].includes(recipe.diet))return false;
 return true;
}
export function recipeCard(recipe,favorite=false){
 const m=macrosForIngredients(recipe.ingredients);
 return '<article class="mp-catalog-card"><button type="button" class="mp-catalog-open" data-mp-recipe="'+esc(recipe.id)+'" aria-label="See '+esc(recipe.name)+'">'+photoMarkup(recipe)+
 '<span class="mp-catalog-text"><strong>'+esc(recipe.name)+'</strong><small>'+Math.round(m.calories)+' kcal · '+Math.round(m.protein)+'g protein · '+recipe.prepMinutes+' min'+(recipe.publishedEstimate?' · source estimate':'')+'</small></span></button>'+
 '<button type="button" class="mp-catalog-heart'+(favorite?" active":"")+'" data-mp-favorite="'+esc(recipe.id)+'" aria-label="'+(favorite?"Remove":"Save")+' favorite">'+(favorite?"♥":"♡")+'</button></article>';
}
export function catalogMarkup({slot="All",filter="All recipes",search=""}={}){
 const favorites=new Set(storedFavorites());
 const recipes=baseRecipes().filter(recipe=>matchesCatalog(recipe,{slot,filter,search}));
 return '<section class="lu-meal-planner mp-catalog mp-standalone">'+
 '<header class="mp-screen-header"><button type="button" data-mp-open="landing" aria-label="Back to Meal Planner">‹</button><h2>Meal catalog</h2><span></span></header>'+
 '<div class="mp-catalog-content"><p class="mp-catalog-intro">Explore recipe ideas and source-linked meals with complete seasonings</p>'+
 '<label class="mp-catalog-search"><span aria-hidden="true">⌕</span><input data-mp-search type="search" placeholder="Search meals or ingredients" value="'+esc(search)+'" aria-label="Search recipes"></label>'+
 '<div class="mp-catalog-chips" role="group" aria-label="Meal type">'+CATALOG_SLOTS.map(x=>'<button type="button" class="'+(slot===x?"active":"")+'" data-mp-slot="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div>'+
 '<div class="mp-catalog-chips mp-catalog-secondary" role="group" aria-label="Meal filters">'+CATALOG_FILTERS.map(x=>'<button type="button" class="'+(filter===x?"active":"")+'" data-mp-filter="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div>'+
 '<p class="mp-catalog-count">'+recipes.length+' recipes · Calories are for a standard portion</p>'+
 '<div class="mp-catalog-grid">'+recipes.map(recipe=>recipeCard(recipe,favorites.has(recipe.id))).join("")+'</div>'+
 (recipes.length?"":'<p class="mp-catalog-empty">No recipes match these filters. Try another meal type or search.</p>')+
 '<p class="mp-disclaimer">Generated photographs illustrate recipe ideas; some recipes share a similar dish image. Final plating may differ. Nutritional values are estimates.</p></div></section>';
}
function featuredRecipeDetail(recipe){
 const m=recipe.publishedEstimate;
 const groups=recipe.groups.map(group=>'<section><h3>'+esc(group.label)+'</h3><ul>'+group.ingredients.map(item=>'<li><span>'+esc(item.food)+'</span><strong>'+item.grams+' '+esc(item.unit)+'</strong></li>').join("")+'</ul></section>').join("");
 return '<section class="lu-meal-planner mp-recipe-detail mp-standalone"><header class="mp-screen-header"><button type="button" data-mp-open="catalog" aria-label="Back to catalog">‹</button><h2>Recipe reference</h2><span></span></header><div class="mp-recipe-content">'+photoMarkup(recipe,"mp-recipe-hero")+
 '<h1>'+esc(recipe.name)+'</h1><p>'+esc(recipe.cuisine)+' · Dinner · '+recipe.prepMinutes+' minutes · '+recipe.servings+' servings</p>'+
 '<p class="mp-disclaimer"><strong>Source nutrition estimate, not verified by Level Up.</strong> Per serving: '+m.calories+' kcal · '+m.protein+'g protein · '+m.carbs+'g carbs · '+m.fat+'g fat.</p>'+
 groups+'<section><h3>Cooking directions</h3><ol>'+recipe.steps.map(s=>'<li>'+esc(s)+'</li>').join("")+'</ol></section>'+
 '<section><h3>Meal prep & storage</h3><p>'+esc(recipe.storage)+'</p></section>'+
 '<section><h3>Source & verification</h3><p>Based on ingredient facts published by '+esc(recipe.sourceName)+'. <a href="'+esc(recipe.sourceUrl)+'" target="_blank" rel="noopener noreferrer">View the original recipe and cooking guidance</a>.</p><p>'+esc(recipe.notes)+'</p></section>'+
 '<p class="mp-disclaimer">Full independent nutrient mapping, food diary compatibility, image review and recipe publication approval are pending. This reference is not currently available for automated plans.</p></div></section>';
}
export function recipeDetailMarkup(recipe,hasPlan=false){
 if(recipe?.groups)return featuredRecipeDetail(recipe);
 const m=macrosForIngredients(recipe.ingredients);
 return '<section class="lu-meal-planner mp-recipe-detail mp-standalone">'+
 '<header class="mp-screen-header"><button type="button" data-mp-open="catalog" aria-label="Back to catalog">‹</button><h2>Recipe</h2><span></span></header>'+
 '<div class="mp-recipe-content">'+photoMarkup(recipe,"mp-recipe-hero")+
 '<h1>'+esc(recipe.name)+'</h1><p>'+esc(recipe.cuisine)+' · '+displaySlot(recipe.slot)+' · '+recipe.prepMinutes+' minutes</p>'+
 '<div class="mp-recipe-macro-grid">'+[["Calories",Math.round(m.calories)],["Protein",Math.round(m.protein)+"g"],["Carbs",Math.round(m.carbs)+"g"],["Fat",Math.round(m.fat)+"g"]].map(([label,value])=>'<div><strong>'+esc(value)+'</strong><small>'+label+'</small></div>').join("")+'</div>'+
 '<section><h3>Ingredients</h3><ul>'+recipe.ingredients.map(x=>'<li><span>'+esc(x.food)+'</span><strong>'+Math.round(x.grams)+'g</strong></li>').join("")+'</ul></section>'+
 '<section><h3>Cooking instructions</h3><ol>'+recipeSteps(recipe).map(step=>'<li>'+esc(step)+'</li>').join("")+'</ol></section>'+
 (hasPlan?'<button type="button" class="primary-btn mp-recipe-use" data-mp-use-recipe="'+esc(recipe.id)+'">Use for '+esc(displaySlot(recipe.slot))+' today</button>':'<button type="button" class="primary-btn mp-recipe-use" data-mp-open="wizard">Build a meal plan</button>')+
 '<p class="mp-disclaimer">AI-generated food photographs are illustrative; some recipes use a similar dish image. Recipes and nutrition remain estimates.</p></div></section>';
}
