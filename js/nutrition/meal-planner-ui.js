import {mealPhoto,ingredientPhoto,localFoodFallback,recipeSteps} from "./meal-planner-media.js?v=2";
import {getFoodEmoji} from "./food-emoji.js?v=food-artwork-polish-1";
import {hasConsumedMeal,markPlannedMealConsumed,undoPlannedMealConsumed} from "./meal-planner-consumption.js?v=1";
import {MEAL_CATALOG,MEAL_SLOTS,generatePlan,eligibleMeals,macrosForIngredients,groceryList,replacePlannedMeal,editPlannedIngredient,PLANNER_STORAGE_KEY} from "./meal-planner-data.js?v=1";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)||"null")}catch{return null}};
const write=plan=>{try{localStorage.setItem(PLANNER_STORAGE_KEY,JSON.stringify(plan));return true}catch{return false}};
const defaultPrefs={goal:"existing",diet:"balanced",coverage:"all",meals:MEAL_SLOTS,allergies:[],dislikes:"",cuisines:["Mediterranean","North American","Mexican"],cooking:"30",prep:"yes",repeats:"3",household:"1",budget:"flexible",priority:"balanced",days:"7"};
const selectable=(values,selected)=>values.map(x=>'<option value="'+esc(x)+'"'+(selected===x?' selected':'')+'>'+esc(x)+'</option>').join("");
const DIET_CHOICES=[["balanced","Balanced","Flexible healthy eating",0],["high-protein","High protein","Protein first",6],["whole-food","Whole foods","Minimally processed choices",4],["mediterranean","Mediterranean","Plant-forward and seafood",12],["vegetarian","Vegetarian","No meat or fish",1],["vegan","Vegan","Plant only",2],["pescatarian","Pescatarian","Fish and plants",13],["flexitarian","Flexitarian","Mostly plants",8],["low-carb","Lower carb","Fewer starches",7]];
const CUISINES=["North American","Mediterranean","Mexican","Asian","Italian","Chinese","Japanese","Thai","Indian"];
const PRODUCE=["Apple","Blueberries","Banana","Pineapple","Broccoli","Spinach","Zucchini","Bell pepper","Tomato","Cucumber","Avocado","Sweet potato"];
const ALLERGENS=["milk","eggs","fish","shellfish","peanuts","tree nuts","soy","gluten","wheat","sesame"];
const photo=(url,label,fallback=0)=>'<span class="mp-photo" style="background-image:url('+localFoodFallback(fallback)+')"><img loading="lazy" src="'+esc(url)+'" alt="'+esc(label)+'"></span>';
const choose=(name,value,label,checked)=>'<label class="mp-choice"><input type="radio" name="'+name+'" value="'+esc(value)+'"'+(checked?' checked':'')+'><span>'+esc(label)+'</span></label>';
const pick=(name,value,label,checked)=>'<label class="mp-pill"><input type="checkbox" name="'+name+'" value="'+esc(value)+'"'+(checked?' checked':'')+'><span>'+esc(label)+'</span></label>';
function prefsMarkup(p){
 const dish=(n)=>mealPhoto({id:"lu-meal-"+String(n*20+1).padStart(3,"0")});
 const styles=DIET_CHOICES.map(([id,name,desc,index])=>'<label class="mp-photo-choice"><input type="radio" name="diet" value="'+esc(id)+'"'+(p.diet===id?' checked':'')+'>'+photo(dish(index),name,index)+'<span class="mp-photo-copy"><strong>'+esc(name)+'</strong><small>'+esc(desc)+'</small></span><span class="mp-choice-tick">✓</span></label>').join("");
 const cuisine=CUISINES.map(x=>pick("cuisine",x,x,(p.cuisines||[]).includes(x))).join("");
 const produce=PRODUCE.map((x,i)=>'<label class="mp-photo-choice mp-food-choice"><input type="checkbox" name="liked-food" value="'+esc(x)+'"'+((p.likes||[]).includes(x)?' checked':'')+'>'+photo(ingredientPhoto(x),x,i)+'<span class="mp-photo-copy"><strong>'+esc(x)+'</strong></span><span class="mp-choice-tick">♥</span></label>').join("");
 const ratings=MEAL_CATALOG.filter(x=>["lu-meal-001","lu-meal-041","lu-meal-141","lu-meal-161","lu-meal-261","lu-meal-301"].includes(x.id)).map((x,i)=>'<label class="mp-photo-choice mp-food-choice"><input type="checkbox" name="liked-recipe" value="'+esc(x.id)+'"'+((p.likedRecipes||[]).includes(x.id)?' checked':'')+'>'+photo(mealPhoto(x),x.name,i)+'<span class="mp-photo-copy"><strong>'+esc(x.name)+'</strong><small>≈ '+Math.round(macrosForIngredients(x.ingredients).calories)+' kcal</small></span><span class="mp-choice-tick">♥</span></label>').join("");
 return '<form data-meal-planner-options class="mp-wizard">'+
 '<div class="mp-step-progress"><span data-mp-progress></span></div><p class="mp-step-counter" data-mp-step-label>Step 1 of 6</p>'+
 '<section class="mp-step" data-mp-step="0"><h3>What is your eating style?</h3><p>Choose the approach that fits you best.</p><div class="mp-photo-grid">'+styles+'</div></section>'+
 '<section class="mp-step" data-mp-step="1" hidden><h3>How many meals do you want planned?</h3><p>Set up your weekly calendar.</p><div class="mp-choice-list">'+choose("coverage","all","All meals every day",p.coverage==="all")+choose("coverage","lunch-dinner","Lunch and dinner",p.coverage==="lunch-dinner")+choose("coverage","dinner","Dinners only",p.coverage==="dinner")+choose("coverage","custom","Custom",p.coverage==="custom")+'</div><div class="mp-pills">'+MEAL_SLOTS.map(s=>pick("slot",s,s,(p.meals||MEAL_SLOTS).includes(s))).join("")+'</div><div class="mp-fields"><label>Days <select name="days">'+selectable(["3","5","7","14"],String(p.days||"7"))+'</select></label><label>Leftovers <select name="leftovers">'+selectable(["Frequently","Sometimes","Not often"],p.leftovers||"Sometimes")+'</select></label></div></section>'+
 '<section class="mp-step" data-mp-step="2" hidden><h3>What's your cooking style?</h3><p>We will fit your schedule and skill level.</p><div class="mp-choice-list">'+["Novice","Basic","Intermediate","Advanced"].map(s=>choose("skill",s,s,(p.skill||"Basic")===s)).join("")+'</div><div class="mp-fields"><label>Maximum cooking time <select name="cooking">'+selectable(["15","20","30","45","60"],String(p.cooking||"30"))+'</select></label><label>Grocery shopping <select name="grocery">'+selectable(["In-store","Pickup","Delivery","Flexible"],p.grocery||"In-store")+'</select></label><label>Meal prep <select name="prep">'+selectable(["yes","no"],p.prep||"yes")+'</select></label></div></section>'+
 '<section class="mp-step" data-mp-step="3" hidden><h3>Which foods do you enjoy?</h3><p>Choose cuisines, fruits and vegetables you would like to see.</p><h4>Cuisine preferences</h4><div class="mp-pills">'+cuisine+'</div><h4>Foods you like</h4><div class="mp-photo-grid">'+produce+'</div><label class="mp-input-label">Foods to avoid <input name="dislikes" placeholder="e.g. mushrooms, salmon" value="'+esc(p.dislikes||"")+'"></label></section>'+
 '<section class="mp-step" data-mp-step="4" hidden><h3>Personalize your plan</h3><p>Keep allergies, your household and priorities in mind.</p><h4>Allergies</h4><div class="mp-pills">'+ALLERGENS.map(s=>pick("allergy",s,s,(p.allergies||[]).includes(s))).join("")+'</div><p class="mp-disclaimer">This estimated recipe catalog cannot guarantee allergen-free foods or prevent cross-contact. Check product labels before eating.</p><div class="mp-fields"><label>People eating <select name="household">'+selectable(["1","2","3","4","5","6"],String(p.household||"1"))+'</select></label><label>Budget <select name="budget">'+selectable(["Flexible","Moderate","Budget-conscious"],p.budget||"Flexible")+'</select></label></div><h4>What's important to you?</h4>'+["Delicious meals","Easy recipes","Budget-friendly meals","Recipe variety","High protein"].map((x,i)=>'<label class="mp-slider">'+esc(x)+'<input name="priority-'+i+'" type="range" min="1" max="5" value="'+Number(p.priorities?.[i]||3)+'"></label>').join("")+'</section>'+
 '<section class="mp-step" data-mp-step="5" hidden><h3>Rate a few recipe ideas</h3><p>Tap the heart on meals you enjoy. These ratings help refine future suggestions.</p><div class="mp-photo-grid">'+ratings+'</div><p class="mp-disclaimer">Photos are illustrative; nutrition is estimated. The current draft uses a limited set of base recipes and portion variations.</p></section>'+
 '<footer class="mp-wizard-footer"><button type="button" data-mp-back hidden>Back</button><button type="button" class="primary-btn" data-mp-next>Next</button><button type="submit" class="primary-btn" data-mp-generate hidden>Generate my meal plan</button></footer></form>';
}
let wizardStep=0;
function showWizardStep(root,next){
 const form=root.querySelector("[data-meal-planner-options]");if(!form)return;
 wizardStep=Math.max(0,Math.min(5,next));
 form.querySelectorAll("[data-mp-step]").forEach(section=>section.hidden=Number(section.dataset.mpStep)!==wizardStep);
 form.querySelector("[data-mp-step-label]").textContent="Step "+(wizardStep+1)+" of 6";
 form.querySelector("[data-mp-progress]").style.width=((wizardStep+1)/6*100)+"%";
 form.querySelector("[data-mp-back]").hidden=wizardStep===0;
 form.querySelector("[data-mp-next]").hidden=wizardStep===5;
 form.querySelector("[data-mp-generate]").hidden=wizardStep!==5;
}

