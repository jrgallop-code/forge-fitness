// A simple personal preference, not a claim of recipe or nutrition verification.
// Existing internal review records remain untouched and available for future QA.
export const MEAL_RATINGS_KEY="level_up_meal_recipe_ratings_v1";
export function readRecipeRatings(){
 try{const data=JSON.parse(localStorage.getItem(MEAL_RATINGS_KEY)||"{}");
 return data&&typeof data==="object"&&!Array.isArray(data)?data:{}}catch{return {}}
}
export function getRecipeRating(id){return readRecipeRatings()[id]||null}
export function setRecipeRating(id,vote){
 if(typeof id!=="string"||!id||!["up","down",null].includes(vote))return false;
 const data=readRecipeRatings();
 if(vote===null)delete data[id];else data[id]=vote;
 try{localStorage.setItem(MEAL_RATINGS_KEY,JSON.stringify(data));return true}catch{return false}
}
