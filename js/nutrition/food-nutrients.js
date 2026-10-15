export const FOOD_NUTRIENTS = [
 ['fat','Total Fat','g',false,true],['saturatedFat','Saturated Fat','g',true,true],['transFat','Trans Fat','g',true,false],
 ['carbs','Total Carbs','g',false,true],['fiber','Dietary Fibre','g',true,true],['sugars','Sugars','g',true,true],
 ['protein','Protein','g',false,true],['sodium','Sodium','mg',false,true],['cholesterol','Cholesterol','mg',false,true],
 ['calcium','Calcium','mg',false,false],['iron','Iron','mg',false,false],['potassium','Potassium','mg',false,false],['vitaminC','Vitamin C','mg',false,false]
];
const available=value=>value!==null && value!==undefined && value!=='' && Number.isFinite(Number(value)) && Number(value)>=0;
export function nutrientRows(nutrition={},quantity=1,filter='popular') {
 return FOOD_NUTRIENTS.filter(row=>filter==='all'||row[4]).map(([key,label,unit,child])=>{
  const known=available(nutrition[key]) && quantity!==null;
  const value=known?Number(nutrition[key])*quantity:null;
  return {key,label,unit,child,value,text:value===null?'—':`${Number(value.toFixed(unit==='mg'?1:2))} ${unit}`};
 });
}
export function nutrientMarkup(){return `<details class="food-nutrients" open><summary>Nutrients</summary><div class="food-nutrient-filters" role="group" aria-label="Nutrient list"><button type="button" data-nutrient-filter="popular" aria-pressed="true">Popular</button><button type="button" data-nutrient-filter="all" aria-pressed="false">All</button></div><p class="food-nutrient-basis" data-nutrient-basis></p><dl data-food-nutrient-rows></dl><small>— means this food’s source did not provide a value.</small></details>`;}
export function updateNutrients(root,nutrition,quantity,blank=false){
 const host=root.querySelector('[data-food-nutrient-rows]');if(!host)return;
 const filter=root.querySelector('[data-nutrient-filter][aria-pressed="true"]')?.dataset.nutrientFilter || 'popular';
 host.innerHTML=nutrientRows(nutrition,quantity,filter).map(row=>`<div${row.child?' class="is-subnutrient"':''}><dt>${row.label}</dt><dd>${row.text}</dd></div>`).join('');
 const basis=root.querySelector('[data-nutrient-basis]');if(basis)basis.textContent=blank?'For 1 selected portion':'For the entered amount';
}
export function bindNutrients(root,refresh){[...root.querySelectorAll('[data-nutrient-filter]')].filter(button=>['popular','all'].includes(button.dataset.nutrientFilter)).forEach(button=>button.addEventListener('click',()=>{root.querySelectorAll('[data-nutrient-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));refresh();}));}
