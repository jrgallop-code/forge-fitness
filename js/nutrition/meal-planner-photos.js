// Stable, nonrepeating photographic tile assignments for the visible iOS recipe catalogue.
// The forty base recipes have one AI-generated tile each. Portions of the same
// recipe intentionally retain the same image, as they are not distinct dishes.
// Featured adaptations use eight distinct AI-generated food concept images;
// these are visual concepts, not photos of the exact cooked recipes.
import { GENERATED_MEAL_ATLAS } from "./meal-planner-art.js?v=1";
// Each featured recipe uses a distinct tile of the full-resolution local AVIF asset.
export const FEATURED_HQ_ATLAS="/assets/meal-photos/featured8-hq.avif?v=3";
export const AI_ATLAS="/assets/meal-photos/generated-001-020.png";
export const AI_TILE_COUNT=20;
export const PHOTO_SOURCE="generated-food-photography";
const FEATURED_TILES=Object.freeze({
 "reference-creamy-cilantro-lime-chicken":0,
 "reference-sheet-pan-teriyaki-chicken":1,
 "reference-korean-bbq-beef-bowls":2,
 "reference-honey-garlic-chicken":3,
 "reference-chicken-tikka-masala":4,
 "reference-japanese-ground-beef-curry":5,
 "reference-mediterranean-chicken-wraps":6,
 "reference-honey-garlic-chicken-noodle-bowls":7
});
export function recipeBaseIndex(recipe){
 const id=Number(String(recipe?.id||"").replace(/^lu-meal-/,""));
 return Number.isFinite(id)&&id>0?Math.min(39,Math.floor((id-1)/20)):0;
}
// Source-index previews have no dedicated production photography yet. Use
// a deterministic generated-food atlas illustration, never a blank tile.
// This does not imply exact plating or a verified recipe.
function illustrationTile(recipe){
 const value=String(recipe?.id||recipe?.name||"meal");
 let hash=2166136261;
 for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);
 return (hash>>>0)%40;
}
export function recipePhoto(recipe){
 const cloudImage=recipe?.image;
 if(cloudImage && typeof cloudImage==="object" && /^\\/assets\\/meal-photos\\/[a-z0-9-]+\\.(?:avif|png|webp)$/.test(cloudImage.asset||"")){
  const cols=Math.max(1,Math.min(10,Number(cloudImage.columns)||1));
  const rows=Math.max(1,Math.min(10,Number(cloudImage.rows)||1));
  const tile=Math.max(0,Math.min(cols*rows-1,Number(cloudImage.tile)||0));
  return {primary:cloudImage.asset,tile,x:cols>1?(tile%cols)/(cols-1)*100:50,
   y:rows>1?Math.floor(tile/cols)/(rows-1)*100:50,source:"generated-representative-photo",
   exactMatch:false,recipeId:recipe?.id,backgroundSize:(cols*100)+"% "+(rows*100)+"%"};
 }

 if(recipe?.indexOnly || !/^lu-meal-/.test(String(recipe?.id||"")) && !Object.prototype.hasOwnProperty.call(FEATURED_TILES,recipe?.id)){
  const tile=illustrationTile(recipe);
  return {primary:GENERATED_MEAL_ATLAS,tile,x:tile%8/7*100,y:Math.floor(tile/8)/4*100,
   source:"generated-illustrative-food-atlas",exactMatch:false,recipeId:recipe?.id,backgroundSize:"800% 500%"};
 }

 const featuredIndex=FEATURED_TILES[recipe?.id];
 if(Number.isInteger(featuredIndex))return {
  primary:FEATURED_HQ_ATLAS,tile:featuredIndex,x:(featuredIndex%4)/3*100,
  y:Math.floor(featuredIndex/4)*100,source:PHOTO_SOURCE,
  exactMatch:false,recipeId:recipe.id,backgroundSize:"400% 200%"
 };
 const i=recipeBaseIndex(recipe);
 if(i>=20&&i<30){const tile=i-20;return {primary:"/assets/meal-photos/base20-29-hq.avif?v=1",tile,x:(tile%5)/4*100,y:Math.floor(tile/5)*100,source:PHOTO_SOURCE,exactMatch:true,recipeId:recipe?.id,backgroundSize:"500% 200%"};}
 // Restore the high-resolution photographic atlas for the first twenty
 // verified base-image positions. The tiny offline JS sprite is too low
 // resolution for iPhone retina recipe-card and full-screen detail sizes.
 if(i<AI_TILE_COUNT)return {
  primary:AI_ATLAS,tile:i,x:(i%5)/4*100,
  y:Math.floor(i/5)/3*100,source:PHOTO_SOURCE,
  exactMatch:true,recipeId:recipe?.id,backgroundSize:"500% 400%"
 };
 return {
  primary:GENERATED_MEAL_ATLAS,tile:i,x:(i%8)/7*100,
  y:Math.floor(i/8)/4*100,source:PHOTO_SOURCE,
  exactMatch:true,recipeId:recipe?.id,backgroundSize:"800% 500%"
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
