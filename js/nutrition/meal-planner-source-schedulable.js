// Promote only image-matched source dishes with published ingredient lists into
// the same planner model as earlier Level Up recipes. Source amounts and nutrition
// remain publisher estimates; grocery weights are approximate conversions.
import {sourceRecipeSteps} from "./meal-planner-source-prep.js?v=ingredient-drafts-20261124";
const ELIGIBLE=new Set([
 "Big Boy Korean BBQ Beef Bowls","Mediterranean Spiced Beef",
 "Broccoli Cheddar Rice","Veggie Rice","Creamy Cilantro Lime Chicken Bowls"
]);
const category=t=>{
 if(/beef|chicken|turkey|pork|fish|salmon|shrimp|egg/.test(t))return "Protein";
 if(/rice|flour|potato/.test(t))return "Rice & starches";
 if(/milk|cheddar|cheese|yogurt|butter|cream/.test(t))return "Dairy & sauces";
 if(/broccoli|kale|carrot|zucchini|onion|garlic|cilantro|jalapeño|lemon|lime/.test(t))return "Vegetables & aromatics";
 return "Seasonings & pantry";
};
const numberOf=s=>{
 const m=String(s).trim().match(/^(\d+(?:\.\d+)?|\.\d+)\s*(?:\/\s*(\d+(?:\.\d+)?))?/);
 if(!m)return null;
 return Number(m[1])/(m[2]?Number(m[2]):1);
};
// Common kitchen equivalents are only for planning/grocery estimates; the
// publisher's unmodified ingredient statements remain on every recipe.
export function estimateIngredientBatchGrams(description){
 const text=String(description||"").toLowerCase().trim(),amount=numberOf(text);
 if(!amount||!Number.isFinite(amount))return null;
 let unit=(text.match(/^(?:\d+(?:\.\d+)?|\.\d+)\s*(?:lbs?|pounds?|kg|g|grams?|cups?|tbsp|tablespoons?|tsp|teaspoons?|cloves?|bunch|stalks?|cans?|medium|large|small|lb)(?:\b|\s)/)||[])[0]||"";
 unit=unit.replace(/^[\d.\s]+/,"").trim();
 let factor=1;
 if(/^(lb|lbs|pound)/.test(unit))factor=453.592;
 else if(unit==="kg")factor=1000;
 else if(/^(g|gram)/.test(unit))factor=1;
 else if(/^cup/.test(unit))factor=/uncooked|dry|basmati/.test(text)?185:/cooked rice/.test(text)?158:/cheddar/.test(text)?113:/flour/.test(text)?125:/kale/.test(text)?67:240;
 else if(/^tbsp|tablespoon/.test(unit))factor=/oil|butter|honey|mayo/.test(text)?14:/herb|dill|garlic/.test(text)?7:15;
 else if(/^tsp|teaspoon/.test(unit))factor=/salt/.test(text)?6:/dried|powder|cumin|paprika/.test(text)?3:5;
 else if(/^clove/.test(unit))factor=4;
 else if(/^can/.test(unit))factor=425;
 else if(/^bunch/.test(unit))factor=60;
 else if(/^stalk/.test(unit))factor=15;
 else if(/^(medium|large|small)/.test(unit))factor=/sweet potato/.test(text)?200:/zucchini/.test(text)?180:/carrot/.test(text)?75:/onion/.test(text)?120:/jalapeño/.test(text)?15:130;
 else if(/\b(cloves?|stalks?|large|medium|small)\b/.test(text)){
  factor=/sweet potato/.test(text)?200:/carrot/.test(text)?75:/onion/.test(text)?120:/jalapeño/.test(text)?15:/garlic/.test(text)?4:100;
 }
 else factor=1;
 return amount*factor;
}
const ingredientName=s=>String(s).replace(/^\s*(?:\d+(?:\.\d+)?|\.\d+)\s*(?:lbs?|pounds?|kg|g|grams?|cups?|tbsp|tablespoons?|tsp|teaspoons?|cloves?|bunch|stalks?|cans?|medium|large|small)?\s*/i,"").trim();
export function promoteSourceMeal(recipe){
 if(!recipe?.indexOnly||!ELIGIBLE.has(recipe.name))return null;
 const descriptions=(recipe.ingredientStatements||[]).map(x=>x.description).filter(Boolean);
 if(!descriptions.length||!Number(recipe.sourceYield))return null;
 const groups=new Map();
 for(const description of descriptions){
  const grams=estimateIngredientBatchGrams(description);
  if(!(grams>0))continue; // Optional 'salt to taste' stays in original list.
  const food=ingredientName(description);
  const label=category(food.toLowerCase());
  if(!groups.has(label))groups.set(label,[]);
  groups.get(label).push({food,grams,unit:"g",sourceQuantity:description});
 }
 const converted=[...groups].map(([label,ingredients])=>({label,ingredients}));
 if(!converted.length)return null;
 return {...recipe,indexOnly:false,canSchedule:true,groups:converted,
  servings:Number(recipe.sourceYield),steps:sourceRecipeSteps(recipe),recipeVersion:2,
  cuisine:"Meal Prep Manual adaptation",prepMinutes:Number.parseInt(String(recipe.prepTime||"").replace(/\D/g,""),10)||null,
  storage:"Cool within two hours; refrigerate at 4°C or colder and reheat thoroughly.",
  originalIngredientStatements:descriptions,
  reviewStatus:"published-ingredients-converted-for-planning-unverified",
  nutritionVerified:false};
}
