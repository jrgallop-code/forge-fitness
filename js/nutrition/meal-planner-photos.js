// Stable, nonrepeating photographic tile assignments for the visible iOS recipe catalogue.
// The forty base recipes have one AI-generated tile each. Portions of the same
// recipe intentionally retain the same image, as they are not distinct dishes.
// Featured adaptations use eight distinct AI-generated food concept images;
// these are visual concepts, not photos of the exact cooked recipes.
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
// A hashed tile is not a recipe match. Unreviewed dishes must not display
// another dish's photo (e.g. chia pudding presented as Mediterranean beef).
// Give them an honest pending-image state until a recipe-specific asset is
// created and approved in the catalogue manifest.
const PHOTO_PENDING=Object.freeze({
 primary:null,source:"photo-pending",exactMatch:false,backgroundSize:null,
 x:50,y:50,tile:null,requiresReview:true
});
// These five photographs were independently generated for the named dishes,
// using source descriptions and ingredient lists. Never assign by position.
export const RECIPE_MATCHED_SOURCE_PHOTOS=Object.freeze({
 "big boy korean bbq beef bowls":"/assets/meal-photos/source-recreations/big-boy-korean-bbq-beef-bowls.webp",
 "mediterranean spiced beef":"/assets/meal-photos/source-recreations/mediterranean-spiced-beef.webp",
 "broccoli cheddar rice":"/assets/meal-photos/source-recreations/broccoli-cheddar-rice.webp",
 "veggie rice":"/assets/meal-photos/source-recreations/veggie-rice.webp",
 "creamy cilantro lime chicken bowls":"/assets/meal-photos/source-recreations/creamy-cilantro-lime-chicken-bowls.webp"
});
const photoRecipeName=name=>String(name||"").normalize("NFKC").toLowerCase()
 .replace(/[^a-z0-9]+/g," ").trim();
export function recipePhoto(recipe){
 const matched=RECIPE_MATCHED_SOURCE_PHOTOS[photoRecipeName(recipe?.name)];
 if(matched)return {primary:matched+"?v=source-photo-sr-800-20261124",tile:0,x:50,y:50,backgroundSize:"cover",
  source:"recipe-matched-ai-food-photograph",exactMatch:true,
  recipeId:recipe?.id,requiresReview:false};
 // An indexed source recipe only earns a photo after manual ingredient/image
 // approval; a valid asset path alone does not establish the right dish.
 if(recipe?.indexOnly && recipe?.imageReviewed !== true)
  return {...PHOTO_PENDING,recipeId:recipe?.id};
 // Unreviewed cloud mosaics can contain cartoons, unrelated dishes and low-resolution tiles.
 // Use approved named photographs or a neutral pending state until each asset is reviewed.

 if(recipe?.indexOnly || (!/^lu-meal-/.test(String(recipe?.id||"")) && !Object.prototype.hasOwnProperty.call(FEATURED_TILES,recipe?.id))){
  return {...PHOTO_PENDING,recipeId:recipe?.id};
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
 return {...PHOTO_PENDING,recipeId:recipe?.id};
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
