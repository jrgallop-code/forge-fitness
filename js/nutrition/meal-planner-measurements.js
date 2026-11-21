// Friendly cooking measurements are DISPLAY-ONLY approximations.
// Ingredient grams/mL remain unchanged for nutrition, serving scaling, and groceries.
// Tsp and tbsp values are approximate: grind, brand and packing affect density.
const SPOON_GRAMS = Object.freeze([
  [/(\btable salt\b|\bfine salt\b|\bsalt\b)/i,6],
  [/(\bground black pepper\b|\bblack pepper\b|\bwhite pepper\b)/i,2.3],
  [/(\bsmoked paprika\b|\bpaprika\b)/i,2.3],
  [/(\bgarlic powder\b)/i,3.1],
  [/(\bminced garlic\b|\bfresh garlic\b|\bgarlic, minced\b)/i,3],
  [/(\bgrated ginger\b|\bfresh ginger\b)/i,2],
  [/(\bonion powder\b)/i,2.4],
  [/(\bchili powder\b|\bchilli powder\b)/i,2.6],
  [/(\bground cumin\b|\bcumin\b)/i,2.1],
  [/(\bcurry powder\b)/i,2.2],
  [/(\bcinnamon\b)/i,2.6],
  [/(\bturmeric\b)/i,3],
  [/(\bdried oregano\b|\bdried herbs\b|\bitalian seasoning\b|\bdried basil\b|\bdried thyme\b)/i,1],
  [/(\bground ginger\b)/i,1.8],
  [/(\bsesame seeds\b)/i,3],
  [/(\bchili flakes\b|\bred pepper flakes\b)/i,1.8],
  [/(\bseed\b|\bspice\b|\bseasoning\b)/i,2.6],
  [/(\bcooking oil\b|\bolive oil\b|\bsesame oil\b|\bvegetable oil\b)/i,4.55],
  [/(\bhoney\b)/i,7],
  [/(\bmaple syrup\b)/i,6.7],
  [/(\btomato paste\b)/i,5.3],
  [/(\bsoy sauce\b|\boyster sauce\b)/i,5.3],
  [/(\bvinegar\b|\blime juice\b|\blemon juice\b|\bmirin\b|\bwater\b)/i,5],
  [/(\bsriracha\b|\bgochujang\b|\bmustard\b|\bketchup\b|\bb(?:bq)? sauce\b)/i,5],
  [/(\bmayonnaise\b)/i,4.7],
  [/(\bbrown sugar\b|\bgranulated sugar\b)/i,4.2],
  [/(\bgreek yogurt\b|\bplain yogurt\b)/i,5.1],
  [/(\bpeanut butter\b)/i,5.3]
]);
const SPOON_FRACTIONS = ["","⅛","¼","⅜","½","⅝","¾","⅞"];
function amount(value){
  const rounded=(value<0.25?Math.round(value*8)/8:Math.round(value*4)/4);
  const whole=Math.floor(rounded), numerator=Math.round((rounded-whole)*8);
  if(numerator===8)return String(whole+1);
  return (whole?String(whole):"")+(numerator?(whole?" ":"")+SPOON_FRACTIONS[numerator]:"")||"⅛";
}
function gramLabel(value,unit){
  const n=Number(value);
  return (Number.isInteger(n)?String(n):n.toFixed(1).replace(/\.0$/,""))+" "+unit;
}
export function cookingMeasure(food,quantity,unit="g"){
  const grams=Number(quantity),name=String(food??"");
  if(!Number.isFinite(grams)||grams<=0)return gramLabel(0,unit);
  const original=gramLabel(grams,unit);
  // Metric amounts remain the source of truth, including for very small amounts.
  const match=SPOON_GRAMS.find(([pattern])=>pattern.test(name));
  if(!match||!["g","mL"].includes(unit))return original;
  // Most liquids approximate 1 g/mL; oil, honey, soy and yogurt use
  // ingredient-specific density in the table above.
  const gramsPerTsp=unit==="mL"?5:match[1];
  const tsp=grams/gramsPerTsp;
  if(tsp<0.12)return original;
  let value,label;
  if(tsp>=12){value=tsp/48;label="cup";}
  else if(tsp>=3){value=tsp/3;label="tbsp";}
  else {value=tsp;label="tsp";}
  // Show useful kitchen increments without implying lab precision.
  const rounded=Math.max(0.125,Math.round(value*8)/8);
  // Kitchen units lead; the source weight remains visible as a smaller
  // precision reference, not silently converted in stored nutrient data.
  return "≈ "+amount(rounded)+" "+label+(rounded>1&&label==="cup"?"s":"")+" · "+original;
}
export const formatIngredientMeasure=cookingMeasure;
