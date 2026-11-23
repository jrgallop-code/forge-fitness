// Recipe cards use one distinct generated food photo per displayed recipe; duplicates are rejected by regression tests.
import {MEAL_CATALOG,macrosForIngredients} from "./meal-planner-data.js?v=3";
import {FEATURED_RECIPES,featuredIngredients} from "./meal-planner-featured-recipes.js?v=1";
import {MPM_CATALOG_300,MPM_CATALOG_300_SUMMARY} from "./mpm-catalog-300.js?v=1";
import {getRecipeRating} from "./meal-planner-ratings.js?v=1";
import {recipePhoto} from "./meal-planner-photos.js?v=featured-base-hq-v3";
import {recipeSteps} from "./meal-planner-media.js?v=2";
import {sourceRecipeSteps} from "./meal-planner-source-prep.js?v=1";
import {cloudRecipe,cloudRecipes} from "./meal-planner-cloud-catalog.js?v=1";
import {formatIngredientMeasure} from "./meal-planner-measurements.js?v=kitchen-units-20261121";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const CATALOG_FAVORITES_KEY="level_up_meal_catalog_favorites_v1";
export const CATALOG_SLOTS=["All","Breakfast","Lunch","Dinner","Snacks"];
export const RECIPE_STYLE_SETTINGS_KEY="level_up_meal_recipe_styles_v1";
export const RECIPE_STYLE_CHOICES=[
 ["Meat & poultry","Chicken, turkey, beef and other meats"],
 ["Fish & seafood","Salmon, tuna, shrimp and other seafood"],
 ["Vegetarian","No meat or seafood; eggs and dairy allowed"],
 ["Vegan","No animal ingredients"]
];
export function selectedRecipeStyles(){
 try { const value=JSON.parse(localStorage.getItem(RECIPE_STYLE_SETTINGS_KEY)||"[]");
  return Array.isArray(value)?value.filter(id=>RECIPE_STYLE_CHOICES.some(([name])=>name===id)):[];
 }catch{return []}
}
export function saveRecipeStyles(values){
 const clean=[...new Set(values)].filter(id=>RECIPE_STYLE_CHOICES.some(([name])=>name===id));
 localStorage.setItem(RECIPE_STYLE_SETTINGS_KEY,JSON.stringify(clean));return clean;
}
const SEAFOOD=/\b(salmon|cod|tuna|fish|shrimp|prawn|seafood|tilapia|anchovy|sardine|trout)\b/i;
const MEAT=/\b(chicken|turkey|beef|steak|sirloin|pork|bacon|ham|sausage|lamb|chorizo|meatball)\b/i;
const ANIMAL=/\b(egg|eggs|milk|yogurt|yoghurt|cheese|butter|cream|whey|honey|feta|cottage cheese)\b/i;
export function recipeStyle(recipe){
 // Never assert vegetarian/vegan compatibility without a complete ingredient list.
 if(recipe?.indexOnly){
  if(SEAFOOD.test(recipe.name))return "Fish & seafood";
  if(MEAT.test(recipe.name))return "Meat & poultry";
  return "Unverified";
 }
 const names=(recipe.ingredients||featuredIngredients(recipe)).map(x=>String(x.food||x.name||"")).join(" ");
 if(SEAFOOD.test(names)||recipe.diet==="pescatarian")return "Fish & seafood";
 if(MEAT.test(names)||recipe.diet==="omnivore")return "Meat & poultry";
 if(recipe.diet==="vegan"&&!ANIMAL.test(names))return "Vegan";
 return "Vegetarian";
}
export function matchesRecipeStyles(recipe,styles=selectedRecipeStyles()){
 if(!styles?.length)return true;
 const style=recipeStyle(recipe);
 return styles.includes(style)||(style==="Vegan"&&styles.includes("Vegetarian"));
}
export function isCompleteRecipe(recipe){
 return !recipe?.indexOnly&&((Array.isArray(recipe?.ingredients)&&recipe.ingredients.length>0)||(Array.isArray(recipe?.groups)&&recipe.groups.some(g=>g.ingredients?.length)));
}

