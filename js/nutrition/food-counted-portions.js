const nutrients = ['calories','protein','carbs','fat','fiber'];
const scale = (n,f) => Object.fromEntries(nutrients.map(k=>[k,Math.max(0,Number(n?.[k])||0)*f]));
const sizes = '(?:extra[ -]large|small|medium|large|jumbo)';
const number = value => Number(Number(value).toFixed(2)).toString();
function wholeEgg(food) {
 const name=String(food?.name || '');
 return /\beggs?\b/i.test(name) && !/\b(?:whites?|yolks?|substitute|powder|liquid|noodles?|sandwich|salad|bites?|roll|omelet|omelette|scrambled|mix|quail|duck|goose)\b/i.test(name);
}
function plainEggFallback(food) {
 const name=String(food?.name || '');
 return wholeEgg(food) && !/\b(?:fried|baked|butter|oil|cheese|bacon)\b/i.test(name) && /\b(?:whole|boiled|poached|raw)\b|^eggs?$/i.test(name);
}
function countInfo(food,portion) {
 if(portion.countUnit && Number(portion.count)>0)return {count:Number(portion.count),countUnit:portion.countUnit,countSize:portion.countSize || ''};
 const label=String(portion.label || '');
 const explicit=label.match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s+(?:(${sizes})\\s+)?(eggs?|slices?|pieces?|bars?|burgers?|cookies?|muffins?|scoops?|fillets?|patt(?:y|ies)|tortillas?)\\b`,'i'));
 if(explicit){const part=label.match(/\beggs?\s+(white|yolk)s?\b/i);const units={eggs:'egg',slices:'slice',pieces:'piece',bars:'bar',burgers:'burger',cookies:'cookie',muffins:'muffin',scoops:'scoop',fillets:'fillet',patties:'patty',tortillas:'tortilla'};return {count:Number(explicit[1]),countUnit:part?`egg ${part[1].toLowerCase()}`:units[explicit[3].toLowerCase()] || explicit[3].toLowerCase(),countSize:(explicit[2] || '').toLowerCase()};}
 // Providers commonly label egg measures "1 large (50 g)" without repeating "egg".
 const eggSize=label.match(new RegExp(`^(?:(\\d+(?:\\.\\d+)?)\\s+)?(${sizes})(?:\\s*\\(|$)`,'i'));
 const partName=String(food.name || '').match(/\beggs?\s+(white|yolk)s?\b/i);
 if((wholeEgg(food)||partName)&&eggSize)return {count:Number(eggSize[1] || 1),countUnit:partName?`egg ${partName[1].toLowerCase()}`:'egg',countSize:eggSize[2].toLowerCase()};
 return null;
}
export function withCountedFoodPortions(food) {
 const portions=(food.portions || []).map(p=>({...p,...countInfo(food,p)}));
 // Edible-weight reference, not shell/package weight. Dataset-provided weights always win.
 // USDA Nutritive Value of Foods, Table 9: whole large egg 50 g, medium 44 g.
 // https://www.ars.usda.gov/ARSUserFiles/80400525/data/hg72/hg72_2002.pdf
 for(const p of portions) {
  if(p.countUnit==='egg' && !(Number(p.grams)>0) && plainEggFallback(food)) {
   const perEgg={large:50,medium:44}[p.countSize];
   if(perEgg)p.grams=perEgg*p.count,p.estimatedCount=true;
  }
 }
 if(plainEggFallback(food) && !portions.some(p=>p.countUnit==='egg')) {
  const basis=portions.find(p=>Number(p.grams)>0 && p.nutrition);
  if(basis)portions.push({label:'1 large egg (50 g)',grams:50,count:1,countUnit:'egg',countSize:'large',estimatedCount:true,nutrition:scale(basis.nutrition,50/basis.grams)});
 }
 // A source portion of two items must still offer one-item entry without changing old indices.
 for(const p of [...portions]) {
  if(!(p.count>1) || portions.some(other=>other.count===1 && other.countUnit===p.countUnit && other.countSize===p.countSize))continue;
  const grams=Number(p.grams)>0?p.grams/p.count:0;
  portions.push({...p,label:`1 ${p.countSize?`${p.countSize} `:''}${p.countUnit}${grams?` (${number(grams)} g)`:''}`,count:1,...(grams?{grams}:{}),...(Number(p.milliliters)>0?{milliliters:p.milliliters/p.count}:{}),nutrition:scale(p.nutrition,1/p.count)});
 }
 return {...food,portions};
}
export function countedPortionLabel(portion) {
 if(portion?.inputUnit)return portion.inputUnit;
 if(portion?.countUnit && Number(portion.count)===1)return `${portion.countSize?`${portion.countSize} `:''}${portion.countUnit}`;
 return String(portion?.label || 'serving').replace(/\s*\([^)]*\)/g,'').replace(/^1\s+/,'');
}
export function countedPortionSummary(food,portion,quantity) {
 if(!(quantity>0))return '';
 let basis=portion, approximate=false;
 if(!basis?.countUnit) {
  if(!(Number(portion?.grams)>0))return '';
  basis=(food.portions || []).find(p=>p.countUnit==='egg'&&p.countSize==='large'&&Number(p.grams)>0) || (food.portions || []).find(p=>p.countUnit&&Number(p.grams)>0);
  if(!basis)return '';
  quantity=quantity*portion.grams/basis.grams;
  approximate=true;
 }
 const count=Number(basis.count)*quantity;
 const noun=count===1?basis.countUnit:basis.countUnit==='patty'?'patties':`${basis.countUnit}s`;
 const grams=Number(basis.grams)>0?basis.grams*quantity:0;
 return `${approximate?'≈ ':''}${number(count)} ${basis.countSize?`${basis.countSize} `:''}${noun}${grams?` · ${number(grams)} g`:''}${basis.estimatedCount?' · estimated':''}`;
}
