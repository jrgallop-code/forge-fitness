// Optional values stay absent when the source does not report them. Units: g or mg.
const fields={saturatedFat:['saturated_fat','saturated-fat','606','1258'],transFat:['trans_fat','trans-fat','605','1257'],sugars:['sugar','sugars','269','2000'],sodium:['sodium','sodium','307','1093'],cholesterol:['cholesterol','cholesterol','601','1253'],calcium:['calcium','calcium','301','1087'],iron:['iron','iron','303','1089'],potassium:['potassium','potassium','306','1092'],vitaminC:['vitamin_c','vitamin-c','401','1162']};
const valid=value=>value!==undefined&&value!==null&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0;
export function extraFatSecretNutrition(serving){return Object.fromEntries(Object.entries(fields).filter(([,v])=>valid(serving?.[v[0]])).map(([key,v])=>[key,Number(serving[v[0]])]));}
export function extraOpenFoodFactsNutrition(nutriments,suffix){return Object.fromEntries(Object.entries(fields).filter(([,v])=>valid(nutriments?.[`${v[1]}_${suffix}`])).map(([key,v])=>[key,Number(nutriments[`${v[1]}_${suffix}`])*(v[2]==='606'||v[2]==='605'||v[2]==='269'?1:1000)]));}
export function extraUsdaNutrition(food){
 const rows=Array.isArray(food?.foodNutrients)?food.foodNutrients:[];
 return Object.fromEntries(Object.entries(fields).flatMap(([key,v])=>{
  const row=rows.find(r=>[v[2],v[3]].includes(String(r.nutrientNumber||r.number||r.nutrientId||r.nutrient?.number||r.nutrient?.id)));
  const value=row?.value??row?.amount;
  if(!valid(value))return [];
  const unit=String(row.unitName||row.unit||row.nutrient?.unitName||'').toUpperCase();
  const expected=['saturatedFat','transFat','sugars'].includes(key)?'G':'MG';
  if(unit!==expected && !['G','MG','UG','µG'].includes(unit))return [];
  const mg=unit==='G'?Number(value)*1000:unit==='MG'?Number(value):Number(value)/1000;
  return [[key,expected==='G'?mg/1000:mg]];
 }));
}
export function extraUsdaLabelNutrition(labels){const mapping={saturatedFat:'saturatedFat',transFat:'transFat',sugars:'sugars',sodium:'sodium',cholesterol:'cholesterol',calcium:'calcium',iron:'iron',potassium:'potassium',vitaminC:'vitaminC'};return Object.fromEntries(Object.entries(mapping).filter(([,v])=>valid(labels?.[v]?.value)).map(([k,v])=>[k,Number(labels[v].value)]));}
