// Canonical mass units; missing source values remain absent, never fabricated zeroes.
export const EXTRA_NUTRIENTS = [
 // key, unit, USDA nutrient number/id, FatSecret field, Open Food Facts field
 ['saturatedFat','g',['606','1258'],'saturated_fat','saturated-fat'],
 ['transFat','g',['605','1257'],'trans_fat','trans-fat'],
 ['monounsaturatedFat','g',['645','1292'],'monounsaturated_fat','monounsaturated-fat'],
 ['polyunsaturatedFat','g',['646','1293'],'polyunsaturated_fat','polyunsaturated-fat'],
 ['sugars','g',['269','2000'],'sugar','sugars'],
 ['addedSugars','g',['539','1235'],'added_sugars','added-sugars'],
 ['sodium','mg',['307','1093'],'sodium','sodium'],
 ['cholesterol','mg',['601','1253'],'cholesterol','cholesterol'],
 ['calcium','mg',['301','1087'],'calcium','calcium'],
 ['iron','mg',['303','1089'],'iron','iron'],
 ['potassium','mg',['306','1092'],'potassium','potassium'],
 ['magnesium','mg',['304','1090'],null,'magnesium'],
 ['phosphorus','mg',['305','1091'],null,'phosphorus'],
 ['zinc','mg',['309','1095'],null,'zinc'],
 ['copper','mg',['312','1098'],null,'copper'],
 ['manganese','mg',['315','1101'],null,'manganese'],
 ['selenium','µg',['317','1103'],null,'selenium'],
 ['vitaminA','µg',['320','1106'],'vitamin_a','vitamin-a'],
 ['vitaminC','mg',['401','1162'],'vitamin_c','vitamin-c'],
 ['vitaminD','µg',['328','1114'],'vitamin_d','vitamin-d'],
 ['vitaminE','mg',['323','1109'],null,'vitamin-e'],
 ['vitaminK','µg',['430','1185'],null,'vitamin-k'],
 ['thiamin','mg',['404','1165'],null,'vitamin-b1'],
 ['riboflavin','mg',['405','1166'],null,'vitamin-b2'],
 ['niacin','mg',['406','1167'],null,'vitamin-pp'],
 ['pantothenicAcid','mg',['410','1170'],null,'pantothenic-acid'],
 ['vitaminB6','mg',['415','1175'],null,'vitamin-b6'],
 ['vitaminB12','µg',['418','1178'],null,'vitamin-b12'],
 ['folate','µg',['417','1177'],null,'folates'],
 ['folateDFE','µg',['435','1190'],null,null],
 ['choline','mg',['421','1180'],null,'choline']
];
const valid = value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
const units = {G:1,MG:1e-3,UG:1e-6};
const unitName = unit => String(unit || '').trim().toUpperCase().replace(/[µμΜ]/g,'U').replace('MCG','UG');
function convert(value, from, to) {
 const factor = units[unitName(from)], target = units[unitName(to)];
 return valid(value) && factor && target ? Number(value) * factor / target : null;
}
export function extraFatSecretNutrition(serving) {
 return Object.fromEntries(EXTRA_NUTRIENTS.filter(([, , ,field])=>field && valid(serving?.[field])).map(([key,,,field])=>[key,Number(serving[field])]));
}
export function extraOpenFoodFactsNutrition(nutriments,suffix) {
 // OFF's normalized _100g and _serving mass values are in grams, regardless of entry unit.
 return Object.fromEntries(EXTRA_NUTRIENTS.flatMap(([key,unit,,,field])=>{
  const value = field ? convert(nutriments?.[`${field}_${suffix}`],'g',unit) : null;
  return value === null ? [] : [[key,value]];
 }));
}
export function extraOpenFoodFactsSetNutrition(set) {
 return Object.fromEntries(EXTRA_NUTRIENTS.flatMap(([key,unit,,,field])=>{
  const row = field ? set?.nutrients?.[field] : null;
  const value = convert(row?.value,row?.unit,unit);
  return value === null ? [] : [[key,value]];
 }));
}
export function extraUsdaNutrition(food) {
 const rows = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
 return Object.fromEntries(EXTRA_NUTRIENTS.flatMap(([key,unit,ids])=>{
  const row = rows.find(r=>[r.nutrientNumber,r.number,r.nutrientId,r.nutrient?.number,r.nutrient?.id].some(id=>id != null && ids.includes(String(id))));
  const value = convert(row?.value ?? row?.amount,row?.unitName || row?.unit || row?.nutrient?.unitName,unit);
  return value === null ? [] : [[key,value]];
 }));
}
export function extraUsdaLabelNutrition(labels) {
 return Object.fromEntries(EXTRA_NUTRIENTS.filter(([key])=>valid(labels?.[key]?.value)).map(([key])=>[key,Number(labels[key].value)]));
}
