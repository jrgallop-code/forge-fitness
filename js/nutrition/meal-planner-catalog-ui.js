// Recipe cards use one distinct generated food photo per displayed recipe; duplicates are rejected by regression tests.
import {MEAL_CATALOG,macrosForIngredients} from "./meal-planner-data.js?v=3";
import {FEATURED_RECIPES,featuredIngredients} from "./meal-planner-featured-recipes.js?v=1";
import {MPM_INDEX_RECIPES} from "./meal-prep-manual-discovery.js?v=1";
import {REVIEW_RECORDS,REVIEW_IMPORT_META,reviewIdForRecipe,getReviewDecision,reviewSummary} from "./mpm-review-first-100.js?v=1";
import {recipePhoto} from "./meal-planner-photos.js?v=hires-first20-20261121";
import {recipeSteps} from "./meal-planner-media.js?v=2";
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
 const names=(recipe.ingredients||featuredIngredients(recipe)).map(x=>String(x.food||x.name||"")).join(" ");
 if(MEAT.test(names)||recipe.diet==="omnivore")return "Meat & poultry";
 if(SEAFOOD.test(names)||recipe.diet==="pescatarian")return "Fish & seafood";
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

export const CATALOG_FILTERS=["Complete recipes"];
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
export function baseRecipes(){
 // Show only distinct recipes with ingredient records; title-only entries
 // remain in the separate internal review dataset, not the food catalogue.
 const classics=MEAL_CATALOG.filter(recipe=>!recipe.name.includes(" · "));
 const seen=new Set();
 return [...FEATURED_RECIPES,...classics].filter(recipe=>{
  const key=recipe.name.toLocaleLowerCase("en");
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
 if(recipe?.indexOnly)return '<span class="mp-real-photo mp-awaiting-photo '+esc(cls)+'" role="img" aria-label="No recipe-specific photo approved" style="display:flex;align-items:center;justify-content:center;background:var(--surface-2,#384a43);color:var(--text-primary,#fff);padding:18px;text-align:center"><span aria-hidden="true" style="font-size:25px">▤</span></span>';
 const photo=recipePhoto(recipe);
 const style="background-image:url("+photo.primary+");background-size:"+photo.backgroundSize+";background-position:"+photo.x+"% "+photo.y+"%;";
 const label=(photo.exactMatch?"AI-generated image for ":"Illustrative AI image for ")+String(recipe?.name||"meal");
 return '<span class="mp-real-photo mp-ai-photo '+esc(cls)+'" style="'+esc(style)+'" role="img" aria-label="'+esc(label)+'"></span>';
}
function displaySlot(slot){return slot==="Meal 4"?"Snacks":slot}
export function matchesCatalog(recipe,{slot="All",filter="Complete recipes",search="",foodType="All foods",styles=selectedRecipeStyles()}={}){
 const selectedSlot=slot==="Snacks"?"Meal 4":slot;
 if(selectedSlot!=="All"&&recipe.slot!==selectedSlot)return false;
 if(!matchesRecipeStyles(recipe,styles))return false;
 if(filter==="Complete recipes"&&!isCompleteRecipe(recipe))return false;
 if(!matchesFoodType(recipe,foodType))return false;
 const query=String(search).trim().toLowerCase();
 const words=[recipe.name,recipe.cuisine||"",recipe.diet||"",...(recipe.ingredients||featuredIngredients(recipe)).map(x=>x.food)].join(" ").toLowerCase();
 if(query&&!words.includes(query))return false;
 if(filter==="Review first 100"&&!reviewIdForRecipe(recipe))return false;
 if(filter==="Needs my review"&&(!reviewIdForRecipe(recipe)||getReviewDecision(reviewIdForRecipe(recipe)).decision!=="unreviewed"))return false;
 if(filter==="Detailed recipes"&&recipe.indexOnly)return false;
 if(filter==="Source index only"&&!recipe.indexOnly)return false;
 return true;
}
export function recipeCard(recipe,favorite=false){
 const estimated=recipe.publishedEstimate;
 const info=recipe.indexOnly
   ?(recipe.ingredientStatements?.length?recipe.ingredientStatements.length+" source ingredients · review needed":"Source index · ingredient review pending")
   :Math.round(estimated?.calories||0)+" kcal · "+Math.round(estimated?.protein||0)+"g protein · "+recipe.prepMinutes+" min · estimated values";
 const reviewId=reviewIdForRecipe(recipe);
 const reviewDecision=reviewId?getReviewDecision(reviewId).decision:null;
 const reviewLabel=reviewDecision==="looks-good"?"Reviewed":reviewDecision==="needs-changes"?"Needs changes":reviewDecision?"Awaiting your review":"";
 return '<article class="mp-catalog-card"><button type="button" class="mp-catalog-open" data-mp-recipe="'+esc(recipe.id)+'" aria-label="See '+esc(recipe.name)+'">'+photoMarkup(recipe)+
 '<span class="mp-catalog-text"><strong>'+esc(recipe.name)+'</strong><small>'+info+'</small>'+(reviewLabel?'<small>Review: '+esc(reviewLabel)+'</small>':'')+'</span></button>'+
 '<button type="button" class="mp-catalog-heart'+(favorite?" active":"")+'" data-mp-favorite="'+esc(recipe.id)+'" aria-label="'+(favorite?"Remove":"Save")+' favorite">'+(favorite?"♥":"♡")+'</button></article>';
}
export function catalogMarkup({slot="All",filter="Complete recipes",search="",foodType="All foods",styles=selectedRecipeStyles(),favoritesOnly=false}={}){
 const favorites=new Set(storedFavorites());
 const recipes=baseRecipes().filter(recipe=>matchesCatalog(recipe,{slot,filter,search,foodType,styles})&&(!favoritesOnly||favorites.has(recipe.id)));

 return '<section class="lu-meal-planner mp-catalog mp-standalone">'+
 '<header class="mp-screen-header"><button type="button" data-mp-open="home" aria-label="Back to Meal Plan home">‹</button><h2>Recipes</h2><span></span></header>'+
 '<div class="mp-catalog-content"><div class="mp-catalog-intro"><h1>What are we cooking?</h1><p>Browse meals, save favourites, then choose when to eat them.</p></div>'+'<div class="mp-catalog-primary-actions"><button type="button" class="primary-btn" data-mp-open="calendar">My week</button><button type="button" data-mp-open="wizard">Generate a plan</button><button type="button" data-mp-open="groceries">Grocery list</button></div>'+'<div class="mp-catalog-mode"><button type="button" data-mp-favorites-filter="all" class="'+(!favoritesOnly?'active':'')+'">All recipes</button><button type="button" data-mp-favorites-filter="favorites" class="'+(favoritesOnly?'active':'')+'">♥ Favourites ('+favorites.size+')</button></div>'+
 '<div class="mp-recipe-style-settings"><div><strong>Food preferences</strong><small>'+(!styles.length?'All food styles':styles.map(esc).join(' · '))+'</small></div><button type="button" data-mp-style-settings aria-expanded="false">Edit</button></div>'+
 '<div class="mp-style-options" data-mp-style-options hidden><p>Select the food styles you want to see. Select none to show all.</p>'+RECIPE_STYLE_CHOICES.map(([name,help])=>'<label><input type="checkbox" data-mp-style-choice value="'+esc(name)+'"'+(styles.includes(name)?' checked':'')+'><span><strong>'+esc(name)+'</strong><small>'+esc(help)+'</small></span></label>').join('')+'<button type="button" data-mp-style-done>Done</button></div>'+
 '<label class="mp-catalog-search"><span aria-hidden="true">⌕</span><input data-mp-search type="search" placeholder="Search meals or ingredients" value="'+esc(search)+'" aria-label="Search recipes"></label>'+
 '<div class="mp-catalog-chips" role="group" aria-label="Meal type">'+CATALOG_SLOTS.map(x=>'<button type="button" class="'+(slot===x?"active":"")+'" data-mp-slot="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div>'+
 '<div class="mp-food-type-filter"><div class="mp-filter-caption">FOOD TYPE</div><div class="mp-catalog-chips mp-food-type-chips" role="group" aria-label="Filter recipes by food type">'+CATALOG_FOOD_TYPES.map(x=>'<button type="button" class="'+(foodType===x?"active":"")+'" data-mp-food-type="'+esc(x)+'" aria-pressed="'+(foodType===x)+'">'+esc(x)+'</button>').join("")+'</div></div>'+
 '<div class="mp-catalog-chips mp-catalog-secondary" role="group" aria-label="Meal filters">'+CATALOG_FILTERS.map(x=>'<button type="button" class="'+(filter===x?"active":"")+'" data-mp-filter="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div>'+
 '<p class="mp-catalog-count">'+recipes.length+' recipes</p>'+
 '<div class="mp-first100-progress"><strong>First 100 review</strong><span>'+reviewSummary().reviewed+' reviewed · '+reviewSummary().needsChanges+' need changes · '+reviewSummary().notReviewed+' remaining</span><small>'+reviewSummary().ingredientLists+' ingredient lists imported from publisher schema · incomplete recipes remain unschedulable</small><button type="button" class="mp-review-export" data-mp-review-export>Copy my review notes</button></div>'+'<div class="mp-catalog-grid">'+recipes.map(recipe=>recipeCard(recipe,favorites.has(recipe.id))).join("")+'</div>'+
 (recipes.length?"":'<p class="mp-catalog-empty">No recipes match these filters. Try another meal type or search.</p>')+
 '<p class="mp-disclaimer">Nutrition values are estimates. Complete recipes include ingredients and preparation steps.</p></div></section>';
}
function featuredRecipeDetail(recipe,scale=1){
 const m=recipe.publishedEstimate;
 const groups=recipe.groups.map(group=>'<section><h3>'+esc(group.label)+'</h3><ul>'+group.ingredients.map(item=>'<li><span>'+esc(item.food)+'</span><strong>'+esc(formatIngredientMeasure(item.food,(item.grams/Math.max(1,recipe.servings))*scale,item.unit))+'</strong></li>').join("")+'</ul></section>').join("");
 return '<section class="lu-meal-planner mp-recipe-detail mp-standalone"><header class="mp-screen-header"><button type="button" data-mp-open="catalog" aria-label="Back to catalog">‹</button><h2>Recipe</h2><span></span></header><div class="mp-recipe-content">'+photoMarkup(recipe,"mp-recipe-hero")+
 '<h1>'+esc(recipe.name)+'</h1><p>'+esc(recipe.cuisine)+' · Dinner · '+recipe.prepMinutes+' minutes · original batch '+recipe.servings+' servings</p><p class="mp-recipe-scale-note">Ingredient quantities for <strong>'+scale+' planned meal'+(scale===1?'':'s')+'</strong> (scaled from the original recipe).</p>'+
 '<p class="mp-disclaimer"><strong>Estimated nutrition, not independently verified.</strong> Per serving: '+m.calories+' kcal · '+m.protein+'g protein · '+m.carbs+'g carbs · '+m.fat+'g fat.</p>'+
 groups+(recipe.optionalSeasonings?.length?'<section><h3>Optional seasonings &amp; garnishes</h3><ul>'+recipe.optionalSeasonings.map(item=>'<li>'+esc(item)+'</li>').join("")+'</ul><p class="mp-disclaimer">Quantities have not been confirmed. These additions are not included in scaled groceries or nutrition until measured.</p></section>':'')+'<section><h3>Cooking directions</h3><ol>'+recipe.steps.map(s=>'<li>'+esc(s)+'</li>').join("")+'</ol></section>'+
 '<section><h3>Meal prep & storage</h3><p>'+esc(recipe.storage)+'</p></section>'+
 '<p class="mp-disclaimer">Nutrition and portions are estimates. Review ingredients for your own dietary needs.</p>'+
 '<button type="button" class="primary-btn mp-recipe-use" data-mp-schedule="'+esc(recipe.id)+'">Schedule this recipe</button>'+reviewControlsMarkup(recipe)+reviewNavigationMarkup(recipe)+'<p class="mp-disclaimer">Scheduling is available in preview, but this recipe cannot be logged as consumed until food mapping and nutrition review are complete.</p></div></section>';
}
function reviewNavigationMarkup(recipe){
 const currentId=reviewIdForRecipe(recipe);
 if(!currentId)return "";
 const index=REVIEW_RECORDS.findIndex(x=>x.id===currentId);
 const ids=baseRecipes();
 const target=offset=>{
   const item=REVIEW_RECORDS[index+offset];
   return item?ids.find(r=>reviewIdForRecipe(r)===item.id)?.id:null;
 };
 const previous=target(-1),next=target(1);
 return '<nav class="mp-review-navigation"><button type="button" data-mp-review-nav="'+esc(previous||"")+'" '+(!previous?'disabled':'')+'>← Previous</button><span>'+(index+1)+' of '+REVIEW_RECORDS.length+'</span><button type="button" data-mp-review-nav="'+esc(next||"")+'" '+(!next?'disabled':'')+'>Next →</button></nav>';
}
function reviewControlsMarkup(recipe){
 const id=reviewIdForRecipe(recipe);
 if(!id)return "";
 const current=getReviewDecision(id);
 return '<section class="mp-review-section"><h3>Review this recipe</h3><p class="mp-disclaimer">This records your feedback only. It does not certify nutrition, allergens, food safety or use rights.</p>'+
 '<div class="mp-review-actions"><button type="button" data-mp-review-decision="looks-good" data-mp-review-id="'+esc(id)+'" class="'+(current.decision==="looks-good"?"active":"")+'">✓ Looks good</button>'+
 '<button type="button" data-mp-review-decision="needs-changes" data-mp-review-id="'+esc(id)+'" class="'+(current.decision==="needs-changes"?"active":"")+'">Needs changes</button>'+
 '<button type="button" data-mp-review-decision="unreviewed" data-mp-review-id="'+esc(id)+'" class="'+(current.decision==="unreviewed"?"active":"")+'">Reset review</button></div>'+
 '<label for="mp-review-notes">Review notes</label><textarea id="mp-review-notes" data-mp-review-notes="'+esc(id)+'" rows="4" maxlength="2000" placeholder="Missing spice, incorrect portion, cooking question, or preferred change...">'+esc(current.notes||"")+'</textarea><p class="mp-disclaimer">Notes and decisions currently save on this device only.</p></section>';
}
function sourceReviewDetail(recipe){
 return '<section class="lu-meal-planner mp-recipe-detail mp-standalone">'+
 '<header class="mp-screen-header"><button type="button" data-mp-open="catalog" aria-label="Back to catalog">‹</button><h2>Recipe unavailable</h2><span></span></header>'+
 '<div class="mp-recipe-content"><h1>'+esc(recipe.name)+'</h1><p>This entry is still missing complete ingredients or preparation steps. It cannot be scheduled as a finished recipe.</p></div></section>';
}
export function recipeDetailMarkup(recipe,hasPlan=false,scale=1){
 if(recipe?.indexOnly)return sourceReviewDetail(recipe);
 if(recipe?.groups)return featuredRecipeDetail(recipe,scale);
 const m=macrosForIngredients(recipe.ingredients);
 return '<section class="lu-meal-planner mp-recipe-detail mp-standalone">'+
 '<header class="mp-screen-header"><button type="button" data-mp-open="catalog" aria-label="Back to catalog">‹</button><h2>Recipe</h2><span></span></header>'+
 '<div class="mp-recipe-content">'+photoMarkup(recipe,"mp-recipe-hero")+
 '<h1>'+esc(recipe.name)+'</h1><p>'+esc(recipe.cuisine)+' · '+displaySlot(recipe.slot)+' · '+recipe.prepMinutes+' minutes</p><p class="mp-recipe-scale-note">Ingredient quantities for <strong>'+scale+' planned meal'+(scale===1?'':'s')+'</strong>.</p>'+
 '<div class="mp-recipe-macro-grid">'+[["Calories",Math.round(m.calories)],["Protein",Math.round(m.protein)+"g"],["Carbs",Math.round(m.carbs)+"g"],["Fat",Math.round(m.fat)+"g"]].map(([label,value])=>'<div><strong>'+esc(value)+'</strong><small>'+label+'</small></div>').join("")+'</div>'+
 '<section><h3>Ingredients</h3><ul>'+recipe.ingredients.map(x=>'<li><span>'+esc(x.food)+'</span><strong>'+esc(formatIngredientMeasure(x.food,x.grams*scale,'g'))+'</strong></li>').join("")+'</ul></section>'+
 '<section><h3>Cooking instructions</h3><ol>'+recipeSteps(recipe).map(step=>'<li>'+esc(step)+'</li>').join("")+'</ol></section>'+
 '<button type="button" class="primary-btn mp-recipe-use" data-mp-schedule="'+esc(recipe.id)+'">Choose days &amp; meals</button>'+
 '<p class="mp-disclaimer">AI-generated food photographs are illustrative, and recipes and nutrition remain estimates.</p></div></section>';
}
