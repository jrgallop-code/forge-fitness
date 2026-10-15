import { foodPhotoIndex } from './food-photo.js';
import { portionMeasure, convertPortionAmount, directPortionSelection, validFoodAmount } from './food-portion-units.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = value => Number(Number(value).toFixed(4)).toString();
const guides=[
 {category:'Meat',title:'Cooked meat',amount:'About 85 g (3 oz)',copy:'Roughly the size of a deck of cards.',index:0},
 {category:'Carbs',title:'Cooked rice',amount:'About ½ cup',copy:'Roughly the volume of a tennis ball. Weight varies by food.',index:1},
 {category:'Fats',title:'Hard cheese',amount:'A small piece',copy:'Compare with two dice. Dice sizes and cheese weights vary.',index:2},
 {category:'Fats',title:'Oil & spreads',amount:'1 tbsp = 3 tsp',copy:'Use level measuring spoons: 15 mL and 5 mL.',index:3}
];
export function foodAmountMarkup(food, {index=0,quantity=1,servingAttr='data-food-serving',quantityAttr='data-food-quantity'}={}) {
 const chosen=directPortionSelection(food,index,quantity);
 const options=food.portions.map((p,i)=>`<option value="${i}"${i===chosen.index?' selected':''}>${escape(p.label)}</option>`).join('');
 const servingIndex=food.portions.findIndex(p=>!/^\d+(?:\.\d+)?\s*(?:g|kg|oz|lb|ml|l)\b/i.test(p.label));
 const servingChip=servingIndex>=0?`<button type="button" data-food-unit="${servingIndex}" aria-pressed="${servingIndex===chosen.index}">serving</button>`:'';
 const unitChips=servingChip+food.portions.map((p,i)=>p.inputUnit?`<button type="button" data-food-unit="${i}" aria-pressed="${i===chosen.index}">${escape(p.inputUnit)}</button>`:'').join('');
 return `<div class="food-amount-top"><label class="food-direct-amount">Amount<input ${quantityAttr} aria-label="Food amount" type="number" inputmode="decimal" min="0.01" max="10000" step="any" value="${fmt(chosen.quantity)}"></label><div class="food-live-calories"><strong data-food-live-calories>—</strong><span>kcal</span></div></div>
 <label class="food-unit-select">Unit / serving<select ${servingAttr} aria-label="Food unit or serving">${options}</select></label>
 <div class="food-unit-chips" role="group" aria-label="Quick units">${unitChips}</div>
 <p class="food-equivalent" data-food-equivalent aria-live="polite"></p>
 <p class="food-amount-error" data-food-amount-error role="alert" hidden>Enter an amount from 0.01 to 10,000.</p>
 <button type="button" class="food-guide-open" data-food-guide-open><span aria-hidden="true">◉</span> Portion guide <span aria-hidden="true">›</span></button>
 <section class="food-live-macros" aria-label="Nutrition for selected amount"><h4>Macros</h4><div>${[['protein','Protein'],['carbs','Carbs'],['fat','Fat']].map(([key,label])=>`<div><span>${label}</span><strong data-food-live-${key}>—</strong></div>`).join('')}</div></section>`;
}
export function foodHeroMarkup(food) {
 return `<div class="food-detail-photo" role="img" aria-label="Representative food category photo" style="background-image:url(assets/food/category-${foodPhotoIndex(food)}.webp)"><span>Representative photo</span></div>`;
}
export function bindFoodAmountEditor(root, food, {servingSelector='[data-food-serving]',quantitySelector='[data-food-quantity]',saveSelector='[data-food-confirm]',onUpdate=()=>{}}={}) {
 const select=root.querySelector(servingSelector), input=root.querySelector(quantitySelector);
 if(!select||!input) return;
 let previous=Number(select.value), notice='';
 const refresh=()=>{
  const p=food.portions[Number(select.value)] || {}, q=Number(input.value), valid=validFoodAmount(input.value);
  const text=(selector,value)=>{const node=root.querySelector(selector);if(node)node.textContent=value;};
  for(const key of ['calories','protein','carbs','fat']) {
   const value=(Number(p.nutrition?.[key])||0)*q;
   text(`[data-food-live-${key}]`,!valid?'—':key==='calories'?Math.round(value).toLocaleString():`${Number(value.toFixed(1))} g`);
  }
  const grams=portionMeasure(p,'grams')*q, ml=portionMeasure(p,'milliliters')*q;
  text('[data-food-equivalent]',notice || (!valid?'':grams>0?`${fmt(grams)} g · ${fmt(grams/28.349523125)} oz${p.estimatedVolume?' · estimated volume conversion':''}`:ml>0?`${fmt(ml)} mL`:`${fmt(q)} × ${p.label || 'serving'}`));
  root.querySelectorAll('[data-food-unit]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.foodUnit===select.value)));
  const error=root.querySelector('[data-food-amount-error]');if(error)error.hidden=valid;
  input.setAttribute('aria-invalid',String(!valid));
  const save=root.querySelector(saveSelector);if(save)save.disabled=!valid;
  previous=Number(select.value);
 };
 const changedUnit=()=>{
  const converted=convertPortionAmount(Number(input.value),food.portions[previous],food.portions[Number(select.value)]);
  notice='';
  if(converted!==null && validFoodAmount(input.value))input.value=fmt(converted);
  else {input.value='1';notice='No measured conversion available. Amount set to 1 for this serving.';}
  refresh();onUpdate();
 };
 select.addEventListener('change',changedUnit);
 input.addEventListener('input',()=>{notice='';refresh();onUpdate();});
 root.querySelectorAll('[data-food-unit]').forEach(button=>button.addEventListener('click',()=>{if(select.value===button.dataset.foodUnit)return;select.value=button.dataset.foodUnit;changedUnit();}));
 root.querySelector('[data-food-guide-open]')?.addEventListener('click',()=>openPortionGuide(root));
 root.foodAmountRefresh=refresh;
 refresh();
}
export function restoreFoodAmount(root,food,index,quantity) {
 const chosen=directPortionSelection(food,index,quantity);
 const select=root.querySelector('[data-food-serving]'),input=root.querySelector('[data-food-quantity]');
 if(select)select.value=String(chosen.index);if(input)input.value=fmt(chosen.quantity);
 root.foodAmountRefresh?.();
}
export function openPortionGuide(root) {
 root.querySelector('.food-portion-guide')?.remove();
 const dialog=document.createElement('dialog');dialog.className='food-portion-guide';dialog.setAttribute('aria-label','Portion guide');
 dialog.innerHTML=`<header><div><small>VISUAL REFERENCES</small><h3>Portion guide</h3></div><button type="button" data-guide-close aria-label="Close portion guide">×</button></header><p>Quick visual estimates</p><nav aria-label="Portion categories">${['All','Meat','Carbs','Fats'].map((c,i)=>`<button type="button" data-guide-category="${c}" aria-pressed="${i===0}">${c}</button>`).join('')}</nav><div class="food-guide-cards" tabindex="0" aria-label="Swipe through portion examples">${guides.map(g=>`<article data-guide-card="${g.category}"><div class="food-guide-photo" role="img" aria-label="${escape(g.title)} portion comparison" style="background-image:url(assets/food/portion-${g.index}.webp)"></div><div><small>${g.title}</small><h4>${g.amount}</h4><p>${g.copy}</p></div></article>`).join('')}</div><p class="food-guide-disclaimer">Approximate visual guides, not measurements. Use a scale or measuring spoon for accuracy.</p><button type="button" class="primary-btn" data-guide-close>Back to food</button>`;
 root.appendChild(dialog);
 dialog.querySelectorAll('[data-guide-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
 dialog.querySelectorAll('[data-guide-category]').forEach(button=>button.addEventListener('click',()=>{
  dialog.querySelectorAll('[data-guide-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  dialog.querySelectorAll('[data-guide-card]').forEach(card=>card.hidden=button.dataset.guideCategory!=='All'&&card.dataset.guideCard!==button.dataset.guideCategory);
  dialog.querySelector('.food-guide-cards').scrollLeft=0;
 }));
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
 dialog.addEventListener('close',()=>{dialog.remove();root.querySelector('[data-food-guide-open]')?.focus();},{once:true});
 dialog.showModal();
}
