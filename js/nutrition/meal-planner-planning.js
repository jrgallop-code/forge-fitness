// Goal-aware plan assembly built on the existing meal catalog.
// Does not modify nutrition targets or consume any foods.
import {generatePlan,eligibleMeals,macrosForIngredients,MEAL_CATALOG} from "./meal-planner-data.js?v=3";
import {allocateMealCalories,fullnessEstimate,fitMealPortions,isWeightLossGoal,currentMealPlannerGoal} from "./meal-planner-goals.js?v=3";

const variantsById=new Map(MEAL_CATALOG.map(r=>[r.id,r]));
const baseKey=recipe=>recipe.id.split("-").at(-1).replace(/^\d+/,"")||String(Math.floor((Number(recipe.id.slice(-3))-1)/20));
function chooseRecipe(candidates,target,goal,used,preferences){
 const likes=new Set(preferences.likedRecipes||[]);
 const preferredFood=(preferences.likes||[]).map(x=>String(x).toLowerCase());
 const lose=isWeightLossGoal(goal);
 return candidates.map(recipe=>{
  const macros=macrosForIngredients(recipe.ingredients);
  const satiety=fullnessEstimate(recipe.ingredients);
  const scale=target>0?target/Math.max(1,macros.calories):1;
  const reachable=scale>=.6&&scale<=2.6;
  const fit=Math.abs(Math.log(Math.max(.01,scale)));
  const base=Math.floor((Number(recipe.id.slice(-3))-1)/20);
  let score=reachable?30:-50;
  score-=fit*22;
  score-=used.get(base)*17||0;
  score+=likes.has(recipe.id)?12:0;
  score+=recipe.ingredients.reduce((v,x)=>v+(preferredFood.some(y=>x.food.includes(y))?2:0),0);
  score+=lose?satiety.score*.48:0;
  if(preferences.preferredDiet==="high-protein")score+=macros.protein/Math.max(1,macros.calories)*65;
  return {recipe,score,base,satiety};
 }).sort((a,b)=>b.score-a.score || a.recipe.id.localeCompare(b.recipe.id))[0];
}
export function generateGoalAwarePlan(preferences={},startDate,appGoal=currentMealPlannerGoal()){
 const inherited=preferences.goalMode!=="custom";
 const goalId=inherited?appGoal.goalId:(preferences.goalType||appGoal.goalId);
 const dailyCalories=inherited?appGoal.dailyCalories:Number(preferences.dailyCalories);
 const allocation=allocateMealCalories({dailyCalories,meals:preferences.meals,calorieCoverage:preferences.calorieCoverage});
 // Explicitly avoid inventing a daily calorie target if the app has none.
 if(!allocation.dailyCalories)return {error:"missing-calorie-target",goal:appGoal};
 const basePlan=generatePlan(preferences,startDate);
 const used=new Map();
 const pool=eligibleMeals(preferences);
 const safePool=eligibleMeals({...preferences,cuisines:[]});
 const entries=basePlan.entries.map(entry=>{
  const target=allocation.perMeal[entry.slot];
  const byCuisine=pool.filter(x=>x.slot===entry.slot);
  const fallback=byCuisine.length?byCuisine:safePool.filter(x=>x.slot===entry.slot);
  if(!fallback.length)return {...entry,targetCalories:target,warning:"No recipes match the selected diet, allergies and cooking time"};
  const picked=chooseRecipe(fallback,target,goalId,used,preferences);
  used.set(picked.base,(used.get(picked.base)||0)+1);
  const fitted=fitMealPortions(picked.recipe.ingredients,target);
  const rest=target-Math.round(fitted.calories);
  return {...entry,recipeId:picked.recipe.id,ingredients:fitted.ingredients,targetCalories:target,
   caloriesWithinTarget:fitted.withinTarget,
   satiety:fullnessEstimate(fitted.ingredients),
   ...(Math.abs(rest)>Math.max(50,target*.12)?{warning:"Portion is outside your target; edit ingredients or swap recipes."}:{}),
   ...(byCuisine.length?{}:{notice:"Using another cuisine to keep your dietary restrictions intact."})};
 });
 return {...basePlan,version:3,preferences:{...preferences,goalId,dailyCalories:allocation.dailyCalories},
  targetAllocation:allocation,goalId,entries};
}
export function refitRecipeForSlot(recipeId,target){
 const recipe=variantsById.get(recipeId);
 if(!recipe)return null;
 const fit=fitMealPortions(recipe.ingredients,target);
 return {ingredients:fit.ingredients,satiety:fullnessEstimate(fit.ingredients),caloriesWithinTarget:fit.withinTarget};
}
