// Bundled image atlas generated specifically for the 40 Level Up base recipes.
// 8 columns x 5 rows. Each recipe variant maps to its corresponding base tile.
// The original generated high-resolution artwork is kept outside the JS runtime;
// this compact offline atlas avoids third-party photo requests and broken images.
import a from "./meal-art-part-a.js?v=1";
import b from "./meal-art-part-b.js?v=1";
export const GENERATED_MEAL_ATLAS="data:image/webp;base64,"+a+b;
export function generatedMealTile(recipe){
 const id=Number(String(recipe?.id||"").replace("lu-meal-",""));
 return Number.isFinite(id)&&id>=1&&id<=800 ? Math.floor((id-1)/20) : 0;
}
export function generatedMealBackground(index){
 const n=Math.max(0,Math.min(39,Number(index)||0));
 return "background-image:url("+GENERATED_MEAL_ATLAS+");background-size:800% 500%;background-position:"+(Math.floor(n%8)/7*100)+"% "+(Math.floor(n/8)/4*100)+"%;";
}
