import {MEAL_CATALOG,MEAL_SLOTS,generatePlan,eligibleMeals,macrosForIngredients,groceryList,replacePlannedMeal,editPlannedIngredient,PLANNER_STORAGE_KEY} from "./meal-planner-data.js?v=1";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)||"null")}catch{return null}};
const write=plan=>{try{localStorage.setItem(PLANNER_STORAGE_KEY,JSON.stringify(plan));return true}catch{return false}};
const defaultPrefs={goal:"existing",diet:"balanced",coverage:"all",meals:MEAL_SLOTS,allergies:[],dislikes:"",cuisines:["Mediterranean","North American","Mexican"],cooking:"30",prep:"yes",repeats:"3",household:"1",budget:"flexible",priority:"balanced",days:"7"};
const selectable=(values,selected)=>values.map(x=>'<option value="'+esc(x)+'"'+(selected===x?' selected':'')+'>'+esc(x)+'</option>').join("");
function prefsMarkup(p){
 return '<form data-meal-planner-options class="lu-meal-preferences">'+
 '<label>Diet <select name="diet">'+selectable(["balanced","vegetarian","vegan","pescatarian"],p.diet)+'</select></label>'+
 '<label>Cuisine <select name="cuisine">'+selectable(["All","Mediterranean","North American","Mexican","Asian"],p.cuisines?.length===1?p.cuisines[0]:"All")+'</select></label>'+
 '<label>Cooking time <select name="cooking">'+selectable(["15","20","30","45","60"],String(p.cooking||"30"))+'</select></label>'+
 '<label>Days <select name="days">'+selectable(["3","5","7","14"],String(p.days||"7"))+'</select></label>'+
 '<label>Avoid ingredients <input name="dislikes" placeholder="e.g. mushrooms, salmon" value="'+esc(p.dislikes)+'"></label>'+
 '<label>Allergies (comma-separated) <input name="allergies" placeholder="e.g. milk, peanuts" value="'+esc((p.allergies||[]).join(", "))+'"></label>'+
 '<fieldset><legend>Meals to plan</legend>'+MEAL_SLOTS.map(slot=>'<label class="lu-meal-checkbox"><input type="checkbox" name="slot" value="'+esc(slot)+'" '+((p.meals||[]).includes(slot)?"checked":"")+'>'+esc(slot)+'</label>').join("")+'</fieldset>'+
 '<button class="primary-btn" type="submit">Generate meal plan</button></form>';
}
function render(root){
 const saved=read(),p=saved?.preferences||defaultPrefs;
 const start=saved?.startDate;
 root.innerHTML='<section class="lu-meal-planner"><header><span class="eyebrow">NUTRITION · PLANNED</span><h2>Meal Planner</h2><p>Choose meals for upcoming days. Planned meals are <strong>not logged as eaten</strong>.</p></header>'+
 '<details '+(!saved?'open':'')+'><summary>Preferences &amp; regenerate</summary>'+prefsMarkup(p)+'</details>'+
 '<p class="lu-meal-disclaimer">Evaluation catalog: '+MEAL_CATALOG.length+' portion and preparation variants. Ingredient macros are illustrative estimates, not source-verified food labels. Check allergens and quantities before cooking.</p>'+
 (saved?'<div class="lu-meal-toolbar"><strong>Plan starting '+esc(start)+'</strong><button type="button" data-meal-groceries>Grocery list</button></div><div class="lu-meal-days">'+renderDays(saved)+'</div>':'<p>Generate a plan to see the calendar and editable ingredients.</p>')+
 '<div class="lu-meal-grocery" data-meal-grocery hidden></div></section>';
 root.querySelector("[data-meal-planner-options]")?.addEventListener("submit",event=>{
  event.preventDefault();
  const form=event.currentTarget,fd=new FormData(form);
  const preferences={...p,diet:fd.get("diet"),cuisines:fd.get("cuisine")==="All"?[]:[fd.get("cuisine")],cooking:fd.get("cooking"),days:fd.get("days"),meals:fd.getAll("slot"),dislikes:fd.get("dislikes"),allergies:String(fd.get("allergies")||"").split(",").map(x=>x.trim()).filter(Boolean)};
  const plan=generatePlan(preferences,[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,"0"),String(new Date().getDate()).padStart(2,"0")].join("-"));if(write(plan))render(root);
 });
 root.querySelector("[data-meal-groceries]")?.addEventListener("click",()=>{
  const panel=root.querySelector("[data-meal-grocery]");panel.hidden=!panel.hidden;
  panel.replaceChildren();
  const title=document.createElement("h3");title.textContent="Grocery list";panel.append(title);
  const list=document.createElement("ul");
  for(const item of groceryList(read())){const li=document.createElement("li");li.textContent=item.food+" — "+item.grams+" g";list.append(li)}panel.append(list);
 });
 root.querySelectorAll("[data-meal-replace]").forEach(select=>select.addEventListener("change",()=>{
   const {date,slot}=select.dataset;const updated=replacePlannedMeal(read(),date,slot,select.value);if(write(updated))render(root);
 }));
 root.querySelectorAll("[data-meal-grams]").forEach(input=>input.addEventListener("change",()=>{
   const {date,slot,index}=input.dataset;const updated=editPlannedIngredient(read(),date,slot,Number(index),input.value);if(write(updated))render(root);
 }));
}
function renderDays(plan){
 const dates=[...new Set(plan.entries.map(x=>x.date))];
 return dates.map(date=>{
  const entries=plan.entries.filter(x=>x.date===date);
  const total=entries.reduce((acc,entry)=>{const m=macrosForIngredients(entry.ingredients);for(const key of Object.keys(acc))acc[key]+=m[key];return acc},{calories:0,protein:0,carbs:0,fat:0});
  return '<section class="lu-meal-day"><h3>'+esc(new Date(date+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}))+'</h3><p class="lu-meal-total">Planned ≈ '+Math.round(total.calories)+' kcal · '+Math.round(total.protein)+'g protein · '+Math.round(total.carbs)+'g carbs · '+Math.round(total.fat)+'g fat</p>'+
  entries.map(entry=>{
    const recipe=MEAL_CATALOG.find(x=>x.id===entry.recipeId);
    const options=eligibleMeals(plan.preferences).filter(x=>x.slot===entry.slot);
    const m=macrosForIngredients(entry.ingredients);
    return '<article class="lu-meal-card"><label><strong>'+esc(entry.slot)+'</strong><select data-meal-replace data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'">'+
      (recipe&&!options.some(x=>x.id===recipe.id)?'<option value="'+esc(recipe.id)+'" selected>'+esc(recipe.name)+'</option>':'')+
      options.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===entry.recipeId?' selected':'')+'>'+esc(x.name)+'</option>').join("")+'</select></label>'+
      (recipe?'<p>≈ '+Math.round(m.calories)+' kcal · P '+Math.round(m.protein)+'g · C '+Math.round(m.carbs)+'g · F '+Math.round(m.fat)+'g</p>':'<p>'+esc(entry.warning||"No matching meal")+'</p>')+
      '<details><summary>Edit ingredients</summary>'+entry.ingredients.map((item,i)=>'<label>'+esc(item.food)+' <input type="number" min="0" max="10000" step="1" value="'+Number(item.grams)+'" data-meal-grams data-date="'+esc(date)+'" data-slot="'+esc(entry.slot)+'" data-index="'+i+'"> g</label>').join("")+'</details></article>';
  }).join("")+'</section>';
 }).join("");
}
export function renderMealPlannerShell(){return '<div data-meal-planner-root></div>';}
export function initializeMealPlanner(){
 const root=document.querySelector("[data-meal-planner-root]");if(root)render(root);
}