export const CATALOG_FILTERS=["Meal Prep Manual (300)","Ready to plan","All recipes","Level Up originals"];
export const CATALOG_FOOD_TYPES=["All foods","Chicken & turkey","Beef & pork","Fish & seafood","Vegetarian","Vegan","Pasta & noodles","Rice & grains","Salads & vegetables","Breakfast foods"];
const FOOD_TYPE_RULES=[
 ["Chicken & turkey", /\b(chicken|turkey|poultry)\b/i],
 ["Beef & pork", /\b(beef|steak|sirloin|ribeye|pork|bacon|ham|sausage)\b/i],
 ["Fish & seafood", /\b(salmon|tuna|cod|fish|shrimp|prawn|seafood|tilapia)\b/i],
 ["Vegetarian", /\b(tofu|lentil|chickpea|beans?|vegetarian|vegan|tempeh|falafel|halloumi)\b/i],
 ["Pasta & noodles", /\b(pasta|noodles?|spaghetti|penne|linguine|fettuccine|macaroni|ramen)\b/i],
 ["Rice & grains", /\b(rice|quinoa|couscous|bulgur|farro|barley|grain|risotto)\b/i],
 ["Salads & vegetables", /\b(salad|vegetables?|broccoli|spinach|greens|asparagus|cauliflower)\b/i],
 ["Breakfast foods", /\b(oats?|oatmeal|pancake|waffle|egg|omelette|breakfast|granola|yogurt|porridge)\b/i]
];
export function matchesFoodType(recipe, foodType="All foods"){
 if(foodType==="All foods")return true;
 if(foodType==="Vegetarian")return ["Vegetarian","Vegan"].includes(recipeStyle(recipe));
 if(foodType==="Vegan")return recipeStyle(recipe)==="Vegan";
 const phrase=[recipe.name, ...(recipe.ingredients||featuredIngredients(recipe)).map(item=>item.food||item.name||"")].join(" ");
 return FOOD_TYPE_RULES.some(([label, pattern])=>label===foodType&&pattern.test(phrase));
}
// Index-listed dishes are individually named; do not surface twenty invented
// size variants of the same generic concept as distinct recipes.
const normalizedRecipeName=name=>String(name||"").toLocaleLowerCase("en").replace(/[‘’]/g,"'").replace(/[^a-z0-9]+/g," ").trim();
function cloudSourceRecipe(recipe){
 const row=cloudRecipe(recipe.id);
 if(!row)return recipe;
 return {...recipe,
  ingredientStatements:Array.isArray(row.ingredients)&&row.ingredients.length?row.ingredients:recipe.ingredientStatements,
  sourceUrl:row.sourceUrl||recipe.sourceUrl,
  sourceYield:row.servings||recipe.sourceYield,
  publishedEstimate:row.publishedNutrition||recipe.publishedEstimate,
  sourcePreparation:Array.isArray(row.instructions)?row.instructions:[],
  image:row.image||recipe.image,
  cloudStatus:row.status,
  indexOnly:true,canSchedule:false};
}
function cloudAdaptation(row){
 if(!row?.canSchedule||!Array.isArray(row.ingredients)||!Array.isArray(row.instructions)||!row.instructions.length)return null;
 const servings=Math.max(1,Number(row.servings)||1);
 const ingredients=row.ingredients.filter(x=>Array.isArray(x)&&x.length>=3&&Number.isFinite(Number(x[1])))
  .map(x=>({food:String(x[0]),grams:Math.max(0,Number(x[1]))*servings,unit:String(x[2]||"g")}));
 if(!ingredients.length)return null;
 return {id:row.id,name:row.name,slot:row.slot,servings,cuisine:"Level Up adaptation",
  sourceName:row.sourceName||"Level Up",sourceUrl:row.sourceUrl||null,
  groups:[{label:"Ingredients",ingredients}],steps:row.instructions,
  publishedEstimate:row.publishedNutrition||null,image:row.image,
  storage:"Cool cooked food promptly; keep at or below 4°C and use within 2–3 days or freeze.",
  reviewStatus:"original-adaptation-awaiting-kitchen-and-nutrition-review",nutritionVerified:false,
  prepMinutes:null};
}
export function baseRecipes(){
 const originals=MEAL_CATALOG.filter(recipe=>!recipe.name.includes(" · "));
 const adaptations=cloudRecipes().filter(x=>x.canSchedule).map(cloudAdaptation).filter(Boolean);
 const promoted=new Map(adaptations.map(recipe=>[normalizedRecipeName(recipe.name),recipe]));
 // Existing detailed and source-reviewed featured recipes always take priority.
 for(const recipe of FEATURED_RECIPES)promoted.set(normalizedRecipeName(recipe.name),recipe);
 const seen=new Set();
 const source=MPM_CATALOG_300.map(raw=>{
  const recipe=cloudSourceRecipe(raw);
  return promoted.get(normalizedRecipeName(recipe.name))||recipe;
 });
 return [...source,...adaptations,...originals].filter(recipe=>{
  const key=normalizedRecipeName(recipe.name);
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
}

export function storedFavorites(){try{const ids=JSON.parse(localStorage.getItem(CATALOG_FAVORITES_KEY)||"[]");return Array.isArray(ids)?ids.filter(x=>typeof x==="string"):[]}catch{return []}}
export function toggleFavorite(id){
 const list=new Set(storedFavorites());if(list.has(id))list.delete(id);else list.add(id);
 try{localStorage.setItem(CATALOG_FAVORITES_KEY,JSON.stringify([...list]));return list.has(id)}catch{return false}
}
export function photoMarkup(recipe,cls=""){
 const photo=recipePhoto(recipe);
 const style="background-image:url("+photo.primary+");background-size:"+photo.backgroundSize+";background-position:"+photo.x+"% "+photo.y+"%;";
 const label=(photo.exactMatch?"AI-generated image for ":"Representative generated food illustration for ")+String(recipe?.name||"meal");
 return '<span class="mp-real-photo mp-ai-photo '+esc(cls)+'" style="'+esc(style)+'" role="img" aria-label="'+esc(label)+'"></span>';
}
function displaySlot(slot){return slot==="Meal 4"?"Snacks":slot}
export function matchesCatalog(recipe,{slot="All",filter="Complete recipes",search="",foodType="All foods",styles=selectedRecipeStyles()}={}){
 const selectedSlot=slot==="Snacks"?"Meal 4":slot;
 if(selectedSlot!=="All"&&recipe.slot!==selectedSlot)return false;
 if(!matchesRecipeStyles(recipe,styles))return false;
 if(filter==="Meal Prep Manual (300)"&&!MPM_CATALOG_300.some(item=>normalizedRecipeName(item.name)===normalizedRecipeName(recipe.name)))return false;
 if(filter==="Ready to plan"&&!isCompleteRecipe(recipe))return false;
 if(filter==="Level Up originals"&&MPM_CATALOG_300.some(item=>normalizedRecipeName(item.name)===normalizedRecipeName(recipe.name)))return false;
 if(!matchesFoodType(recipe,foodType))return false;
 const query=String(search).trim().toLowerCase();
 const words=[recipe.name,recipe.cuisine||"",recipe.diet||"",...(recipe.ingredients||featuredIngredients(recipe)).map(x=>x.food),...(recipe.ingredientStatements||[]).map(x=>x.description)].join(" ").toLowerCase();
 if(query&&!words.includes(query))return false;
 
 if(filter==="Needs my review"&&(!reviewIdForRecipe(recipe)||getReviewDecision(reviewIdForRecipe(recipe)).decision!=="unreviewed"))return false;
 if(filter==="Detailed recipes"&&recipe.indexOnly)return false;
 if(filter==="Source index only"&&!recipe.indexOnly)return false;
 return true;
}
export function recipeNutritionEstimate(recipe){
 if(!recipe||recipe.indexOnly)return null;
 if(recipe.publishedEstimate)return recipe.publishedEstimate;
 return Array.isArray(recipe.ingredients)&&recipe.ingredients.length?macrosForIngredients(recipe.ingredients):null;
}
export function recipeCard(recipe,favorite=false){
 // Match the detail page: published per-portion values for featured recipes,
 // ingredient-calculated estimates for complete original catalogue recipes.
 const estimated=recipeNutritionEstimate(recipe);
 const hasNutrition=estimated&&["calories","protein","carbs","fat"].every(k=>Number.isFinite(Number(estimated[k])));
 const info=recipe.indexOnly
   ?(recipe.ingredientStatements?.length?recipe.ingredientStatements.length+" ingredients · details pending":"Source recipe · details pending")
   :hasNutrition?Math.round(estimated.calories)+" kcal · P "+Math.round(estimated.protein)+"g · C "+Math.round(estimated.carbs)+"g · F "+Math.round(estimated.fat)+"g · "+recipe.prepMinutes+" min":"Nutrition estimate unavailable";
 return '<article class="mp-catalog-card"><button type="button" class="mp-catalog-open" data-mp-recipe="'+esc(recipe.id)+'" aria-label="See '+esc(recipe.name)+'">'+photoMarkup(recipe)+
 '<span class="mp-catalog-text"><strong>'+esc(recipe.name)+'</strong><small>'+info+'</small>'+'</span></button>'+
 '<button type="button" class="mp-catalog-heart'+(favorite?" active":"")+'" data-mp-favorite="'+esc(recipe.id)+'" aria-label="'+(favorite?"Remove":"Save")+' favorite">'+(favorite?"♥":"♡")+'</button></article>';
}
export function catalogMarkup({slot="All",filter="Meal Prep Manual (300)",search="",foodType="All foods",styles=selectedRecipeStyles(),favoritesOnly=false}={}){
 const favorites=new Set(storedFavorites());
 const recipes=baseRecipes().filter(recipe=>matchesCatalog(recipe,{slot,filter,search,foodType,styles})&&(!favoritesOnly||favorites.has(recipe.id)));

 return '<section class="lu-meal-planner mp-catalog mp-standalone">'+
 '<header class="mp-screen-header"><button type="button" data-mp-open="home" aria-label="Back to Meal Plan home">‹</button><h2>Recipes</h2><span></span></header>'+
 '<div class="mp-catalog-content"><div class="mp-catalog-intro"><h1>What are we cooking?</h1><p>Browse meals, save favourites, then choose when to eat them.</p></div>'+'<div class="mp-catalog-generate"><button type="button" data-mp-open="wizard" aria-label="Generate a personalized meal plan"><svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5L12 3Z"/><path d="M19 19v3M17.5 20.5h3"/></svg>Generate a plan</button></div>'+'<div class="mp-catalog-mode"><button type="button" data-mp-favorites-filter="all" class="'+(!favoritesOnly?'active':'')+'">All recipes</button><button type="button" data-mp-favorites-filter="favorites" class="'+(favoritesOnly?'active':'')+'">♥ Favourites ('+favorites.size+')</button></div>'+
 '<div class="mp-recipe-style-settings"><div><strong>Food preferences</strong><small>'+(!styles.length?'All food styles':styles.map(esc).join(' · '))+'</small></div><button type="button" data-mp-style-settings aria-expanded="false">Edit</button></div>'+
 '<div class="mp-style-options" data-mp-style-options hidden><p>Select the food styles you want to see. Select none to show all.</p>'+RECIPE_STYLE_CHOICES.map(([name,help])=>'<label><input type="checkbox" data-mp-style-choice value="'+esc(name)+'"'+(styles.includes(name)?' checked':'')+'><span><strong>'+esc(name)+'</strong><small>'+esc(help)+'</small></span></label>').join('')+'<button type="button" data-mp-style-done>Done</button></div>'+
 '<label class="mp-catalog-search"><span aria-hidden="true">⌕</span><input data-mp-search type="search" placeholder="Search meals or ingredients" value="'+esc(search)+'" aria-label="Search recipes"></label>'+
 '<div class="mp-catalog-chips" role="group" aria-label="Meal type">'+CATALOG_SLOTS.map(x=>'<button type="button" class="'+(slot===x?"active":"")+'" data-mp-slot="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div>'+
 '<div class="mp-food-type-filter"><div class="mp-filter-caption">FOOD TYPE</div><div class="mp-catalog-chips mp-food-type-chips" role="group" aria-label="Filter recipes by food type">'+CATALOG_FOOD_TYPES.map(x=>'<button type="button" class="'+(foodType===x?"active":"")+'" data-mp-food-type="'+esc(x)+'" aria-pressed="'+(foodType===x)+'">'+esc(x)+'</button>').join("")+'</div></div>'+
 '<div class="mp-catalog-chips mp-catalog-secondary" role="group" aria-label="Meal filters">'+CATALOG_FILTERS.map(x=>'<button type="button" class="'+(filter===x?"active":"")+'" data-mp-filter="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div>'+
 '<p class="mp-catalog-count">'+recipes.length+' recipes · '+MPM_CATALOG_300_SUMMARY.withSourceIngredients+' source ingredient lists available for review</p>'+
 '<div class="mp-catalog-grid">'+recipes.map(recipe=>recipeCard(recipe,favorites.has(recipe.id))).join("")+'</div>'+
 (recipes.length?"":'<p class="mp-catalog-empty">No recipes match these filters. Try another meal type or search.</p>')+
 '<p class="mp-disclaimer">The 300-dish collection contains named publisher recipes. Only entries marked Ready to plan have full Level Up ingredients and preparation details. Others are browseable and can be favourited, but cannot be scheduled or logged until reviewed.</p></div></section>';
}
const svgThumb=(down=false)=>'<svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'+(down?' style="transform:rotate(180deg)"':'')+'><path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm0 0 4.6-7.2a2.2 2.2 0 0 1 3.9 1.7L14 9h5.1a3 3 0 0 1 2.9 3.6l-1.4 6A3 3 0 0 1 17.7 21H7"/></svg>';
export function recipeRatingMarkup(recipe){
 const vote=getRecipeRating(recipe.id);
 return '<section class="mp-recipe-rate" aria-label="Rate recipe"><span>Rate</span><div class="mp-recipe-rate-actions">'+
 '<button type="button" class="'+(vote==="up"?'active':'')+'" data-mp-rate="'+esc(recipe.id)+'" data-mp-vote="up" aria-pressed="'+(vote==="up")+'" aria-label="Thumbs up for '+esc(recipe.name)+'">'+svgThumb()+'</button>'+
 '<button type="button" class="'+(vote==="down"?'active':'')+'" data-mp-rate="'+esc(recipe.id)+'" data-mp-vote="down" aria-pressed="'+(vote==="down")+'" aria-label="Thumbs down for '+esc(recipe.name)+'">'+svgThumb(true)+'</button></div></section>';
}
export function recipeMacroSummary(recipe){
 const m=recipeNutritionEstimate(recipe);
 if(!m)return '<p class="mp-disclaimer">Nutrition per portion has not been calculated.</p>';
 const values=[["Calories",Math.round(m.calories),"kcal"],["Protein",Math.round(m.protein),"g"],["Fat",Math.round(m.fat),"g"],["Carbs",Math.round(m.carbs),"g"]];
 return '<section class="mp-recipe-nutrition" aria-label="Estimated nutrition per portion"><h3>Nutrition per portion</h3><div class="mp-recipe-macro-grid">'+values.map(([label,value,unit])=>'<div class="'+(label==="Calories"?"mp-macro-calories":"")+'"><strong>'+value+(unit==="g"?"g":"")+'</strong><small>'+(label==="Calories"?"Cal":label)+'</small></div>').join("")+'</div><p class="mp-disclaimer">Estimated values per meal · ingredients below scale for the selected days.</p></section>';
}
function featuredRecipeDetail(recipe,scale=1){
 const m=recipe.publishedEstimate;
 const groups=recipe.groups.map(group=>'<section><h3>'+esc(group.label)+'</h3><ul>'+group.ingredients.map(item=>'<li><span>'+esc(item.food)+'</span><strong>'+esc(formatIngredientMeasure(item.food,(item.grams/Math.max(1,recipe.servings))*scale,item.unit))+'</strong></li>').join("")+'</ul></section>').join("");
 return '<section class="lu-meal-planner mp-recipe-detail mp-standalone"><header class="mp-screen-header"><button type="button" data-mp-open="catalog" aria-label="Back to catalog">‹</button><h2>Recipe</h2><span></span></header><div class="mp-recipe-content">'+photoMarkup(recipe,"mp-recipe-hero")+
 '<h1>'+esc(recipe.name)+'</h1><p>'+esc(recipe.cuisine)+' · Dinner · '+(Number.isFinite(Number(recipe.prepMinutes))&&Number(recipe.prepMinutes)>0?recipe.prepMinutes+' minutes':'Timing varies')+' · original batch '+recipe.servings+' servings</p><p class="mp-recipe-scale-note">Ingredient quantities for <strong>'+scale+' planned meal'+(scale===1?'':'s')+'</strong> (scaled from the original recipe).</p>'+
 recipeMacroSummary(recipe)+recipeRatingMarkup(recipe)+
 groups+(recipe.optionalSeasonings?.length?'<section><h3>Optional seasonings &amp; garnishes</h3><ul>'+recipe.optionalSeasonings.map(item=>'<li>'+esc(item)+'</li>').join("")+'</ul><p class="mp-disclaimer">Quantities have not been confirmed. These additions are not included in scaled groceries or nutrition until measured.</p></section>':'')+'<section><h3>Cooking directions</h3><ol>'+recipe.steps.map(s=>'<li>'+esc(s)+'</li>').join("")+'</ol></section>'+
 '<section><h3>Meal prep & storage</h3><p>'+esc(recipe.storage)+'</p></section>'+
 '<p class="mp-disclaimer">Nutrition and portions are estimates. Review ingredients for your own dietary needs.</p>'+
 '<button type="button" class="primary-btn mp-recipe-use" data-mp-schedule="'+esc(recipe.id)+'">Schedule this recipe</button>'+'<p class="mp-disclaimer">You can mark this meal eaten from My Week. Nutrition is a published estimate and has not been independently verified.</p></div></section>';
}
function sourceReviewDetail(recipe){
 const facts=Array.isArray(recipe.ingredientStatements)?recipe.ingredientStatements:[];
 const estimate=recipe.publishedEstimate;
 const nutrition=estimate?'<p class="mp-disclaimer">Publisher estimate per serving: '+(Number.isFinite(Number(estimate.calories))?Math.round(estimate.calories)+' kcal · ':'')+(Number.isFinite(Number(estimate.protein))?Math.round(estimate.protein)+'g protein · ':'')+'not independently verified.</p>':'<p class="mp-disclaimer">Nutrition data not yet available.</p>';
 const source=recipe.sourceUrl||recipe.sourceIndexUrl;
 return '<section class="lu-meal-planner mp-recipe-detail mp-standalone"><header class="mp-screen-header"><button type="button" data-mp-open="catalog" aria-label="Back to recipes">‹</button><h2>Recipe preview</h2><span></span></header><div class="mp-recipe-content">'+photoMarkup(recipe,"mp-recipe-hero")+
 '<h1>'+esc(recipe.name)+'</h1><p class="mp-disclaimer">The Meal Prep Manual · Source-indexed recipe · not yet ready for planning.</p>'+nutrition+
 (recipe.sourceYield?'<p>Publisher yield: '+esc(recipe.sourceYield)+' servings</p>':'')+
 (facts.length?'<section><h3>Published ingredients · review pending</h3><ul>'+facts.map(x=>'<li>'+esc(x.description)+'</li>').join("")+'</ul></section>':'<p>Full ingredients and seasoning quantities have not yet been imported.</p>')+
 '<section><h3>Preparation guidance</h3>'+(facts.length?'<p class="mp-disclaimer">Original Level Up guidance based on available ingredients; not the publisher’s cooking method or a kitchen-tested recipe.</p><ol>'+sourceRecipeSteps(recipe).map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol>':'<p>Cooking instructions are pending ingredient review.</p>')+'</section>'+
 '<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">View original recipe information</a>'+
 '<p class="mp-disclaimer">Save this dish to Favourites now. Scheduling, shopping calculations and marking eaten will be available after the recipe is completed and verified.</p></div></section>';
}
export function recipeDetailMarkup(recipe,hasPlan=false,scale=1){
 if(recipe?.indexOnly)return sourceReviewDetail(recipe);
 if(recipe?.groups)return featuredRecipeDetail(recipe,scale);
 const m=macrosForIngredients(recipe.ingredients);
 return '<section class="lu-meal-planner mp-recipe-detail mp-standalone">'+
 '<header class="mp-screen-header"><button type="button" data-mp-open="catalog" aria-label="Back to catalog">‹</button><h2>Recipe</h2><span></span></header>'+
 '<div class="mp-recipe-content">'+photoMarkup(recipe,"mp-recipe-hero")+
 '<h1>'+esc(recipe.name)+'</h1><p>'+esc(recipe.cuisine)+' · '+displaySlot(recipe.slot)+' · '+recipe.prepMinutes+' minutes</p><p class="mp-recipe-scale-note">Ingredient quantities for <strong>'+scale+' planned meal'+(scale===1?'':'s')+'</strong>.</p>'+
 recipeMacroSummary(recipe)+recipeRatingMarkup(recipe)+
 '<section><h3>Ingredients</h3><ul>'+recipe.ingredients.map(x=>'<li><span>'+esc(x.food)+'</span><strong>'+esc(formatIngredientMeasure(x.food,x.grams*scale,'g'))+'</strong></li>').join("")+'</ul></section>'+
 '<section><h3>Cooking instructions</h3><ol>'+recipeSteps(recipe).map(step=>'<li>'+esc(step)+'</li>').join("")+'</ol></section>'+
 '<button type="button" class="primary-btn mp-recipe-use" data-mp-schedule="'+esc(recipe.id)+'">Choose days &amp; meals</button>'+
 '<p class="mp-disclaimer">AI-generated food photographs are illustrative, and recipes and nutrition remain estimates.</p></div></section>';
}
