// Recipe-specific photography registry. Local AI photo assets are preferred;
// representative photo fallback is explicit so images aren't called AI if not.
// One recipe-base ID = one photograph reused across its 20 portion variants.
// In future generated files may be placed at /assets/meal-photos/001.webp etc.
// AI-generated photographic atlas: first 20 base recipes have matched photographs.
// Other base meals reuse the nearest visual match until their individual images
// can be generated. No third-party network request is required at runtime.
export const AI_ATLAS="/assets/meal-photos/generated-001-020.png";
export const AI_TILE_COUNT=20;
export const PHOTO_SOURCE="generated-food-photography";
const MATCHED_TILE=[
 0,1,2,3,4,5,6,7,8,9,
 10,11,12,13,14,15,16,17,18,19,
 8,4,10,9,11,12,17,10,7,6,
 10,16,7,15,15,1,10,0,15,10
];
export function recipeBaseIndex(recipe){
 const id=Number(String(recipe?.id||"").replace(/^lu-meal-/,""));
 return Number.isFinite(id)&&id>0?Math.min(39,Math.floor((id-1)/20)):0;
}
export function recipePhoto(recipe){
 const baseIndex=recipeBaseIndex(recipe);
 const tile=MATCHED_TILE[baseIndex]??0;
 return {
  primary:AI_ATLAS,
  tile,
  x:tile%5/4*100,
  y:Math.floor(tile/5)/3*100,
  source:PHOTO_SOURCE,
  exactMatch:baseIndex<AI_TILE_COUNT,
  id:baseIndex+1
 };
}
export function dietPhoto(diet){
 const baseByDiet={balanced:7,"high-protein":13,"whole-food":8,
  mediterranean:6,vegetarian:2,vegan:10,pescatarian:6,flexitarian:7,"low-carb":14};
 const i=baseByDiet[diet]??7;
 return recipePhoto({id:"lu-meal-"+String(i*20+1).padStart(3,"0")});
}
export function dietRecipeBaseIndex(diet){
 const matches={balanced:7,"high-protein":13,"whole-food":8,mediterranean:6,
  vegetarian:2,vegan:10,pescatarian:6,flexitarian:7,"low-carb":14};
 return matches[diet]??7;
}
