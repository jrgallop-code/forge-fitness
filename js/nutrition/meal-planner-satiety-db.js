// Precomputed recipe-level fullness estimates for all Level Up meal variants.
// These are heuristics, NOT the published individual-food Satiety Index.
import {MEAL_CATALOG} from "./meal-planner-data.js?v=3";
import {fullnessEstimate,MEASURED_FOOD_SATIETY} from "./meal-planner-goals.js?v=3";
export const FULLNESS_DATABASE_VERSION="2026-11-21-v1";
export const MEAL_FULLNESS_DB=Object.freeze(Object.fromEntries(MEAL_CATALOG.map(meal=>{
 const result=fullnessEstimate(meal.ingredients);
 return [meal.id,Object.freeze({
  recipeId:meal.id,recipeName:meal.name,mealSlot:meal.slot,
  score:result.score,level:result.level,
  proteinGrams:result.protein,fiberGrams:result.fiber,
  energyDensityKcalPer100g:result.energyDensity,
  method:result.basis,
  relatedMeasuredFoods:result.measuredFoods.map(item=>item.relation),
  notes:"Estimated fullness is for recipe prioritization only, not a validated clinical measure."
 })];
})));
export const SATIETY_RESEARCH_SOURCES=Object.freeze([
 "Holt et al. (1995), A Satiety Index of Common Foods, European Journal of Clinical Nutrition 49(9):675-690, PMID 7498104",
 "Wanders et al. (2011/2013), fibre and satiety systematic review; PMID 23885994"
]);
export function recipeFullness(recipeId){return MEAL_FULLNESS_DB[recipeId]??null;}
