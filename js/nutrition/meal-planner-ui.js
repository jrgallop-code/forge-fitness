import {dietRecipeBaseIndex} from "./meal-planner-photos.js?v=2";
import {mealPlannerHomeMarkup} from "./meal-planner-home.js?v=approved-svg-dashboard-1";
import {formatIngredientMeasure} from "./meal-planner-measurements.js?v=kitchen-units-20261121";
import {FEATURED_RECIPES,featuredIngredients} from "./meal-planner-featured-recipes.js?v=1";
import {getReviewDecision,saveReviewDecision,readReviewDecisions,reviewSummary} from "./mpm-review-first-100.js?v=1";
import {nextMonday,dateForOffset,scheduleRecipe,batchPortionCount} from "./meal-planner-manual.js?v=1";
import {photoMarkup,catalogMarkup,recipeDetailMarkup,toggleFavorite,baseRecipes,matchesCatalog,storedFavorites,selectedRecipeStyles,saveRecipeStyles} from "./meal-planner-catalog-ui.js?v=hires-kitchen-units-20261121";
import {ingredientIllustration,dietIllustration,recipeIllustration} from "./meal-planner-food-art.js?v=2";
import {MEAL_PLANNER_HERO} from "./meal-planner-hero.js?v=1";
import {GENERATED_MEAL_ATLAS} from "./meal-planner-art.js?v=1";
import {generateGoalAwarePlan,refitRecipeForSlot} from "./meal-planner-planning.js?v=3";
import {currentMealPlannerGoal,isWeightLossGoal,allocateMealCalories,fullnessEstimate} from "./meal-planner-goals.js?v=3";
import {mealPhoto,ingredientPhoto,localFoodFallback,recipeSteps} from "./meal-planner-media.js?v=2";
import {getFoodEmoji} from "./food-emoji.js?v=food-artwork-polish-1";
import {hasConsumedMeal,markPlannedMealConsumed,undoPlannedMealConsumed} from "./meal-planner-consumption.js?v=1";
import {MEAL_CATALOG,MEAL_SLOTS,generatePlan,eligibleMeals,macrosForIngredients,groceryList,replacePlannedMeal,editPlannedIngredient,PLANNER_STORAGE_KEY} from "./meal-planner-data.js?v=1";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)||"null")}catch{return null}};
const write=plan=>{try{localStorage.setItem(PLANNER_STORAGE_KEY,JSON.stringify(plan));return true}catch{return false}};
const defaultPrefs={goalMode:"existing",calorieCoverage:"",goal:"existing",diet:"balanced",coverage:"all",meals:MEAL_SLOTS,allergies:[],dislikes:"",cuisines:["Mediterranean","North American","Mexican"],cooking:"30",prep:"yes",repeats:"3",household:"1",budget:"flexible",priority:"balanced",days:"7"};
const selectable=(values,selected)=>values.map(x=>'<option value="'+esc(x)+'"'+(selected===x?' selected':'')+'>'+esc(x)+'</option>').join("");
const DIET_CHOICES=[["balanced","Balanced","Flexible healthy eating",0],["high-protein","High protein","Protein first",6],["whole-food","Whole foods","Minimally processed choices",4],["mediterranean","Mediterranean","Plant-forward and seafood",12],["vegetarian","Vegetarian","No meat or fish",1],["vegan","Vegan","Plant only",2],["pescatarian","Pescatarian","Fish and plants",13],["flexitarian","Flexitarian","Mostly plants",8],["low-carb","Lower carb","Fewer starches",7]];
const CUISINES=["North American","Mediterranean","Mexican","Asian","Italian","Chinese","Japanese","Thai","Indian"];
const PRODUCE=["Apple","Blueberries","Banana","Pineapple","Broccoli","Spinach","Zucchini","Bell pepper","Tomato","Cucumber","Avocado","Sweet potato"];
const ALLERGENS=["milk","eggs","fish","shellfish","peanuts","tree nuts","soy","gluten","wheat","sesame"];
const photo=(url,label,fallback=0)=>{
 if(String(url).startsWith("generated-meal:")){
  const index=Math.max(0,Math.min(39,Number(url.slice(15))||0)),column=index%8,row=Math.floor(index/8);
  return '<span class="mp-photo mp-generated-art" role="img" aria-label="'+esc(label)+'" style="background-position:'+(column/10*100)+'% '+(row/4*100)+'%"></span>';
 }
 return '<span class="mp-photo" style="background-image:url('+localFoodFallback(fallback)+')"><img loading="lazy" src="'+esc(url)+'" data-fallback="'+localFoodFallback(fallback)+'" alt="'+esc(label)+'"></span>';
};
const choose=(name,value,label,checked)=>'<label class="mp-choice"><input type="radio" name="'+name+'" value="'+esc(value)+'"'+(checked?' checked':'')+'><span>'+esc(label)+'</span></label>';
const pick=(name,value,label,checked)=>'<label class="mp-pill"><input type="checkbox" name="'+name+'" value="'+esc(value)+'"'+(checked?' checked':'')+'><span>'+esc(label)+'</span></label>';
function prefsMarkup(p){
 const appGoal=currentMealPlannerGoal();
 const storedGoal=p.goalMode==="custom"?p.goalType:appGoal.goalId;
 const storedCalories=p.goalMode==="custom"?Number(p.dailyCalories):appGoal.dailyCalories;
 const dish=(n)=>mealPhoto({id:"lu-meal-"+String(n*20+1).padStart(3,"0")});
 const styles=DIET_CHOICES.map(([id,name,desc,index])=>'<label class="mp-photo-choice"><input type="radio" name="diet" value="'+esc(id)+'"'+((p.preferredDiet||p.diet)===id?' checked':'')+'>'+photoMarkup(MEAL_CATALOG[dietRecipeBaseIndex(id)*20])+'<span class="mp-photo-copy"><strong>'+esc(name)+'</strong><small>'+esc(desc)+'</small></span><span class="mp-choice-tick">✓</span></label>').join("");
 const cuisine=CUISINES.map(x=>pick("cuisine",x,x,(p.preferredCuisines||p.cuisines||[]).includes(x))).join("");
 const produce=PRODUCE.map((x,i)=>'<label class="mp-photo-choice mp-food-choice"><input type="checkbox" name="liked-food" value="'+esc(x)+'"'+((p.likes||[]).includes(x)?' checked':'')+'>'+ingredientIllustration(x)+'<span class="mp-photo-copy"><strong>'+esc(x)+'</strong></span><span class="mp-choice-tick">♥</span></label>').join("");
 const ratings=MEAL_CATALOG.filter((_,i)=>i%20===0).slice(0,16).map((x,i)=>'<label class="mp-photo-choice mp-food-choice"><input type="checkbox" name="liked-recipe" value="'+esc(x.id)+'"'+((p.likedRecipes||[]).includes(x.id)?' checked':'')+'>'+photoMarkup(x)+'<span class="mp-photo-copy"><strong>'+esc(x.name)+'</strong><small>≈ '+Math.round(macrosForIngredients(x.ingredients).calories)+' kcal</small></span><span class="mp-choice-tick">♥</span></label>').join("");
 return '<form data-meal-planner-options class="mp-wizard">'+
 '<div class="mp-step-progress"><span data-mp-progress></span></div><p class="mp-step-counter" data-mp-step-label>Step 1 of 10</p>'+
 '<section class="mp-step" data-mp-step="0"><span class="eyebrow">PERSONALIZED NUTRITION</span><h3>Your weight and calorie goals</h3><p>Start with the exact calorie target already used by Level Up, or customize this meal plan only.</p><div class="mp-choice-list">'+
 choose("goalMode","existing","Use current Level Up goal"+(appGoal.dailyCalories?" · "+appGoal.dailyCalories+" kcal/day":" · no calorie target found"),p.goalMode!=="custom")+
 choose("goalMode","custom","Set a different meal-planning goal",p.goalMode==="custom")+'</div>'+
 '<div class="mp-goal-box"><label>Planning goal <select name="goalType">'+
 [["cut_gentle","Lose weight (gentle)"],["cut_moderate","Lose weight (moderate)"],["maintain","Maintain weight"],["bulk_conservative","Lean bulk"],["bulk_aggressive","Gain weight"]].map(([id,label])=>'<option value="'+id+'"'+(storedGoal===id?' selected':'')+'>'+label+'</option>').join("")+
 '</select></label><label>Daily calorie target <input type="number" name="dailyCalories" min="800" max="10000" step="25" placeholder="Set daily calories" value="'+esc(storedCalories||"")+'"></label><p class="mp-disclaimer">Your main Level Up nutrition goals will not change.</p></div>'+
 '<label class="mp-input-label">Percent of daily calories assigned to planned meals <input type="range" name="calorieCoverage" min="20" max="100" step="5" value="'+esc(p.calorieCoverage||"100")+'"><strong data-mp-coverage-preview>'+(p.calorieCoverage||100)+'%</strong></label>'+
 '<p class="mp-disclaimer">Unplanned calories are reserved for other food. You can adjust this again after choosing your meals.</p>'+
 (appGoal.dailyCalories?'<p class="mp-disclaimer">Current app target: '+appGoal.dailyCalories+' kcal · Protein '+(appGoal.proteinGrams??"—")+' g · Carbs '+(appGoal.carbGrams??"—")+' g · Fat '+(appGoal.fatGrams??"—")+' g</p>':'<p class="mp-disclaimer">No current app calorie target could be read. Enter a custom target to generate a calibrated plan.</p>')+'</section>'+
 '<section class="mp-step" data-mp-step="1"><h3>What is your eating style?</h3><p>Choose the approach that fits you best.</p><div class="mp-photo-grid">'+styles+'</div></section>'+
 '<section class="mp-step" data-mp-step="2" hidden><h3>How many meals do you want planned?</h3><p>Set up your weekly calendar.</p><div class="mp-choice-list">'+choose("coverage","all","All meals every day",p.coverage==="all")+choose("coverage","lunch-dinner","Lunch and dinner",p.coverage==="lunch-dinner")+choose("coverage","dinner","Dinners only",p.coverage==="dinner")+choose("coverage","custom","Custom",p.coverage==="custom")+'</div><div class="mp-pills">'+MEAL_SLOTS.map(s=>pick("slot",s,s,(p.meals||MEAL_SLOTS).includes(s))).join("")+'</div><div class="mp-fields"><label>Days <select name="days">'+selectable(["3","5","7","14"],String(p.days||"7"))+'</select></label><label>Leftovers <select name="leftovers">'+selectable(["Frequently","Sometimes","Not often"],p.leftovers||"Sometimes")+'</select></label></div></section>'+
 '<section class="mp-step" data-mp-step="3" hidden><h3>What is your cooking style?</h3><p>We will fit your schedule and skill level.</p><div class="mp-choice-list">'+["Novice","Basic","Intermediate","Advanced"].map(s=>choose("skill",s,s,(p.skill||"Basic")===s)).join("")+'</div><div class="mp-fields"><label>Maximum cooking time <select name="cooking">'+selectable(["15","20","30","45","60"],String(p.cooking||"30"))+'</select></label><label>Grocery shopping <select name="grocery">'+selectable(["In-store","Pickup","Delivery","Flexible"],p.grocery||"In-store")+'</select></label><label>Meal prep <select name="prep">'+selectable(["yes","no"],p.prep||"yes")+'</select></label></div></section>'+
 '<section class="mp-step" data-mp-step="4" hidden><h3>Which cuisines sound good?</h3><p>Pick your favourites. You can choose more than one.</p><div class="mp-pills">'+cuisine+'</div></section>'+
 '<section class="mp-step" data-mp-step="5" hidden><h3>Foods you enjoy</h3><p>Choose your favourites below.</p><div class="mp-photo-grid mp-produce-grid">'+produce+'</div><label class="mp-input-label">Anything you dislike? <input name="dislikes" placeholder="Optional · e.g. mushrooms" value="'+esc(p.dislikes||"")+'"></label></section>'+
 '<section class="mp-step" data-mp-step="6" hidden><h3>Allergies & serving sizes</h3><p>Plan for yourself or the whole household.</p><h4>Allergies or restrictions</h4><div class="mp-pills">'+ALLERGENS.map(s=>pick("allergy",s,s,(p.allergies||[]).includes(s))).join("")+'</div><p class="mp-disclaimer">Check all product labels. Recipes cannot guarantee an allergen-free kitchen.</p><div class="mp-fields"><label>People eating <select name="household">'+selectable(["1","2","3","4","5","6"],String(p.household||"1"))+'</select></label><label>Budget <select name="budget">'+selectable(["Flexible","Moderate","Budget-conscious"],p.budget||"Flexible")+'</select></label></div><h4>Servings to prepare</h4><div class="mp-fields">'+MEAL_SLOTS.map(slot=>'<label>'+esc(slot)+' <select name="servings-'+esc(slot)+'">'+selectable(["1","2","3","4","5","6"],String(p.mealSizes?.[slot]||p.household||"1"))+'</select></label>').join("")+'</div></section>'+
 '<section class="mp-step" data-mp-step="7" hidden><h3>What matters most?</h3><p>Balance taste, convenience and nutrition.</p>'+["Great taste","Quick cooking","Affordable ingredients","More variety","Higher protein"].map((x,i)=>'<label class="mp-slider">'+esc(x)+'<input name="priority-'+i+'" type="range" min="1" max="5" value="'+Number(p.priorities?.[i]||3)+'"></label>').join("")+'</section>'+
 '<section class="mp-step" data-mp-step="8" hidden><h3>Pick recipes you like</h3><p>Choose a few ideas to personalize your week.</p><div class="mp-photo-grid">'+ratings+'</div><p class="mp-disclaimer">Nutrition values are estimates.</p></section>'+
 '<section class="mp-step" data-mp-step="9" hidden><h3>Ready for your meal plan?</h3><p>Review the essentials before generating.</p><div class="mp-review" data-mp-review></div><p class="mp-disclaimer">Planned food is not logged as eaten. Meals can be swapped and portions edited later.</p></section>'+
 '<footer class="mp-wizard-footer"><button type="button" data-mp-back hidden>Back</button><button type="button" class="primary-btn" data-mp-next>Next</button><button type="submit" class="primary-btn" data-mp-generate hidden>Generate my meal plan</button></footer></form>';
}
let wizardStep=0;
function showWizardStep(root,next){
 const form=root.querySelector("[data-meal-planner-options]");if(!form)return;
 wizardStep=Math.max(0,Math.min(9,next));
 form.querySelectorAll("[data-mp-step]").forEach(section=>section.hidden=Number(section.dataset.mpStep)!==wizardStep);
 form.querySelector("[data-mp-step-label]").textContent="Step "+(wizardStep+1)+" of 10";
 form.querySelector("[data-mp-progress]").style.width=((wizardStep+1)/7*100)+"%";
 form.querySelector("[data-mp-back]").hidden=wizardStep===0;
 form.querySelector("[data-mp-next]").hidden=wizardStep===9;
 form.querySelector("[data-mp-generate]").hidden=wizardStep!==9;
 if(wizardStep===9){
  const fd=new FormData(form);
  const app=currentMealPlannerGoal(),mode=String(fd.get("goalMode")||"existing");
  const daily=mode==="custom"?Number(fd.get("dailyCalories")):Number(app.dailyCalories);
  const selected=String(fd.get("coverage")||"all");
  const meals=selected==="all"?MEAL_SLOTS:selected==="lunch-dinner"?["Lunch","Dinner"]:selected==="dinner"?["Dinner"]:fd.getAll("slot");
  const coverage=Number(fd.get("calorieCoverage")||100);
  const allocated=allocateMealCalories({dailyCalories:daily,meals,calorieCoverage:coverage});
  const diet=String(fd.get("diet")||"balanced");
  const summary=[
   ["Goal",mode==="existing"?"Current Level Up goal":String(fd.get("goalType")||"Custom")],
   ["Calories",Number.isFinite(daily)&&daily>0?Math.round(daily).toLocaleString()+" kcal/day":"Choose a target"],
   ["Planned",allocated.plannedCalories.toLocaleString()+" kcal"],
   ["Meals",meals.join(", ")],
   ["Eating style",DIET_CHOICES.find(x=>x[0]===diet)?.[1]||"Balanced"],
   ["Cooking",String(fd.get("cooking")||"30")+" min or less"],
   ["Cuisines",fd.getAll("cuisine").join(", ")||"Any"]
  ];
  const box=form.querySelector("[data-mp-review]");
  if(box)box.innerHTML=summary.map(([label,value])=>'<div><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join("");
 }
 const scroller=root.querySelector(".mp-standalone");if(scroller)scroller.scrollTop=0;

}


let plannerScreen="home",catalogSlot="All",catalogFilter="Complete recipes",catalogFoodType="All foods",catalogSearch="",catalogRecipeId="",favoritesOnly=false;
let scheduleStart=nextMonday(),scheduleOffsets=[0,1,2],scheduleSlots=["Dinner"],schedulePortions=1;
const groceryCategories=[
 ["Produce",/apple|banana|berries|pineapple|spinach|broccoli|pepper|tomato|cucumber|zucchini|avocado|potato|mushrooms|lime|ginger|garlic|salsa/],
 ["Meat, fish & protein",/chicken|turkey|beef|salmon|tuna|cod|shrimp|tofu|egg/],
 ["Dairy & alternatives",/yogurt|milk|cheese|feta/],
 ["Pantry, grains & legumes",/oats|bread|rice|quinoa|pasta|tortilla|lentils|beans|chickpeas|oil|almonds|nuts|seeds|soy sauce|curry|hummus/]
];
function groupedGrocery(plan){
 const groups=new Map(groceryCategories.map(([label])=>[label,[]]));
 groups.set("Other",[]);
 for(const item of groceryList(plan)){
  const group=groceryCategories.find(([label,regex])=>regex.test(item.food))?.[0]||"Other";
  groups.get(group).push(item);
 }
 return [...groups].filter(([,rows])=>rows.length);
}
function groceryPlainText(plan){
 const lines=["LEVEL UP · GROCERY LIST",plan.startDate+" · "+new Set(plan.entries.map(e=>e.date)).size+" days",""];
 for(const [section,items] of groupedGrocery(plan)){
  lines.push(section);
  for(const item of items)lines.push("• "+item.food+" — "+formatIngredientMeasure(item.food,item.grams,item.unit||"g"));
  lines.push("");
 }
 lines.push("Quantities are estimated. Check servings, labels and pantry stock.");
 return lines.join("\n");
}
function screenHeader(title,back,action=""){
 return '<header class="mp-screen-header"><button type="button" data-mp-open="'+back+'" aria-label="Go back">‹</button><h2>'+esc(title)+'</h2><span>'+action+'</span></header>';
}
function loadingMarkup(){
 return '<section class="lu-meal-planner mp-loading mp-standalone" role="status" aria-live="polite">'+
 '<div class="mp-loading-inner"><span class="eyebrow">LEVEL UP MEAL PLANNER</span>'+
 '<div class="mp-loading-orbit" aria-hidden="true"><span class="mp-loading-apple">🍎</span></div>'+
 '<h1>Plating your week</h1><p>Building a plan around your goals and favorite foods.</p>'+
 '<div class="mp-loading-stage"><span>Matching meals to your calorie target</span>'+
 '<span>Balancing portions and protein</span>'+
 '<span>Preparing your grocery list</span></div>'+
 '<div class="mp-loading-track"><span></span></div></div></section>';
}
function landingMarkup(saved){
 const appGoal=currentMealPlannerGoal();
 return '<section class="lu-meal-planner mp-landing mp-standalone">'+
 '<button class="mp-landing-close" type="button" data-mp-exit aria-label="Close meal planner">✕</button><div class="mp-landing-image"></div><div class="mp-landing-copy"><span class="eyebrow">LEVEL UP · PERSONALIZED NUTRITION</span>'+
 '<h1>Plan meals that<br>fit your goals.</h1><p>Delicious recipes, smart portions, and a weekly plan built for your nutrition targets.</p>'+
 (appGoal.dailyCalories?'<span class="mp-goal-chip">Your current target: '+appGoal.dailyCalories+' kcal/day</span>':'')+'</div>'+
 '<div class="mp-landing-actions">'+(saved?'<button type="button" class="primary-btn" data-mp-open="calendar">View my plan</button><button type="button" class="mp-landing-secondary" data-mp-open="wizard">Edit preferences</button>':
 '<button type="button" class="primary-btn" data-mp-open="wizard">Get started</button>')+
 '<button type="button" class="mp-landing-secondary" data-mp-open="catalog">Browse recipes</button>'+
 '</div></section>';
}
const SCHEDULE_DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function scheduleMarkup(recipeId){
 const recipe=[...FEATURED_RECIPES,...MEAL_CATALOG].find(x=>x.id===recipeId);
 if(!recipe)return '<section class="lu-meal-planner">'+screenHeader("Recipe not found","catalog")+'</section>';
 const batch=scheduleOffsets.length*scheduleSlots.length*schedulePortions;
 const dates=scheduleOffsets.map(i=>dateForOffset(scheduleStart,i));
 const source=Boolean(recipe.groups);
 return '<section class="lu-meal-planner mp-standalone mp-scheduler">'+screenHeader("Schedule recipe","recipe")+
 '<div class="mp-schedule-body"><div class="mp-schedule-preview">'+photoMarkup(recipe)+
 '<div><span class="eyebrow">BATCH PREP</span><h2>'+esc(recipe.name)+'</h2><p class="mp-disclaimer">'+(source?'Source-backed recipe; nutrition awaits independent review':'Recipe idea; nutrition and cooking steps are estimates')+'</p></div></div>'+
 '<div class="mp-schedule-panel"><h3>When will you eat it?</h3><label class="mp-schedule-label">Week starting <input type="date" data-mp-schedule-start value="'+esc(scheduleStart)+'"></label>'+
 '<div class="mp-schedule-weekdays" role="group" aria-label="Select weekdays">'+SCHEDULE_DAYS.map((d,i)=>'<button type="button" data-mp-schedule-day="'+i+'" aria-pressed="'+scheduleOffsets.includes(i)+'" class="'+(scheduleOffsets.includes(i)?'active':'')+'">'+d+'</button>').join("")+'</div>'+
 '<h3>Choose meal slots</h3><div class="mp-schedule-slots">'+MEAL_SLOTS.map(slot=>'<label><input type="checkbox" data-mp-schedule-slot="'+esc(slot)+'" '+(scheduleSlots.includes(slot)?'checked':'')+'><span>'+esc(slot==="Meal 4"?"Snacks / Meal 4":slot)+'</span></label>').join("")+'</div>'+
 '<label class="mp-schedule-label">Portions per selected meal <input type="number" min="1" max="12" value="'+schedulePortions+'" data-mp-schedule-portions></label>'+
 '<div class="mp-schedule-summary"><strong>Prepare '+batch+' portion'+(batch===1?'':'s')+'</strong><small>'+scheduleOffsets.length+' day'+(scheduleOffsets.length===1?'':'s')+' · '+scheduleSlots.length+' meal slot'+(scheduleSlots.length===1?'':'s')+'</small>'+
 '<small>Prepare on '+(dates.length?esc(new Date(dates[0]+'T12:00:00').toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})):'a selected day')+'</small></div>'+
 '<p class="mp-disclaimer">Ingredients, oils and seasonings scale with portions. Planned meals are not automatically logged as eaten. Refrigerate within two hours at 4°C or colder; eat within 2–3 days or freeze. Reheat chicken dishes to 74°C.</p>'+
 '<p class="mp-schedule-error" role="alert" hidden></p>'+
 '<button class="primary-btn mp-schedule-submit" type="button" data-mp-schedule-save '+(batch?'':'disabled')+'>Add to my week</button></div></div></section>';
}
function groceriesMarkup(saved){
 if(!saved)return '<section class="lu-meal-planner mp-standalone">'+screenHeader("Grocery list","catalog")+'<div class="mp-grocery-intro"><h1>No groceries yet</h1><p>Schedule recipes from the catalogue to create your shopping list.</p></div><button type="button" class="primary-btn" data-mp-open="catalog">Browse recipes</button></section>';
 const groups=groupedGrocery(saved);
 return '<section class="lu-meal-planner mp-groceries mp-standalone">'+screenHeader("Grocery list","calendar")+
 '<div class="mp-grocery-intro"><span class="eyebrow">READY TO SHOP</span><h1>Your weekly groceries</h1><p>Combined quantities across every planned meal and household serving.</p></div>'+
 '<div class="mp-grocery-tools"><button type="button" class="primary-btn" data-mp-copy aria-label="Copy grocery list">⧉ Copy list</button><button type="button" data-mp-share>Share</button></div>'+
 '<p class="mp-copy-status" role="status" aria-live="polite"></p>'+
 groups.map(([name,items])=>'<section class="mp-grocery-group"><h3>'+esc(name)+'</h3><ul>'+items.map(item=>'<li><span>'+esc(item.food)+'</span><strong>'+esc(formatIngredientMeasure(item.food,item.grams,item.unit||'g'))+'</strong></li>').join("")+'</ul></section>').join("")+
 '<p class="mp-disclaimer">Shopping quantities are approximate. Check your pantry, portions and food labels.</p></section>';
}
async function copyGroceryText(text){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return true}catch{}}
 const area=document.createElement("textarea");area.value=text;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";
 document.body.append(area);area.focus();area.select();let ok=false;
 try{ok=document.execCommand("copy")}catch{}
 area.remove();return ok;
}
function bindImages(root){
 root.querySelectorAll(".mp-photo img").forEach(img=>img.addEventListener("error",()=>{
  const fallback=img.dataset.fallback;
  if(fallback&&!img.src.endsWith(fallback))img.src=fallback;
 },{once:true}));
}
function render(root){
 root.style.setProperty("--mp-art-sprite",'url("'+GENERATED_MEAL_ATLAS+'")');
 root.style.setProperty("--mp-hero-image",'url("'+MEAL_PLANNER_HERO+'")');
 const saved=read();
 const prefs={...defaultPrefs,...saved?.preferences};
 
 const page=plannerScreen;
 if(page==="home")root.innerHTML=mealPlannerHomeMarkup({plan:saved,selectedDate:selectedPlanDate,recipes:baseRecipes(),photoMarkup,favoriteIds:storedFavorites()});
 else if(page==="landing")root.innerHTML=landingMarkup(saved);
 else if(page==="catalog"||page==="favorites")root.innerHTML=catalogMarkup({slot:catalogSlot,filter:catalogFilter,foodType:catalogFoodType,search:catalogSearch,favoritesOnly:page==="favorites"||favoritesOnly});
 else if(page==="recipe"){const selected=[...baseRecipes(),...MEAL_CATALOG].find(x=>x.id===catalogRecipeId);root.innerHTML=selected?recipeDetailMarkup(selected,Boolean(saved)):catalogMarkup({slot:catalogSlot,filter:catalogFilter,foodType:catalogFoodType,search:catalogSearch});}
 else if(page==="loading")root.innerHTML=loadingMarkup();
 else if(page==="wizard")root.innerHTML='<section class="lu-meal-planner mp-onboarding mp-standalone">'+screenHeader("Meal preferences",saved?"calendar":"landing")+
  '<div class="mp-onboarding-content">'+prefsMarkup(prefs)+'</div></section>';
 else if(page==="groceries")root.innerHTML=groceriesMarkup(saved);
  else if(page==="schedule")root.innerHTML=scheduleMarkup(catalogRecipeId);
  else if(page==="calendar"&&!saved)root.innerHTML='<section class="lu-meal-planner mp-standalone">'+screenHeader("Your meal plan","catalog")+'<div class="mp-grocery-intro"><h1>Your week is empty</h1><p>Choose a recipe, then schedule the days and meal slots you want.</p></div><button type="button" class="primary-btn" data-mp-open="catalog">Explore recipes</button></section>';
 else{
  const allocation=saved?.targetAllocation;
  root.innerHTML='<section class="lu-meal-planner mp-standalone mp-calendar">'+
   screenHeader("Your meal plan","catalog")+
   '<div class="mp-calendar-actions"><div><span class="eyebrow">YOUR WEEK</span><h2>Plan & prep</h2>'+
   (allocation?'<p>Daily goal '+allocation.dailyCalories+' kcal · '+allocation.plannedCalories+' planned · '+allocation.reservedCalories+' flexible</p>':'<p>Planned meals never count as food consumed.</p>')+'</div>'+
   '<button type="button" data-mp-open="groceries">☷ Grocery list</button><button type="button" data-mp-open="catalog">Catalog</button><button type="button" data-mp-open="wizard">Preferences</button></div>'+
   '<div class="lu-meal-days">'+renderDays(saved)+'</div>'+
   '<p class="mp-disclaimer">Recipe nutrition and fullness estimates are approximate and do not replace verified food labels.</p></section>';
 }
 root.querySelectorAll("img[data-photo-fallback]").forEach(img=>img.addEventListener("error",()=>{
  const backup=img.dataset.photoFallback;
  if(backup&&!img.dataset.photoRetry){img.dataset.photoRetry="1";img.src=backup;}
  else {img.parentElement?.classList.add("mp-photo-error");img.style.display="none";}
 }));
 root.querySelectorAll("[data-mp-favorites-filter]").forEach(button=>button.addEventListener("click",()=>{favoritesOnly=button.dataset.mpFavoritesFilter==="favorites";render(root);}));
 root.querySelectorAll("[data-mp-home-date]").forEach(button=>button.addEventListener("click",()=>{selectedPlanDate=button.dataset.mpHomeDate;render(root);}));
 root.querySelectorAll("[data-mp-review-nav]").forEach(button=>button.addEventListener("click",()=>{
   const id=button.dataset.mpReviewNav;
   if(id){catalogRecipeId=id;plannerScreen="recipe";render(root);}
 }));
 root.querySelector("[data-mp-review-export]")?.addEventListener("click",async()=>{
   const report={format:"level-up-first100-recipe-review-v1",exportedAt:new Date().toISOString(),summary:reviewSummary(),decisions:readReviewDecisions()};
   const raw=JSON.stringify(report,null,2);
   const status=root.querySelector(".mp-review-export");
   if(navigator.clipboard?.writeText){
     try{await navigator.clipboard.writeText(raw);if(status)status.textContent="Copied review notes";return;}
     catch{}
   }
   window.prompt("Copy your recipe-review notes",raw);
 });
 root.querySelectorAll("[data-mp-review-decision]").forEach(button=>button.addEventListener("click",()=>{
   const id=button.dataset.mpReviewId,decision=button.dataset.mpReviewDecision;
   const notes=root.querySelector("[data-mp-review-notes]")?.value??getReviewDecision(id).notes;
   if(saveReviewDecision(id,{decision,notes}))render(root);
   else window.alert("Could not save review feedback on this device.");
 }));
 root.querySelector("[data-mp-review-notes]")?.addEventListener("change",event=>{
   const id=event.target.dataset.mpReviewNotes;
   const previous=getReviewDecision(id);
   if(!saveReviewDecision(id,{decision:previous.decision,notes:event.target.value}))window.alert("Could not save review notes on this device.");
 });

 root.querySelectorAll("[data-mp-schedule]").forEach(button=>button.addEventListener("click",()=>{
   catalogRecipeId=button.dataset.mpSchedule;
   const recipe=[...FEATURED_RECIPES,...MEAL_CATALOG].find(x=>x.id===catalogRecipeId);
   scheduleSlots=[recipe?.slot||"Dinner"];scheduleOffsets=[0,1,2];schedulePortions=1;scheduleStart=nextMonday();
   plannerScreen="schedule";render(root);
 }));
 root.querySelectorAll("[data-mp-schedule-day]").forEach(button=>button.addEventListener("click",()=>{
   const day=Number(button.dataset.mpScheduleDay);
   scheduleOffsets=scheduleOffsets.includes(day)?scheduleOffsets.filter(x=>x!==day):[...scheduleOffsets,day].sort((a,b)=>a-b);render(root);
 }));
 root.querySelectorAll("[data-mp-schedule-slot]").forEach(box=>box.addEventListener("change",()=>{
   const slot=box.dataset.mpScheduleSlot;
   scheduleSlots=box.checked?[...new Set([...scheduleSlots,slot])]:scheduleSlots.filter(x=>x!==slot);render(root);
 }));
 root.querySelector("[data-mp-schedule-start]")?.addEventListener("change",event=>{
   if(/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)){scheduleStart=event.target.value;render(root);}
 });
 root.querySelector("[data-mp-schedule-portions]")?.addEventListener("change",event=>{
   schedulePortions=Math.max(1,Math.min(12,Math.floor(Number(event.target.value)||1)));render(root);
 });
 root.querySelector("[data-mp-schedule-save]")?.addEventListener("click",()=>{
   const recipe=[...FEATURED_RECIPES,...MEAL_CATALOG].find(x=>x.id===catalogRecipeId);
   try{
     for(const i of scheduleOffsets)for(const slot of scheduleSlots){
       const date=dateForOffset(scheduleStart,i);
       if(hasConsumedMeal(date,slot))throw new Error("A meal in this slot has already been logged. Choose a different day or slot.");
     }
     const next=scheduleRecipe(read(),recipe,{startDate:scheduleStart,dayOffsets:scheduleOffsets,slots:scheduleSlots,portionsPerDay:schedulePortions});
     if(!write(next))throw new Error("Could not save this plan to local storage.");
     selectedPlanDate=dateForOffset(scheduleStart,scheduleOffsets[0]);
     plannerScreen="calendar";render(root);
   }catch(error){const msg=root.querySelector(".mp-schedule-error");if(msg){msg.hidden=false;msg.textContent=error.message;}}
 });
 root.querySelectorAll("[data-mp-slot]").forEach(button=>button.addEventListener("click",()=>{catalogSlot=button.dataset.mpSlot;render(root);}));
 root.querySelectorAll("[data-mp-filter]").forEach(button=>button.addEventListener("click",()=>{catalogFilter=button.dataset.mpFilter;render(root);}));
 root.querySelectorAll("[data-mp-food-type]").forEach(button=>button.addEventListener("click",()=>{catalogFoodType=button.dataset.mpFoodType;render(root);}));
 root.querySelector("[data-mp-style-settings]")?.addEventListener("click",event=>{
   const options=root.querySelector("[data-mp-style-options]");
   if(!options)return;
   options.hidden=!options.hidden;
   event.currentTarget.setAttribute("aria-expanded",String(!options.hidden));
 });
 root.querySelector("[data-mp-style-done]")?.addEventListener("click",()=>{
   const selected=[...root.querySelectorAll("[data-mp-style-choice]:checked")].map(input=>input.value);
   try {saveRecipeStyles(selected);} catch { window.alert("Food preferences could not be saved on this device.");return; }
   render(root);
 });
 root.querySelector("[data-mp-search]")?.addEventListener("input",event=>{
  catalogSearch=event.target.value;
  const favoriteIds=new Set(storedFavorites());
  const matches=baseRecipes().filter(recipe=>
   matchesCatalog(recipe,{slot:catalogSlot,filter:catalogFilter,foodType:catalogFoodType,search:catalogSearch})&&(!favoritesOnly||favoriteIds.has(recipe.id))
  );
  // Re-rendering the entire catalog on every keystroke would lose keyboard focus.
  root.querySelectorAll(".mp-catalog-card").forEach(card=>{
   const id=card.querySelector("[data-mp-recipe]")?.dataset.mpRecipe;
   card.hidden=!matches.some(recipe=>recipe.id===id);
  });
  const count=root.querySelector(".mp-catalog-count");if(count)count.textContent=root.querySelectorAll(".mp-catalog-card:not([hidden])").length+" recipes";
 });
 root.querySelectorAll("[data-mp-favorite]").forEach(button=>button.addEventListener("click",()=>{
  const active=toggleFavorite(button.dataset.mpFavorite);
  button.classList.toggle("active",active);button.textContent=active?"♥":"♡";
  button.setAttribute("aria-label",active?"Remove favorite":"Save favorite");
 }));
 root.querySelectorAll("[data-mp-recipe]").forEach(button=>button.addEventListener("click",()=>{
  catalogRecipeId=button.dataset.mpRecipe;plannerScreen="recipe";render(root);
 }));
 root.querySelector("[data-mp-use-recipe]")?.addEventListener("click",()=>{
  const id=root.querySelector("[data-mp-use-recipe]").dataset.mpUseRecipe;
  const recipe=MEAL_CATALOG.find(item=>item.id===id),plan=read();
  if(!recipe||!plan)return;
  const date=selectedPlanDate||plan.entries?.[0]?.date;
  const entry=plan.entries.find(item=>item.date===date&&item.slot===recipe.slot);
  if(!entry){window.alert("This day doesn't contain a "+recipe.slot+" slot. Edit the plan preferences to include it.");return;}
  if(hasConsumedMeal(date,recipe.slot)){window.alert("This meal was already logged. Undo it from Food Log before swapping.");return;}
  const updated=replacePlannedMeal(plan,date,recipe.slot,id);
  const fitted=refitRecipeForSlot(id,entry.targetCalories);
  const next=fitted?{...updated,entries:updated.entries.map(x=>x.date===date&&x.slot===recipe.slot?{...x,...fitted}:x)}:updated;
  if(write(next)){plannerScreen="calendar";render(root);}
 });
 root.querySelector("[data-mp-exit]")?.addEventListener("click",()=>{const tab=document.querySelector('[data-calories-tab="log"]');if(tab)tab.click();});
 root.querySelectorAll("[data-mp-open]").forEach(b=>b.addEventListener("click",()=>{plannerScreen=b.dataset.mpOpen;if(plannerScreen==="catalog")favoritesOnly=false;if(plannerScreen==="favorites")favoritesOnly=true;wizardStep=0;render(root)}));
 root.querySelector("[data-mp-copy]")?.addEventListener("click",async()=>{
  const success=await copyGroceryText(groceryPlainText(read()));
  const status=root.querySelector(".mp-copy-status");if(status)status.textContent=success?"Copied to clipboard.":"Could not copy automatically. Use Share to export the list.";
 });
 root.querySelector("[data-mp-share]")?.addEventListener("click",async()=>{
  const text=groceryPlainText(read());
  if(navigator.share){try{await navigator.share({title:"Level Up Grocery List",text});return}catch{}}
  const status=root.querySelector(".mp-copy-status");
  if(status)status.textContent=await copyGroceryText(text)?"Copied instead — paste into Notes or another app.":"Sharing is not supported here.";
 });
 if(page==="wizard"){
  showWizardStep(root,wizardStep);
  root.querySelector("[data-mp-next]")?.addEventListener("click",()=>showWizardStep(root,wizardStep+1));
  root.querySelector("[data-mp-back]")?.addEventListener("click",()=>showWizardStep(root,wizardStep-1));
  root.querySelectorAll('input[name="coverage"]').forEach(radio=>radio.addEventListener("change",()=>{
   if(!radio.checked)return;
   const suggested={all:100,"lunch-dinner":75,dinner:40,custom:75};
   const slider=root.querySelector('input[name="calorieCoverage"]');
   if(slider){slider.value=suggested[radio.value]||75;const label=root.querySelector("[data-mp-coverage-preview]");if(label)label.textContent=slider.value+"%";}
  }));
  root.querySelector('input[name="calorieCoverage"]')?.addEventListener("input",e=>{
   const preview=root.querySelector("[data-mp-coverage-preview]");
   if(preview)preview.textContent=e.target.value+"%";
  });
  root.querySelector("[data-meal-planner-options]")?.addEventListener("submit",async event=>{
   event.preventDefault();
   const fd=new FormData(event.currentTarget),appGoal=currentMealPlannerGoal();
   const coverage=String(fd.get("coverage")||"all");
   const meals=coverage==="all"?MEAL_SLOTS:coverage==="lunch-dinner"?["Lunch","Dinner"]:coverage==="dinner"?["Dinner"]:fd.getAll("slot");
   if(!meals.length){window.alert("Please choose at least one meal.");showWizardStep(root,2);return;}
   const mode=String(fd.get("goalMode")||"existing");
   const target=mode==="custom"?Number(fd.get("dailyCalories")):Number(appGoal.dailyCalories);
   if(!Number.isFinite(target)||target<800||target>10000){
    window.alert("Set a valid calorie target in Level Up Goals, or choose a custom daily target (800–10,000 kcal).");
    showWizardStep(root,0);return;
   }
   const diet=String(fd.get("diet")||"balanced");
   const rawCuisines=fd.getAll("cuisine");
   const preferences={...prefs,
    goalMode:mode,goalType:fd.get("goalType")||appGoal.goalId,dailyCalories:target,
    calorieCoverage:Number(fd.get("calorieCoverage")||0),
    diet:["vegetarian","vegan","pescatarian"].includes(diet)?diet:"balanced",
    preferredDiet:diet,coverage,meals,
    cuisines:[...new Set(rawCuisines.length?rawCuisines:diet==="mediterranean"?["Mediterranean"]:[])],
    preferredCuisines:rawCuisines,cooking:fd.get("cooking")||"30",
    days:fd.get("days")||"7",skill:fd.get("skill")||"Basic",
    grocery:fd.get("grocery")||"In-store",prep:fd.get("prep")||"yes",
    leftovers:fd.get("leftovers")||"Sometimes",household:fd.get("household")||"1",
    budget:fd.get("budget")||"Flexible",likes:fd.getAll("liked-food"),likedRecipes:fd.getAll("liked-recipe"),
    dislikes:fd.get("dislikes")||"",allergies:fd.getAll("allergy"),
    mealSizes:Object.fromEntries(MEAL_SLOTS.map(slot=>[slot,Math.max(1,Math.min(6,Number(fd.get("servings-"+slot)||fd.get("household")||1)))])),
    priorities:[0,1,2,3,4].map(i=>Number(fd.get("priority-"+i)||3))
   };
   const today=new Date();
   const date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
   // Existing logged food must not be silently replaced.
   if(saved?.entries?.some(e=>hasConsumedMeal(e.date,e.slot))&&!window.confirm("This will replace your planned meals. Already consumed foods remain in Food Log. Continue?"))return;
   plannerScreen="loading";render(root);
   // Paint the loader before the synchronous recipe-ranking work begins.
   await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,750)));
   let next;
   try{next=generateGoalAwarePlan(preferences,date,appGoal)}catch(error){console.error("Meal plan generation failed",error);}
   if(!next||next.error){
    plannerScreen="wizard";wizardStep=9;render(root);
    window.alert("Meal planning failed. Check your calorie goal and try again.");return;
   }
   if(write(next)){plannerScreen="calendar";selectedPlanDate=date;wizardStep=0;render(root)}
   else {plannerScreen="wizard";wizardStep=9;render(root);window.alert("Couldn't save your plan on this device.");}
  });
 }
 bindImages(root);
 if(page!=="calendar")return;
 root.querySelectorAll("[data-mp-date]").forEach(btn=>btn.addEventListener("click",()=>{selectedPlanDate=btn.dataset.mpDate;render(root)}));
 root.querySelectorAll("[data-mp-day-nav]").forEach(btn=>btn.addEventListener("click",()=>{
  const days=[...new Set(read()?.entries?.map(x=>x.date)||[])],index=days.indexOf(selectedPlanDate);
  selectedPlanDate=days[Math.max(0,Math.min(days.length-1,index+Number(btn.dataset.mpDayNav)))]||selectedPlanDate;
  render(root);
 }));
 root.querySelectorAll("[data-meal-consume]").forEach(button=>button.addEventListener("click",()=>{
  const {date,slot}=button.dataset,entry=read()?.entries?.find(x=>x.date===date&&x.slot===slot);
  if(!entry)return;
  const result=markPlannedMealConsumed(date,slot,entry.ingredients);
  if(result.ok)render(root);else if(result.reason!=="already_logged")window.alert("Could not log meal: "+result.reason);
 }));
 root.querySelectorAll("[data-meal-undo]").forEach(button=>button.addEventListener("click",()=>{
  const {date,slot}=button.dataset;
  if(window.confirm("Remove food-log entries created by this planned meal?")){
   const result=undoPlannedMealConsumed(date,slot);if(result.ok)render(root);
  }
 }));
 root.querySelectorAll("[data-meal-replace]").forEach(select=>select.addEventListener("change",()=>{
  const {date,slot}=select.dataset;
  if(hasConsumedMeal(date,slot))return;
  const plan=read(),entry=plan?.entries?.find(x=>x.date===date&&x.slot===slot);
  if(!entry)return;
  let updated=replacePlannedMeal(plan,date,slot,select.value);
  const refitted=refitRecipeForSlot(select.value,entry.targetCalories);
  if(refitted)updated={...updated,entries:updated.entries.map(x=>x.date===date&&x.slot===slot?{...x,...refitted}:x)};
  if(write(updated))render(root);
 }));
 root.querySelectorAll("[data-meal-grams]").forEach(input=>input.addEventListener("change",()=>{
  const {date,slot,index}=input.dataset;if(hasConsumedMeal(date,slot))return;
  const amount=Number(input.value);
  if(!Number.isFinite(amount)||amount<0||amount>10000){render(root);return}
  const updated=editPlannedIngredient(read(),date,slot,Number(index),amount);
  if(write(updated))render(root);
 }));
}

