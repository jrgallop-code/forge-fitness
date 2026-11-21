// Stable, nonrepeating photographic tile assignments for the visible iOS recipe catalogue.
// The forty base recipes have one AI-generated tile each. Portions of the same
// recipe intentionally retain the same image, as they are not distinct dishes.
// Featured adaptations use a separate eight-tile selection from the 20-photo
// generated asset; their composition is illustrative, not independently photo-verified.
import { GENERATED_MEAL_ATLAS } from "./meal-planner-art.js?v=1";
export const AI_ATLAS="/assets/meal-photos/generated-001-020.png";
export const AI_TILE_COUNT=20;
export const PHOTO_SOURCE="generated-food-photography";
const FEATURED_TILES=Object.freeze({
 "reference-creamy-cilantro-lime-chicken":7,
 "reference-sheet-pan-teriyaki-chicken":12,
 "reference-korean-bbq-beef-bowls":13,
 "reference-honey-garlic-chicken":6,
 "reference-chicken-tikka-masala":15,
 "reference-japanese-ground-beef-curry":14,
 "reference-mediterranean-chicken-wraps":9,
 "reference-honey-garlic-chicken-noodle-bowls":17
});
export function recipeBaseIndex(recipe){
 const id=Number(String(recipe?.id||"").replace(/^lu-meal-/,""));
 return Number.isFinite(id)&&id>0?Math.min(39,Math.floor((id-1)/20)):0;
}
export function recipePhoto(recipe){
 const featuredIndex=FEATURED_TILES[recipe?.id];
 if(Number.isInteger(featuredIndex))return {
  primary:AI_ATLAS,tile:featuredIndex,x:(featuredIndex%5)/4*100,
  y:Math.floor(featuredIndex/5)/3*100,source:PHOTO_SOURCE,
  exactMatch:false,recipeId:recipe.id,backgroundSize:"500% 400%"
 };
 const i=recipeBaseIndex(recipe);
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
