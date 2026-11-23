// Three hundred distinct dishes drawn from the public Meal Prep Manual index.
// This is a DISCOVERY catalogue. The first 100 may carry source recipeIngredient
// facts and publisher estimates, but that is NOT a validated Level Up recipe.
// No published instructions, food photography or unverified macros are invented.
import {MPM_INDEX_RECIPES} from "./meal-prep-manual-discovery.js";
import {MPM_REVIEW_100_IMPORTED} from "./mpm-review-first-100-generated.js";
const linked=new Map(MPM_REVIEW_100_IMPORTED.map(item=>[item.id,item]));
export const MPM_CATALOG_300=Object.freeze(MPM_INDEX_RECIPES.slice(0,300).map(item=>{
 const extra=linked.get(item.id)||{};
 const sourceIngredients=Array.isArray(extra.ingredientStatements)?extra.ingredientStatements:[];
 return Object.freeze({...item,
  sourceUrl:extra.sourceUrl||null,
  sourceYield:extra.sourceYield??null,
  prepTime:extra.prepTime??null,
  cookTime:extra.cookTime??null,
  publishedEstimate:extra.publishedEstimate??null,
  sourceUserRating:extra.sourceUserRating??null,
  ingredientStatements:sourceIngredients,
  importStatus:sourceIngredients.length?"publisher-ingredient-facts-imported":"source-ingredients-unavailable",
  sourceInstructionsAvailable:Boolean(extra.sourceInstructionsAvailable),
  canSchedule:false,indexOnly:true,nutritionVerified:false,
  photoStatus:"awaiting-licensed-image",reviewStatus:"needs-ingredient-and-rights-review",
  sourceCollection:"meal-prep-manual"
 });
}));
export const MPM_CATALOG_300_SUMMARY=Object.freeze({
 total:MPM_CATALOG_300.length,
 withSourceIngredients:MPM_CATALOG_300.filter(recipe=>recipe.ingredientStatements.length>0).length,
 awaitingIngredients:MPM_CATALOG_300.filter(recipe=>recipe.ingredientStatements.length===0).length
});