let selectedPlanDate="";
function renderDays(plan){
 const dates=[...new Set(plan.entries.map(x=>x.date))];
 if(!dates.includes(selectedPlanDate))selectedPlanDate=dates[0]||"";
 const nav='<nav class="mp-day-carousel" aria-label="Meal plan days"><button type="button" data-mp-day-nav="-1" aria-label="Previous day">‹</button><div class="mp-day-items">'+dates.map(d=>{const x=new Date(d+"T12:00:00");return '<button type="button" class="mp-day-option'+(d===selectedPlanDate?" active":"")+'" data-mp-date="'+esc(d)+'"><small>'+esc(x.toLocaleDateString(undefined,{weekday:"short"}))+'</small><strong>'+x.getDate()+'</strong></button>'}).join("")+'</div><button type="button" data-mp-day-nav="1" aria-label="Next day">›</button></nav>';
 return nav+dates.filter(date=>date===selectedPlanDate).map(date=>{
  const entries=plan.entries.filter(x=>x.date===date);
  const total=entries.reduce((acc,entry)=>{if(FEATURED_RECIPES.some(x=>x.id===entry.recipeId))return acc;const m=macrosForIngredients(entry.ingredients);for(const key of Object.keys(acc))acc[key]+=m[key];return acc},{calories:0,protein:0,carbs:0,fat:0});
   return '<section class="lu-meal-day"><h3>'+esc(new Date(date+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}))+'</h3><p class="lu-meal-total">'+(entries.some(x=>FEATURED_RECIPES.some(r=>r.id===x.recipeId))?'Nutrition total unavailable until source-linked meals are independently verified.':'Planned ≈ '+Math.round(total.calories)+' kcal · '+Math.round(total.protein)+'g protein · '+Math.round(total.carbs)+'g carbs · '+Math.round(total.fat)+'g fat')+'</p>'+
  entries.map(entry=>{
    const recipe=[...FEATURED_RECIPES,...MEAL_CATALOG].find(x=>x.id===entry.recipeId);
    const options=eligibleMeals(plan.preferences).filter(x=>x.slot===entry.slot);
    const consumed=hasConsumedMeal(date,entry.slot);
    const thumbnail=recipe?photoMarkup(recipe):esc(getFoodEmoji({name:entry.ingredients[0]?.food||"meal"}));
     const sourcePending=Boolean(recipe?.groups);
    const m=macrosForIngredients(entry.ingredients);
    const satiety=fullnessEstimate(entry.ingredients);
    return '<article class="lu-meal-card"><div class="lu-meal-card-head"><span class="lu-meal-photo" role="img" aria-label="Meal thumbnail">'+thumbnail+'</span><div class="lu-meal-card-info"><label><strong>'+esc(entry.slot)+'</strong><select '+(consumed?'disabled ':'')+'data-meal-replace data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'">'+
      (recipe&&!options.some(x=>x.id===recipe.id)?'<option value="'+esc(recipe.id)+'" selected>'+esc(recipe.name)+'</option>':'')+
      options.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===entry.recipeId?' selected':'')+'>'+esc(x.name)+'</option>').join("")+'</select></label>'+
      (recipe?(sourcePending?'<p>Source-linked · nutrition pending review · '+Number(entry.servings||1)+' serving(s) · Prep ~'+recipe.prepMinutes+' min</p>':'<p>≈ '+Math.round(m.calories)+' kcal · P '+Math.round(m.protein)+'g · C '+Math.round(m.carbs)+'g · F '+Math.round(m.fat)+'g · '+Number(entry.servings||1)+' serving(s) · Prep ~'+recipe.prepMinutes+' min</p><p class="mp-meal-target">Target ≈ '+Math.round(Number(entry.targetCalories)||m.calories)+' kcal'+(entry.targetCalories?' · '+Math.round(m.calories-Number(entry.targetCalories))+' kcal difference':'')+'</p>'+(isWeightLossGoal(plan.goalId)?'<p class="mp-fullness">Estimated fullness '+satiety.score+'/100 · '+satiety.level+'</p>':'')):'<p>'+esc(entry.warning||"No matching meal")+'</p>')+
      (entry.notice?'<p class="mp-disclaimer">'+esc(entry.notice)+'</p>':'')+
      '<div class="lu-meal-actions">'+(consumed?'<span class="lu-meal-eaten">✓ Consumed</span><button type="button" data-meal-undo data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'">Undo log</button>':recipe&&!sourcePending?'<button class="primary-btn" type="button" data-meal-consume data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'">Mark Eaten</button>':sourcePending?'<span class="mp-disclaimer">Logging unavailable until food matching and nutrition verification</span>':'')+'</div></div></div>'+
      '<details><summary>Ingredients &amp; portions</summary>'+entry.ingredients.map((item,i)=>'<label class="lu-meal-ingredient"><span class="lu-meal-food-photo" role="img" aria-label="Ingredient thumbnail">'+ingredientIllustration(item.food)+'</span><span>'+esc(item.food)+'</span><input '+(consumed?'disabled ':'')+'type="number" min="0" max="10000" step="1" value="'+Number(item.grams)+'" data-meal-grams data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'" data-index="'+i+'"> g <small class="mp-ingredient-measure">'+esc(formatIngredientMeasure(item.food,item.grams,"g"))+'</small></label>').join("")+'</details>'+(recipe?'<details class="mp-cooking"><summary>Cooking instructions · Step by step</summary><ol>'+(sourcePending?recipe.steps:recipeSteps({...recipe,ingredients:entry.ingredients})).map(step=>'<li>'+esc(step)+'</li>').join("")+'</ol></details>':'')+
      (isWeightLossGoal(plan.goalId)&&!sourcePending?'<p class="mp-disclaimer">Fullness score is a recipe heuristic, not a measured Satiety Index.</p>':'')+
      (consumed?'<p class="lu-meal-note">Edit logged ingredients in Food Log. Undo removes only entries created through this plan.</p>':'')+'</article>';
  }).join("")+'</section>';
 }).join("");
}
export function renderMealPlannerShell(){return `
<style>
@import url("/css/meal-planner.css");
.lu-meal-planner{padding:18px 12px;max-width:850px;margin:auto;color:var(--text-primary,var(--text,#eee))}
.lu-meal-planner h2,.lu-meal-planner h3{margin:.4em 0}
.lu-meal-planner p{line-height:1.5}
.lu-meal-preferences{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:14px 0}
.lu-meal-preferences>label,.lu-meal-card label{display:flex;flex-direction:column;gap:6px}
.lu-meal-preferences input,.lu-meal-preferences select,.lu-meal-card input,.lu-meal-card select{box-sizing:border-box;width:100%;min-height:42px;padding:9px;border:1px solid var(--border-color,#7777);border-radius:10px;background:var(--surface-2,var(--card-bg,#242424));color:inherit}
.lu-meal-preferences fieldset{grid-column:1/-1;border:1px solid var(--border-color,#7777);border-radius:12px}
.lu-meal-preferences .lu-meal-checkbox{display:inline-flex;flex-direction:row;align-items:center;margin:6px 10px 6px 0;gap:6px}
.lu-meal-checkbox input{width:auto;min-height:auto}
.lu-meal-preferences button{grid-column:1/-1}
.lu-meal-day{margin-top:20px;padding:12px;border:1px solid var(--border-color,#7775);border-radius:16px;background:var(--surface-1,var(--card-bg,#202020))}
.lu-meal-card{margin:10px 0;padding:13px;border:1px solid var(--border-color,#7775);border-radius:12px}
.lu-meal-card details label{max-width:320px;margin:10px 0}
.lu-meal-total,.lu-meal-disclaimer{font-size:.86rem;opacity:.83}
.lu-meal-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px}
.lu-meal-toolbar button{padding:10px;border-radius:9px;background:var(--surface-2,#444);color:inherit}
.lu-meal-grocery{margin-top:16px}
.lu-meal-card-head{display:flex;gap:12px;align-items:flex-start}
.lu-meal-photo{display:grid;place-items:center;flex-shrink:0;width:70px;height:70px;border-radius:14px;background:var(--surface-2,#444);font-size:37px}
.lu-meal-card-info{flex:1;min-width:0}
.lu-meal-ingredient{display:flex!important;flex-direction:row!important;align-items:center;gap:9px;max-width:none!important}
.lu-meal-food-photo{width:38px;height:38px;border-radius:9px;background:var(--surface-2,#444);display:grid;place-items:center;font-size:22px;flex-shrink:0}
.lu-meal-ingredient span:nth-child(2){flex:1}
.lu-meal-ingredient input{width:85px!important}
.lu-meal-actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.lu-meal-actions button{padding:9px 14px;border-radius:9px}
.lu-meal-eaten{font-weight:700;color:var(--success,#3dbb7a)}
.lu-meal-note{font-size:.8rem;opacity:.8}
.mp-catalog .mp-catalog-content{padding-bottom:48px}
.mp-catalog-primary-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin:18px 0}
.mp-catalog-primary-actions button{border:1px solid var(--border-color,#7776);padding:12px 6px;border-radius:12px;background:var(--surface-2,#4442);color:inherit;font:inherit;font-weight:600;font-size:13px}
.mp-catalog-primary-actions .primary-btn{background:var(--accent,#28835b);color:white;border-color:transparent}
.mp-catalog-mode{display:flex;gap:9px;align-items:center;margin:16px 0}
.mp-catalog-mode button{background:var(--surface-2,#4442);color:inherit;border:1px solid var(--border-color,#7776);border-radius:999px;padding:10px 14px;font:inherit;font-weight:600}
.mp-catalog-mode button.active{background:var(--accent,#28835b);border-color:transparent;color:white}
.mp-source-note{padding:18px;margin:20px 0;border:1px solid var(--border-color,#7775);border-radius:16px;background:var(--surface-2,#4442)}
.mp-source-note p{margin:9px 0;font-size:13px}
.mp-source-note a{color:var(--accent,#72cd9b)}
.mp-schedule-body{padding:16px 5px 50px}
.mp-schedule-preview{display:flex;gap:14px;align-items:center;border:1px solid var(--border-color,#7775);padding:12px;border-radius:16px}
.mp-schedule-preview .mp-real-photo{display:flex;width:96px;height:96px;flex:0 0 96px;border-radius:12px;overflow:hidden;background-color:var(--surface-2,#4442)}
.mp-schedule-preview h2{font-size:19px}
.mp-schedule-panel{border:1px solid var(--border-color,#7775);border-radius:16px;margin-top:16px;padding:16px;background:var(--card-bg,#7771)}
.mp-schedule-panel h3{margin:14px 0 10px}
.mp-schedule-label{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px;margin:12px 0}
.mp-schedule-label input{max-width:55%;color:inherit;background:var(--surface-2,#4442);border:1px solid var(--border-color,#7775);border-radius:10px;padding:10px;font:inherit}
.mp-schedule-weekdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
.mp-schedule-weekdays button{min-width:0;padding:13px 0;background:var(--surface-2,#4442);color:inherit;border:1px solid var(--border-color,#7775);border-radius:11px;font:inherit;font-size:12px}
.mp-schedule-weekdays button.active{background:var(--accent,#28835b);color:white;border-color:transparent}
.mp-schedule-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.mp-schedule-slots label{display:flex;align-items:center;gap:8px;background:var(--surface-2,#4442);border:1px solid var(--border-color,#7775);border-radius:11px;padding:12px 9px;font-size:13px}
.mp-schedule-slots input{accent-color:var(--accent,#28835b)}
.mp-schedule-summary{display:flex;flex-direction:column;gap:6px;background:var(--surface-2,#4442);padding:16px;border-radius:12px;margin:16px 0}
.mp-schedule-summary strong{font-size:22px}
.mp-schedule-summary small{opacity:.72}
.mp-schedule-submit{width:100%;margin-top:14px;padding:13px}
.mp-schedule-error{color:#e98d8d}
.mp-first100-progress{margin:14px 0 18px;padding:14px 16px;border:1px solid var(--border-color,#7776);border-radius:15px;background:var(--card-bg,#7771);display:flex;flex-direction:column;gap:5px}
.mp-first100-progress span{font-size:13px;font-weight:600;color:var(--text-primary,inherit)}
.mp-first100-progress small{font-size:12px;opacity:.75}
.mp-review-section{margin-top:22px;border:1px solid var(--border-color,#7776);padding:16px;border-radius:15px;background:var(--card-bg,#7771)}
.mp-review-section h3{margin:0 0 8px}
.mp-review-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}
.mp-review-actions button{padding:11px 9px;color:inherit;background:var(--surface-2,#7772);border:1px solid var(--border-color,#7777);border-radius:10px;font:inherit;font-size:13px}
.mp-review-actions button.active{background:var(--accent,#287d5c);color:#fff;border-color:transparent}
.mp-review-actions button:last-child{grid-column:span 2}
.mp-review-section label{display:block;font-weight:600;margin-bottom:8px}
.mp-review-section textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:100px;border-radius:10px;border:1px solid var(--border-color,#7777);background:var(--surface-2,#7772);color:inherit;padding:12px;font:inherit}
.mp-review-export{align-self:flex-start;margin-top:9px;border-radius:10px;padding:10px 13px;border:1px solid var(--border-color,#7777);color:inherit;background:var(--surface-2,#8882);font:inherit;font-weight:600}
.mp-review-navigation{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;margin:10px 0}
.mp-review-navigation button{padding:12px 10px;border-radius:10px;border:1px solid var(--border-color,#7777);color:inherit;background:var(--surface-2,#7772);font:inherit}
.mp-review-navigation button:disabled{opacity:.4}
.mp-review-navigation span{font-weight:700;font-size:13px}


@media(max-width:390px){.mp-catalog-primary-actions{grid-template-columns:1fr 1fr}.mp-catalog-primary-actions button:last-child{grid-column:span 2}}

</style><div data-meal-planner-root></div>`;}
export function initializeMealPlanner(){
 const root=document.querySelector("[data-meal-planner-root]");if(root)render(root);
}
