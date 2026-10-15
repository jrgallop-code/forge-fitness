export const MACRO_KEYS = ['carbs', 'protein', 'fat'];
export function foodMacroModel(nutrition = {}, quantity = 1, targets = {}) {
 const multiplier = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
 const grams = Object.fromEntries(MACRO_KEYS.map(key => [key, Math.max(0, Number(nutrition[key]) || 0) * multiplier]));
 const energy = Object.fromEntries(MACRO_KEYS.map(key => [key, grams[key] * (key === 'fat' ? 9 : 4)]));
 const total = Object.values(energy).reduce((a,b) => a+b, 0);
 const hasTargets = MACRO_KEYS.every(key => Number.isFinite(Number(targets?.[key])) && Number(targets[key]) > 0);
 return {grams, total, hasTargets, shares: Object.fromEntries(MACRO_KEYS.map(key => [key, total ? energy[key]/total*100 : 0])), bars: Object.fromEntries(MACRO_KEYS.map(key => [key, hasTargets ? grams[key]/Number(targets[key])*100 : total ? energy[key]/total*100 : 0]))};
}
export function macroCarouselMarkup() {
 return `<section class="food-macro-section" aria-label="Macro breakdown"><h4>Macros</h4><div class="food-macro-pages" tabindex="0" aria-label="Swipe between macro pie chart and bars"><section class="food-macro-page food-macro-pie-page" aria-label="Calorie share"><div class="food-macro-pie" data-food-macro-pie role="img" aria-label="Macro calorie shares"></div><div class="food-macro-legend">${MACRO_KEYS.map(key=>`<div data-macro-key="${key}"><i aria-hidden="true"></i><span>${key==='carbs'?'Carbs':key==='protein'?'Protein':'Fat'}<small data-food-live-${key}>—</small></span><strong data-food-macro-percent="${key}">—</strong></div>`).join('')}</div><small class="food-macro-note">Share of calories from macros</small></section><section class="food-macro-page food-macro-bars-page" aria-label="Macro bars"><small data-food-macro-bars-label>Calorie contribution</small>${MACRO_KEYS.map(key=>`<div class="food-macro-bar-row" data-macro-key="${key}"><div><span>${key==='carbs'?'Carbs':key==='protein'?'Protein':'Fat'} <small data-food-bar-grams="${key}">—</small></span><strong data-food-bar-percent="${key}">—</strong></div><div class="food-macro-track"><i data-food-macro-bar="${key}"></i></div></div>`).join('')}</section></div><nav class="food-macro-pager" aria-label="Macro views"><button type="button" data-macro-page="0" aria-label="Show pie chart" aria-pressed="true"></button><button type="button" data-macro-page="1" aria-label="Show macro bars" aria-pressed="false"></button></nav></section>`;
}
export function updateMacroCarousel(root, nutrition, quantity, targets, valid = true) {
 const model=foodMacroModel(nutrition,valid?quantity:0,targets);
 const text=(selector,value)=>{const node=root.querySelector(selector);if(node)node.textContent=value;};
 const pie=root.querySelector('[data-food-macro-pie]');
 if(pie) {
  pie.style.setProperty('--food-carb-end',`${model.shares.carbs}%`);
  pie.style.setProperty('--food-protein-end',`${model.shares.carbs+model.shares.protein}%`);
  pie.classList.toggle('is-empty',model.total===0);
  pie.setAttribute('aria-label',model.total ? MACRO_KEYS.map(k=>`${k} ${Math.round(model.shares[k])}%`).join(', ') : 'No macro calorie data');
 }
 for(const key of MACRO_KEYS) {
  const grams=valid?`${Number(model.grams[key].toFixed(1))} g`:'—';
  text(`[data-food-live-${key}]`,grams);text(`[data-food-bar-grams="${key}"]`,grams);
  text(`[data-food-macro-percent="${key}"]`,valid?`${Math.round(model.shares[key])}%`:'—');
  text(`[data-food-bar-percent="${key}"]`,valid?`${Math.round(model.bars[key])}%`:'—');
  const bar=root.querySelector(`[data-food-macro-bar="${key}"]`);if(bar)bar.style.width=`${Math.min(100,model.bars[key])}%`;
 }
 text('[data-food-macro-bars-label]',model.hasTargets?'Of your daily macro targets':'Share of calories from macros');
}
export function bindMacroCarousel(root) {
 const track=root.querySelector('.food-macro-pages');if(!track)return;
 const buttons=[...root.querySelectorAll('[data-macro-page]')];
 const selected=()=>{const index=Math.round(track.scrollLeft/Math.max(1,track.clientWidth));buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.macroPage)===index)));};
 const go=index=>track.scrollTo({left:Math.max(0,Math.min(1,index))*track.clientWidth,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 buttons.forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.macroPage))));
 track.addEventListener('scroll',selected,{passive:true});
 track.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();go(Math.round(track.scrollLeft/Math.max(1,track.clientWidth))+(event.key==='ArrowRight'?1:-1));});
}