function render(root){
 const saved=read(),p={...defaultPrefs,...saved?.preferences};
 const start=saved?.startDate;
 root.innerHTML='<section class="lu-meal-planner"><header><span class="eyebrow">NUTRITION · PLANNED</span><h2>Meal Planner</h2><p>Choose meals for upcoming days. Planned meals are <strong>not logged as eaten</strong>.</p></header>'+
 '<details class="mp-pref-section" '+(!saved?'open':'')+'><summary>Personalize meal plan <span>Guided setup · 6 steps</span></summary>'+prefsMarkup(p)+'</details>'+
 '<p class="lu-meal-disclaimer">Evaluation catalog: '+MEAL_CATALOG.length+' portion and preparation variants. Ingredient macros are illustrative estimates, not source-verified food labels. Check allergens and quantities before cooking.</p>'+
 (saved?'<div class="lu-meal-toolbar"><strong>Plan starting '+esc(start)+'</strong><button type="button" data-meal-groceries>Grocery list</button></div><div class="lu-meal-days">'+renderDays(saved)+'</div>':'<p>Generate a plan to see the calendar and editable ingredients.</p>')+
 '<div class="lu-meal-grocery" data-meal-grocery hidden></div></section>';
 showWizardStep(root,0);
 root.querySelector("[data-mp-next]")?.addEventListener("click",()=>showWizardStep(root,wizardStep+1));
 root.querySelector("[data-mp-back]")?.addEventListener("click",()=>showWizardStep(root,wizardStep-1));
 root.querySelector("[data-meal-planner-options]")?.addEventListener("submit",event=>{
  event.preventDefault();
  const fd=new FormData(event.currentTarget);
  const coverage=String(fd.get("coverage")||"all");
  const slotChoices=coverage==="all"?MEAL_SLOTS:coverage==="lunch-dinner"?["Lunch","Dinner"]:coverage==="dinner"?["Dinner"]:fd.getAll("slot");
  if(!slotChoices.length){window.alert("Choose at least one meal to plan.");showWizardStep(root,1);return;}
  const diet=String(fd.get("diet")||"balanced");
  const cuisineMap={"Italian":"Mediterranean","Chinese":"Asian","Japanese":"Asian","Thai":"Asian","Indian":"Asian"};
  const rawCuisines=fd.getAll("cuisine");
  const cuisines=[...new Set(rawCuisines.map(x=>cuisineMap[x]||x))];
  const preferences={...p,diet:["vegetarian","vegan","pescatarian"].includes(diet)?diet:"balanced",
   preferredDiet:diet,coverage,cuisines,preferredCuisines:rawCuisines,
   cooking:fd.get("cooking")||"30",days:fd.get("days")||"7",meals:slotChoices,
   skill:fd.get("skill")||"Basic",grocery:fd.get("grocery")||"In-store",prep:fd.get("prep")||"yes",
   leftovers:fd.get("leftovers")||"Sometimes",household:fd.get("household")||"1",
   budget:fd.get("budget")||"Flexible",likes:fd.getAll("liked-food"),likedRecipes:fd.getAll("liked-recipe"),
   dislikes:fd.get("dislikes")||"",allergies:fd.getAll("allergy"),
   priorities:[0,1,2,3,4].map(i=>Number(fd.get("priority-"+i)||3))};
  const today=new Date();
  const start=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  const plan=generatePlan(preferences,start);
  if(write(plan)){selectedPlanDate=start;render(root);}
  else window.alert("Could not save your meal plan.");
 });
 root.querySelector("[data-meal-groceries]")?.addEventListener("click",()=>{
  const panel=root.querySelector("[data-meal-grocery]");panel.hidden=!panel.hidden;
  panel.replaceChildren();
  const title=document.createElement("h3");title.textContent="Grocery list";panel.append(title);
  const list=document.createElement("ul");
  for(const item of groceryList(read())){const li=document.createElement("li");li.textContent=item.food+" — "+item.grams+" g";list.append(li)}panel.append(list);
 });
 root.querySelectorAll("[data-mp-date]").forEach(btn=>btn.addEventListener("click",()=>{selectedPlanDate=btn.dataset.mpDate;render(root);}));
 root.querySelectorAll("[data-mp-day-nav]").forEach(btn=>btn.addEventListener("click",()=>{
  const days=[...new Set(read()?.entries?.map(x=>x.date)||[])];
  const index=days.indexOf(selectedPlanDate);
  selectedPlanDate=days[Math.min(days.length-1,Math.max(0,index+Number(btn.dataset.mpDayNav)))]||selectedPlanDate;render(root);
 }));
 root.querySelectorAll("[data-meal-consume]").forEach(button=>button.addEventListener("click",()=>{
  const {date,slot}=button.dataset;const plan=read();const entry=plan?.entries?.find(item=>item.date===date&&item.slot===slot);if(!entry)return;
  const result=markPlannedMealConsumed(date,slot,entry.ingredients);
  if(result.ok)render(root);else if(result.reason!=="already_logged")window.alert("Could not log this meal: "+result.reason);
 }));
 root.querySelectorAll("[data-meal-undo]").forEach(button=>button.addEventListener("click",()=>{
  const {date,slot}=button.dataset;if(!window.confirm("Remove this planned meal’s logged ingredients from Food Log?"))return;
  const result=undoPlannedMealConsumed(date,slot);if(result.ok)render(root);
 }));
 root.querySelectorAll("[data-meal-replace]").forEach(select=>select.addEventListener("change",()=>{
   const {date,slot}=select.dataset;const updated=replacePlannedMeal(read(),date,slot,select.value);if(write(updated))render(root);
 }));
 root.querySelectorAll("[data-meal-grams]").forEach(input=>input.addEventListener("change",()=>{
   const {date,slot,index}=input.dataset;const updated=editPlannedIngredient(read(),date,slot,Number(index),input.value);if(write(updated))render(root);
 }));
}
let selectedPlanDate="";
function renderDays(plan){
 const dates=[...new Set(plan.entries.map(x=>x.date))];
 if(!dates.includes(selectedPlanDate))selectedPlanDate=dates[0]||"";
 const nav='<nav class="mp-day-carousel" aria-label="Meal plan days"><button type="button" data-mp-day-nav="-1" aria-label="Previous day">‹</button><div class="mp-day-items">'+dates.map(d=>{const x=new Date(d+"T12:00:00");return '<button type="button" class="mp-day-option'+(d===selectedPlanDate?" active":"")+'" data-mp-date="'+esc(d)+'"><small>'+esc(x.toLocaleDateString(undefined,{weekday:"short"}))+'</small><strong>'+x.getDate()+'</strong></button>'}).join("")+'</div><button type="button" data-mp-day-nav="1" aria-label="Next day">›</button></nav>';
 return nav+dates.filter(date=>date===selectedPlanDate).map(date=>{
  const entries=plan.entries.filter(x=>x.date===date);
  const total=entries.reduce((acc,entry)=>{const m=macrosForIngredients(entry.ingredients);for(const key of Object.keys(acc))acc[key]+=m[key];return acc},{calories:0,protein:0,carbs:0,fat:0});
  return '<section class="lu-meal-day"><h3>'+esc(new Date(date+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}))+'</h3><p class="lu-meal-total">Planned ≈ '+Math.round(total.calories)+' kcal · '+Math.round(total.protein)+'g protein · '+Math.round(total.carbs)+'g carbs · '+Math.round(total.fat)+'g fat</p>'+
  entries.map(entry=>{
    const recipe=MEAL_CATALOG.find(x=>x.id===entry.recipeId);
    const options=eligibleMeals(plan.preferences).filter(x=>x.slot===entry.slot);
    const consumed=hasConsumedMeal(date,entry.slot);
    const thumbnail=recipe?photo(mealPhoto(recipe),recipe.name,0):esc(getFoodEmoji({name:entry.ingredients[0]?.food||"meal"}));
    const m=macrosForIngredients(entry.ingredients);
    return '<article class="lu-meal-card"><div class="lu-meal-card-head"><span class="lu-meal-photo" role="img" aria-label="Meal thumbnail">'+thumbnail+'</span><div class="lu-meal-card-info"><label><strong>'+esc(entry.slot)+'</strong><select '+(consumed?'disabled ':'')+'data-meal-replace data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'">'+
      (recipe&&!options.some(x=>x.id===recipe.id)?'<option value="'+esc(recipe.id)+'" selected>'+esc(recipe.name)+'</option>':'')+
      options.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===entry.recipeId?' selected':'')+'>'+esc(x.name)+'</option>').join("")+'</select></label>'+
      (recipe?'<p>≈ '+Math.round(m.calories)+' kcal · P '+Math.round(m.protein)+'g · C '+Math.round(m.carbs)+'g · F '+Math.round(m.fat)+'g</p>':'<p>'+esc(entry.warning||"No matching meal")+'</p>')+
      '<div class="lu-meal-actions">'+(consumed?'<span class="lu-meal-eaten">✓ Consumed</span><button type="button" data-meal-undo data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'">Undo log</button>':recipe?'<button class="primary-btn" type="button" data-meal-consume data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'">Mark Eaten</button>':'')+'</div></div></div>'+
      '<details><summary>Ingredients &amp; portions</summary>'+entry.ingredients.map((item,i)=>'<label class="lu-meal-ingredient"><span class="lu-meal-food-photo" role="img" aria-label="Ingredient thumbnail">'+photo(ingredientPhoto(item.food),item.food,i)+'</span><span>'+esc(item.food)+'</span><input '+(consumed?'disabled ':'')+'type="number" min="0" max="10000" step="1" value="'+Number(item.grams)+'" data-meal-grams data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'" data-index="'+i+'"> g</label>').join("")+'</details>'+(recipe?'<details class="mp-cooking"><summary>Cooking instructions · Step by step</summary><ol>'+recipeSteps({...recipe,ingredients:entry.ingredients}).map(step=>'<li>'+esc(step)+'</li>').join("")+'</ol></details>':'')+
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
</style><div data-meal-planner-root></div>`;}
export function initializeMealPlanner(){
 const root=document.querySelector("[data-meal-planner-root]");if(root)render(root);
}
