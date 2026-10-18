import { calculateVisibleWeightTrend } from '../core/weight-trend.js';
import { foodAmountMarkup, bindFoodAmountEditor } from '../nutrition/food-portion-editor.js';
import { createNutritionDemo, DEMO_FOODS, toDisplayWeight, saveDemoWeight, demoMealTotals } from './nutrition-tutorial-demo.js';

const steps=[
 ['Your nutrition workspace','Try the main nutrition and weight features with example data. Nothing here changes your real logs or goals.','More → Tutorials'],
 ['Set your goals','Choose an example calorie target, goal weight and weekly loss rate. These practice values are examples, not a personal recommendation.','Nutrition → Goals / Progress → Weight'],
 ['Log a weigh-in','Enter today’s example weight and save it. The chart already has eight weeks of readings so you can see the bigger picture.','Progress → Weight'],
 ['Read your weight trend','The dots are daily weigh-ins. The line smooths those ups and downs. Try a different date range to see the longer view.','Progress → Weight → Trend'],
 ['Understand the weekly rate','This is the pace of your trend per week. A minus means losing weight; a plus means gaining. Compare the pace with your goal rather than reacting to one weigh-in.','Progress → Weight → Rate of change'],
 ['Track your goal weight','Goal progress compares the starting weight with your current trend. Daily fluctuations can move the number around; look at the direction over time.','Progress → Weight → Goal weight'],
 ['Build an example meal','Choose a meal, then open a food. In the real app, search, barcode and available voice tools help you find foods. Always check the match and serving.','Nutrition → Log Food'],
 ['Choose portions and explore nutrients','Enter an amount or change units. A blank amount previews one selected portion. Try the macro chart, swipe to the graphs, open Nutrients and explore the Portion guide. Add the food when ready.','Log Food → Food details'],
 ['Review and swap foods','Check each food and its amount before saving. Edit opens the same food detail layout; Swap lets you replace a mistaken match. Add another food to build your meal.','Nutrition → Meal review'],
 ['Keep the routine simple','Use Recent for foods you repeat, My Meals for saved combinations and My Foods for your own entries. Review calorie and weight trends together, then use the app’s check-in when available to review your targets.','Nutrition → Recent / My Meals / Goals']
];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=false;
export function startNutritionTutorial() {
 if(active)return;active=true;
 let state=createNutritionDemo(),step=0,foodIndex=0,editing=-1,selectedPortion=0,quantity=null;
 let unit='lb';try {const p=JSON.parse(localStorage.getItem('level_up_unit_preferences_v2')||'{}');if(p.bodyWeight==='kg'||(!p.bodyWeight&&localStorage.getItem('level_up_unit_system')==='metric'))unit='kg';}catch{}
 const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='nutrition-practice';dialog.setAttribute('aria-labelledby','nt-title');
 document.body.append(dialog);
 function close(){dialog.querySelector('.food-portion-guide')?.close();dialog.close();dialog.remove();active=false;previous?.focus?.();}
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('click',e=>e.stopPropagation());
 function chart(){
  const result=calculateVisibleWeightTrend(state.weights,{endDate:new Date(`${state.today}T12:00:00`)}),series=result.series.slice(-state.range);
  const values=series.flatMap(e=>[e.weight,e.observedWeight].filter(v=>Number.isFinite(v))),min=Math.min(...values)-.5,max=Math.max(...values)+.5;
  const x=i=>20+i*560/Math.max(1,series.length-1),y=w=>170-(w-min)/(max-min)*145;
  return `<div class="nt-ranges" role="group" aria-label="Weight chart range">${[[7,'1W'],[28,'1M'],[56,'2M']].map(([n,label])=>`<button data-nt-range="${n}" aria-pressed="${state.range===n}">${label}</button>`).join('')}</div><svg viewBox="0 0 600 200" role="img" aria-label="Example daily weigh-ins and smoothed weight trend"><text x="20" y="16" fill="currentColor">${toDisplayWeight(max,unit)} ${unit}</text>${series.map((e,i)=>e.actual?`<circle cx="${x(i)}" cy="${y(e.observedWeight ?? e.weight)}" r="3" fill="currentColor" opacity=".35"/>`:'').join('')}<polyline points="${series.map((e,i)=>`${x(i)},${y(e.weight)}`).join(' ')}" fill="none" stroke="var(--accent, #2979ff)" stroke-width="4"/><text x="20" y="196" fill="currentColor">${series[0]?.date||''}</text><text x="580" y="196" text-anchor="end" fill="currentColor">${series.at(-1)?.date||''}</text></svg><p>Daily weigh-ins · <strong>Smoothed trend</strong></p>`;
 }
 function trend(){return calculateVisibleWeightTrend(state.weights,{endDate:new Date(`${state.today}T12:00:00`)});}
 function foodList(swap=false){return `<div class="nt-list">${DEMO_FOODS.map((f,i)=>`<button data-nt-food="${i}" ${swap?'data-nt-swap="true"':''}><strong>${f.name}</strong><span>${f.portions[0].grams} g per serving · ${f.portions[0].nutrition.calories} kcal <span aria-hidden="true">›</span></span></button>`).join('')}</div>`;}
 function body(){
  if(step===0)return `<div class="nt-card"><h3>Learn by trying</h3><p>Weight history → goals → food logging → meal review.</p><p>Eight weeks of sample weigh-ins are ready. You can close this practice at any time.</p><strong>Practice only · no records will be saved</strong></div>`;
  if(step===1)return `<form data-nt-goals class="nt-card"><label>Daily calories<input name="calories" type="number" inputmode="numeric" min="500" max="10000" required value="${state.calories}"></label><label>Goal weight (${unit})<input name="goal" type="number" inputmode="decimal" step=".1" min="${toDisplayWeight(44,unit)}" max="${toDisplayWeight(1400,unit)}" required value="${toDisplayWeight(state.goal,unit)}"></label><label>Weekly loss goal (${unit})<input name="rate" type="number" inputmode="decimal" step=".1" min=".1" max="3" required value="${toDisplayWeight(state.rate,unit)}"></label><button class="nt-primary">Save example goals</button><p data-nt-status role="status"></p></form>`;
  if(step===2)return `<form data-nt-weight class="nt-card"><label>Today’s example weight (${unit})<input name="weight" type="number" inputmode="decimal" step=".1" min="${toDisplayWeight(44,unit)}" max="${toDisplayWeight(1400,unit)}" placeholder="${toDisplayWeight(173.8,unit)}" required></label><button class="nt-primary">Save example weigh-in</button><p data-nt-status role="status"></p></form>${chart()}`;
  if(step===3)return chart();
  if(step===4){const r=trend(),v=toDisplayWeight(r.weeklyChange,unit);return `${chart()}<div class="nt-card"><h3>${v>0?'+':''}${v} ${unit} / week</h3><p>Current example trend rate</p><p>Example goal: −${toDisplayWeight(state.rate,unit)} ${unit} / week</p><small>This rate uses recent trend data; it is not the difference between two isolated weigh-ins.</small></div>`;}
  if(step===5){const t=trend().trendWeight,start=state.weights[0].weight,p=Math.max(0,Math.min(100,(start-t)/(start-state.goal)*100));return `<div class="nt-card"><h3>Goal: ${toDisplayWeight(state.goal,unit)} ${unit}</h3><label>Example progress <progress value="${state.goal<start?p:0}" max="100"></progress></label><p>Starting: ${toDisplayWeight(start,unit)} ${unit}<br>Current trend: ${toDisplayWeight(t,unit)} ${unit}</p><p>${Math.abs(toDisplayWeight(t-state.goal,unit))} ${unit} between your trend and goal.</p><small>Practice shows a weight-loss goal. Your own phase and targets are set in the app.</small></div>${chart()}`;}
  if(step===6)return `<label>Log to<select data-nt-meal>${['Breakfast','Lunch','Dinner','Snacks'].map(m=>`<option ${state.meal===m?'selected':''}>${m}</option>`).join('')}</select></label>${foodList()}`;
  if(step===7)return `<div class="nt-food"><h3>${DEMO_FOODS[foodIndex].name}</h3>${foodAmountMarkup(DEMO_FOODS[foodIndex],{index:selectedPortion,quantity})}<button class="nt-primary" data-nt-add-food>${editing<0?'Add to example meal':'Update example item'}</button></div>`;
  if(step===8){const totals=demoMealTotals(state.items);return `<div class="nt-card"><h3>${state.meal} · ${state.items.length} items</h3><strong>${Math.round(totals.calories)} kcal</strong><p>Protein ${totals.protein.toFixed(1)} g · Carbs ${totals.carbs.toFixed(1)} g · Fat ${totals.fat.toFixed(1)} g</p></div>${state.items.map((item,i)=>`<article class="nt-card"><h3>${DEMO_FOODS[item.food].name}</h3><p>${item.quantity} × ${DEMO_FOODS[item.food].portions[item.portion].label}</p><div class="nt-actions"><button data-nt-edit="${i}">Edit</button><button data-nt-swap-item="${i}">Swap</button><button data-nt-remove="${i}">Remove</button></div></article>`).join('')||'<p>No example foods yet. Add one to try the review.</p>'}<button data-nt-more>Add another food</button><div data-nt-swap-list></div>`;}
  return `<div class="nt-card"><h3>You’re ready to use your own log</h3><p>Log foods and amounts, keep weigh-ins consistent, and review your longer-term trend.</p><p>Check-ins depend on enough recorded data. A suggested target change is something to review, not a reason to react to a single day.</p><p>All the example data disappears when you finish. Your real records stay as they were.</p></div>`;
 }
 function render(){
  const s=steps[step];dialog.innerHTML=`<header class="nt-header"><span>Practice · Example data</span><button data-nt-close aria-label="Close nutrition walkthrough">×</button></header><main class="nt-main"><small>${step+1} OF ${steps.length} · ${esc(s[2])}</small><h2 id="nt-title" tabindex="-1">${s[0]}</h2><p class="nt-coach">${s[1]}</p>${body()}</main><footer class="nt-footer"><button data-nt-back ${step===0?'disabled':''}>Back</button><span>${step+1} / ${steps.length}</span><button data-nt-next class="nt-primary">${step===steps.length-1?'Finish':'Next'}</button></footer>`;
  dialog.querySelector('[data-nt-close]').onclick=close;
  dialog.querySelector('[data-nt-back]').onclick=()=>{step--;render();};
  dialog.querySelector('[data-nt-next]').onclick=()=>{if(step===steps.length-1)close();else{step++;render();}};
  dialog.querySelectorAll('[data-nt-range]').forEach(b=>b.onclick=()=>{state.range=Number(b.dataset.ntRange);render();});
  const wf=dialog.querySelector('[data-nt-weight]');if(wf)wf.onsubmit=e=>{e.preventDefault();if(saveDemoWeight(state,wf.elements.weight.value,unit)){render();dialog.querySelector('[data-nt-status]').textContent='Example weigh-in saved. Your trend is updated.';}};
  const gf=dialog.querySelector('[data-nt-goals]');if(gf)gf.onsubmit=e=>{e.preventDefault();state.calories=Number(gf.elements.calories.value);state.goal=Number(gf.elements.goal.value)/(unit==='kg'?.45359237:1);state.rate=Number(gf.elements.rate.value)/(unit==='kg'?.45359237:1);gf.querySelector('[data-nt-status]').textContent='Example goals saved.';};
  const meal=dialog.querySelector('[data-nt-meal]');if(meal)meal.onchange=()=>state.meal=meal.value;
  bindChoices();
  if(step===7){const root=dialog.querySelector('.nt-food');bindFoodAmountEditor(root,DEMO_FOODS[foodIndex],{saveSelector:'[data-nt-add-food]',getTargets:()=>({calories:state.calories,protein:150,carbs:300,fat:67}),onUpdate:()=>{selectedPortion=Number(root.querySelector('[data-food-serving]').value);quantity=root.querySelector('[data-food-quantity]').value;}});root.querySelector('[data-nt-add-food]').onclick=()=>{const item={food:foodIndex,portion:Number(root.querySelector('[data-food-serving]').value),quantity:Number(root.querySelector('[data-food-quantity]').value)};if(editing>=0)state.items[editing]=item;else state.items.push(item);editing=-1;step=8;render();};}
  dialog.querySelectorAll('[data-nt-edit]').forEach(b=>b.onclick=()=>{editing=Number(b.dataset.ntEdit);const item=state.items[editing];foodIndex=item.food;selectedPortion=item.portion;quantity=item.quantity;step=7;render();});
  dialog.querySelectorAll('[data-nt-remove]').forEach(b=>b.onclick=()=>{state.items.splice(Number(b.dataset.ntRemove),1);render();});
  dialog.querySelectorAll('[data-nt-swap-item]').forEach(b=>b.onclick=()=>{editing=Number(b.dataset.ntSwapItem);dialog.querySelector('[data-nt-swap-list]').innerHTML='<h3>Choose a replacement</h3>'+foodList(true);bindChoices();});
  const more=dialog.querySelector('[data-nt-more]');if(more)more.onclick=()=>{editing=-1;step=6;render();};
  dialog.querySelector('.nt-main').scrollTop=0;
 }
 function bindChoices(){dialog.querySelectorAll('[data-nt-food]').forEach(b=>b.onclick=()=>{foodIndex=Number(b.dataset.ntFood);if(!b.hasAttribute('data-nt-swap'))editing=-1;selectedPortion=0;quantity=null;step=7;render();});}
 render();dialog.showModal();dialog.querySelector('[data-nt-close]').focus();
}
function install(){
 if(!document.querySelector('link[href*="food-portion-editor.css"]')){const shared=document.createElement('link');shared.rel='stylesheet';shared.href='css/food-portion-editor.css';document.head.append(shared);}
 if(!document.querySelector('[data-nutrition-practice-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='css/nutrition-practice-tour.css?v=1';link.dataset.nutritionPracticeStyle='1';document.head.append(link);}
 function inject(){const shell=document.querySelector('.learn-shell:not(.learn-detail)');if(!shell||shell.querySelector('[data-nutrition-practice-launch]'))return;const card=document.createElement('section');card.className='nt-launch';card.innerHTML='<small>HANDS-ON PRACTICE</small><h3>Nutrition & Weight</h3><p>Practice goals, weigh-ins, trends and food logging with eight weeks of example data. About 5 minutes.</p><button class="nt-primary" data-nutrition-practice-launch>Start nutrition walkthrough</button>';card.querySelector('button').onclick=startNutritionTutorial;shell.querySelector('.learn-library-heading')?.before(card);}
 inject();new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});
}
if(typeof document!=='undefined')install();
