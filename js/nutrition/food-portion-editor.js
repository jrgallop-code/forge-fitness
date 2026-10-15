import { countedPortionLabel, countedPortionSummary } from "./food-counted-portions.js";
import { FOOD_PORTION_GUIDES as guides } from "./food-portion-guide-data.js";
import { macroCarouselMarkup, updateMacroCarousel, bindMacroCarousel } from "./food-macro-chart.js";
import { foodPhotoIndex } from './food-photo.js';
import { portionMeasure, convertPortionAmount, directPortionSelection, validFoodAmount, formatConvertedPortionAmount } from './food-portion-units.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function foodAmountMarkup(food, {index=0,quantity=1,servingAttr='data-food-serving',quantityAttr='data-food-quantity'}={}) {
 const chosen=directPortionSelection(food,index,quantity);
 const options=food.portions.map((p,i)=>`<option value="${i}"${i===chosen.index?' selected':''}>${escape(p.inputUnit || p.label)}</option>`).join('');
 const directGrams=food.portions.some(p=>p.inputUnit==='g');
 const choices=food.portions.map((p,i)=>({portion:p,index:i})).filter(({portion:p})=>p.inputUnit || (!/^quantity not specified/i.test(p.label) && !(directGrams && /^\d+(?:\.\d+)?\s*(?:g|kg|oz|lb)\b/i.test(p.label))));
 if(!choices.length && food.portions.length)choices.push({portion:food.portions[0],index:0});
 const unitLabel=countedPortionLabel;
 const unitChips=choices.map(({portion:p,index:i})=>`<button type="button" data-food-unit="${i}" aria-label="${escape(p.label)}" aria-pressed="${i===chosen.index}">${escape(unitLabel(p))}</button>`).join('');
 return `<div class="food-amount-top"><div class="food-direct-entry"><label class="food-direct-amount"><span class="food-visually-hidden">Amount</span><input ${quantityAttr} aria-label="Food amount" type="number" inputmode="decimal" min="0.01" max="10000" step="any" value="${formatConvertedPortionAmount(chosen.quantity,food.portions[chosen.index])}"></label><span class="food-direct-unit" data-food-selected-unit>${escape(unitLabel(food.portions[chosen.index]))}</span><select ${servingAttr} hidden aria-hidden="true" tabindex="-1">${options}</select></div><div class="food-live-calories"><strong data-food-live-calories>—</strong><span>kcal</span></div></div>
 <p class="food-equivalent" data-food-equivalent aria-live="polite" hidden></p>
 <p class="food-amount-error" data-food-amount-error role="alert" hidden>Enter an amount from 0.01 to 10,000.</p>
 <div class="food-unit-chips" role="group" aria-label="Quick units">${unitChips}<button type="button" class="food-guide-open" data-food-guide-open>Portion<br>guide</button></div>
 ${macroCarouselMarkup()}`;
}
export function foodHeroMarkup(food) {
 const index=foodPhotoIndex(food);
 if(index===null) return `<div class="food-detail-photo food-photo-neutral" role="group" aria-label="No matching food photo"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="23"/><path d="M7 15v21m6-21v21m-9-9h12M10 36v49M90 15v70m0-70c-12 13-12 27 0 27"/></svg></div>`;
 return `<div class="food-detail-photo" role="group" aria-label="Representative food photo" style="background-image:url(assets/food/category-${index}.webp)"><span>Representative photo</span></div>`;
}
export function bindFoodAmountEditor(root, food, {servingSelector='[data-food-serving]',quantitySelector='[data-food-quantity]',saveSelector='[data-food-confirm]',onUpdate=()=>{},getTargets=()=>({})}={}) {
 const select=root.querySelector(servingSelector), input=root.querySelector(quantitySelector);
 if(!select||!input) return;
 let notice='';
 let currentPortion=food.portions[Number(select.value)];
 let basis={portion:food.portions[Number(select.value)],quantity:Number(input.value),text:input.value};
 const rebase=()=>{basis={portion:food.portions[Number(select.value)],quantity:Number(input.value),text:input.value};};
 const refresh=()=>{
  const p=food.portions[Number(select.value)] || {}, q=Number(input.value), valid=validFoodAmount(input.value);
  const text=(selector,value)=>{const node=root.querySelector(selector);if(node)node.textContent=value;};
  text('[data-food-selected-unit]',countedPortionLabel(p));
  text('[data-food-live-calories]',valid?Math.round((Number(p.nutrition?.calories)||0)*q).toLocaleString():'—');
  updateMacroCarousel(root,p.nutrition,q,getTargets(),valid);
  const grams=portionMeasure(p,'grams')*q;
  const countSummary=valid?countedPortionSummary(food,p,q):'';
  const equivalent=notice || countSummary || (!valid || !(grams>0) || p.inputUnit==='g' ? '' : `Weight: ${Number(grams.toFixed(1))} g${p.estimatedVolume?' · estimated':''}`);
  text('[data-food-equivalent]',equivalent);
  const equivalentNode=root.querySelector('[data-food-equivalent]');if(equivalentNode){equivalentNode.hidden=!equivalent;equivalentNode.classList?.toggle('is-counted',!!countSummary);}
  root.querySelectorAll('[data-food-unit]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.foodUnit===select.value)));
  const error=root.querySelector('[data-food-amount-error]');if(error)error.hidden=valid;
  input.setAttribute('aria-invalid',String(!valid));
  const save=root.querySelector(saveSelector);if(save)save.disabled=!valid;
  currentPortion=p;
 };
 const changedUnit=()=>{
  const target=food.portions[Number(select.value)];
  const countResize=currentPortion?.countUnit && currentPortion.countUnit===target?.countUnit;
  const converted=countResize?convertPortionAmount(Number(input.value),currentPortion,target):convertPortionAmount(basis.quantity,basis.portion,target,{preserveCount:false});
  notice='';
  if(converted!==null && validFoodAmount(input.value))input.value=!countResize && target===basis.portion?basis.text:formatConvertedPortionAmount(converted,target);
  else {input.value='1';rebase();notice='No measured conversion available. Amount set to 1 for this serving.';}
  if(countResize)rebase();
  refresh();onUpdate();
 };
 select.addEventListener('change',changedUnit);
 input.addEventListener('input',()=>{notice='';rebase();refresh();onUpdate();});
 root.querySelectorAll('[data-food-unit]').forEach(button=>button.addEventListener('click',()=>{if(select.value===button.dataset.foodUnit)return;select.value=button.dataset.foodUnit;changedUnit();}));
 root.querySelector('[data-food-guide-open]')?.addEventListener('click',()=>openPortionGuide(root));
 bindMacroCarousel(root);
 root.foodAmountRefresh=refresh;
 root.foodAmountRebase=()=>{rebase();refresh();};
 refresh();
}
export function restoreFoodAmount(root,food,index,quantity) {
 const chosen=directPortionSelection(food,index,quantity);
 const select=root.querySelector('[data-food-serving]'),input=root.querySelector('[data-food-quantity]');
 if(select)select.value=String(chosen.index);if(input)input.value=formatConvertedPortionAmount(chosen.quantity,food.portions[chosen.index]);
 root.foodAmountRebase?.();
}
export function openPortionGuide(root) {
 root.querySelector('.food-portion-guide')?.remove();
 const dialog=document.createElement('dialog');dialog.className='food-portion-guide';dialog.setAttribute('aria-label','Portion guide');
 dialog.innerHTML=`<header><h3>Portion guide</h3><button type="button" data-guide-close aria-label="Close portion guide">×</button></header><div class="food-guide-cards" tabindex="0" aria-label="Swipe through portion examples">${guides.map(g=>`<article><div class="food-guide-photo" role="img" aria-label="${escape(g.title)} portion comparison" style="background-image:url(assets/food/guide-${g.index}.webp)"><h4>${g.amount}</h4><small>${g.copy}</small></div></article>`).join('')}</div><nav class="food-guide-pager" aria-label="Portion examples">${guides.map((g,i)=>`<button type="button" data-guide-page="${i}" aria-label="Show ${g.title}" aria-pressed="${i===0}"></button>`).join('')}</nav><p class="food-guide-disclaimer">Approximate sizes. Use a scale or measuring spoon for accuracy.</p>`;
 root.appendChild(dialog);
 const track=dialog.querySelector('.food-guide-cards');
 const buttons=[...dialog.querySelectorAll('[data-guide-page]')];
 const stride=()=>track.querySelector('article').getBoundingClientRect().width+12;
 const go=index=>track.scrollTo({left:Math.max(0,Math.min(guides.length-1,index))*stride(),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 buttons.forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.guidePage))));
 track.addEventListener('scroll',()=>{const index=Math.round(track.scrollLeft/Math.max(1,stride()));buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.guidePage)===index)));},{passive:true});
 track.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();go(Math.round(track.scrollLeft/Math.max(1,stride()))+(event.key==='ArrowRight'?1:-1));});
 dialog.querySelector('[data-guide-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
 dialog.addEventListener('close',()=>{dialog.remove();root.querySelector('[data-food-guide-open]')?.focus();},{once:true});
 dialog.showModal();
}
