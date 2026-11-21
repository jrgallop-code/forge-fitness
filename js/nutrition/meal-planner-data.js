// Level Up meal planner evaluation module.
// Recipe nutrition is ESTIMATED from generic ingredient reference values, never presented as verified.
// Planned meals are stored separately from consumed food. No automatic food-log writes.
export const PLANNER_STORAGE_KEY = "level_up_meal_planner_v1";
export const MEAL_SLOTS = ["Breakfast","Lunch","Dinner","Meal 4"];
export const FOOD_VALUES = {
 "oats":[389,16.9,66.3,6.9],"greek yogurt":[97,9,3.9,5],"berries":[50,.7,12,.3],
 "banana":[89,1.1,22.8,.3],"milk":[50,3.4,4.8,2],"egg":[143,12.6,.7,9.5],
 "egg whites":[52,10.9,.7,.2],"whole wheat bread":[247,13,41,4.2],
 "peanut butter":[588,25,20,50],"almonds":[579,21.2,21.6,49.9],
 "chicken breast":[165,31,0,3.6],"turkey breast":[135,29,0,1],
 "salmon":[208,20,0,13],"tofu":[144,17,3,8.7],"lentils":[116,9,20.1,.4],
 "chickpeas":[164,8.9,27.4,2.6],"black beans":[132,8.9,23.7,.5],
 "lean beef":[217,26,0,12],"tuna":[116,25.5,0,.8],"shrimp":[99,24,.2,.3],
 "brown rice":[111,2.6,23,.9],"quinoa":[120,4.4,21.3,1.9],
 "whole wheat pasta":[149,5.8,30.1,.9],"potato":[87,1.9,20,.1],
 "sweet potato":[86,1.6,20.1,.1],"tortilla":[312,8.3,52.1,8.3],
 "broccoli":[35,2.4,7.2,.4],"spinach":[23,2.9,3.6,.4],
 "bell pepper":[31,1,6,.3],"tomato":[18,.9,3.9,.2],
 "cucumber":[15,.7,3.6,.1],"zucchini":[17,1.2,3.1,.3],
 "avocado":[160,2,8.5,14.7],"olive oil":[884,0,0,100],
 "feta":[264,14.2,4.1,21.3],"cheddar":[403,25,1.3,33],
 "hummus":[166,7.9,14.3,9.6],"apple":[52,.3,13.8,.2],
 "cottage cheese":[98,11.1,3.4,4.3],"rice cakes":[387,8,81.5,2.8],
 "pineapple":[50,.5,13.1,.1],"pumpkin seeds":[559,30,10.7,49],
 "edamame":[121,11.9,8.9,5.2],"salsa":[36,1.5,7,.2],
 "cod":[82,17.8,0,.7],"mushrooms":[22,3.1,3.3,.3],"garlic":[149,6.4,33.1,.5],"ginger":[80,1.8,17.8,.8],"soy sauce":[53,8.1,4.9,.6],"lime":[30,.7,10.5,.2],"curry powder":[325,14,55,14]
};
const BASES = [
 ["Berry overnight oats","Breakfast","North American","vegetarian",[["oats",60],["greek yogurt",130],["berries",90],["milk",100]]],
 ["Banana oat bowl","Breakfast","North American","vegetarian",[["oats",65],["banana",100],["milk",150],["peanut butter",12]]],
 ["Egg and spinach toast","Breakfast","North American","vegetarian",[["egg",110],["spinach",50],["whole wheat bread",80],["tomato",80]]],
 ["Greek yogurt parfait","Breakfast","Mediterranean","vegetarian",[["greek yogurt",220],["berries",110],["oats",40],["almonds",15]]],
 ["Cottage cheese breakfast","Breakfast","North American","vegetarian",[["cottage cheese",210],["apple",130],["whole wheat bread",65]]],
 ["Breakfast tortilla","Breakfast","Mexican","vegetarian",[["tortilla",65],["egg",100],["black beans",70],["salsa",50]]],
 ["Salmon quinoa salad","Lunch","Mediterranean","pescatarian",[["salmon",130],["quinoa",150],["cucumber",100],["tomato",90]]],
 ["Chicken rice bowl","Lunch","North American","omnivore",[["chicken breast",140],["brown rice",170],["broccoli",120]]],
 ["Mediterranean chickpea bowl","Lunch","Mediterranean","vegan",[["chickpeas",160],["quinoa",120],["cucumber",100],["tomato",80]]],
 ["Turkey avocado wrap","Lunch","North American","omnivore",[["turkey breast",130],["tortilla",70],["avocado",65],["spinach",40]]],
 ["Tofu and rice","Lunch","Asian","vegan",[["tofu",180],["brown rice",170],["broccoli",110]]],
 ["Tuna potato salad","Lunch","Mediterranean","pescatarian",[["tuna",140],["potato",190],["tomato",90],["cucumber",90]]],
 ["Chicken pasta","Dinner","Mediterranean","omnivore",[["chicken breast",150],["whole wheat pasta",180],["tomato",120],["spinach",60]]],
 ["Lean beef rice skillet","Dinner","Mexican","omnivore",[["lean beef",130],["brown rice",160],["bell pepper",100],["salsa",60]]],
 ["Salmon and sweet potato","Dinner","North American","pescatarian",[["salmon",150],["sweet potato",220],["broccoli",130]]],
 ["Lentil quinoa stew","Dinner","Mediterranean","vegan",[["lentils",190],["quinoa",110],["tomato",130],["spinach",75]]],
 ["Shrimp taco bowl","Dinner","Mexican","pescatarian",[["shrimp",160],["black beans",135],["brown rice",120],["salsa",60]]],
 ["Tofu vegetable pasta","Dinner","Mediterranean","vegan",[["tofu",180],["whole wheat pasta",180],["zucchini",120],["tomato",100]]],
 ["Yogurt and fruit","Meal 4","North American","vegetarian",[["greek yogurt",220],["pineapple",130],["pumpkin seeds",15]]],
 ["Apple peanut butter","Meal 4","North American","vegan",[["apple",190],["peanut butter",25],["rice cakes",25]]],
 ["Hummus snack plate","Meal 4","Mediterranean","vegan",[["hummus",100],["cucumber",150],["bell pepper",120]]],
 ["Cottage cheese berries","Meal 4","North American","vegetarian",[["cottage cheese",200],["berries",120],["almonds",15]]],
 ["Edamame and apple","Meal 4","Asian","vegan",[["edamame",190],["apple",120]]],
 ["Turkey toast","Meal 4","North American","omnivore",[["turkey breast",100],["whole wheat bread",70],["tomato",80]]],
 ["Tuna rice cakes","Meal 4","North American","pescatarian",[["tuna",120],["rice cakes",40],["cucumber",110]]],
 ["Italian turkey tomato pasta","Dinner","Italian","omnivore",[["turkey breast",150],["whole wheat pasta",170],["tomato",150],["garlic",8],["spinach",60]]],
 ["Italian tomato spinach pasta","Lunch","Italian","vegan",[["whole wheat pasta",175],["tomato",155],["spinach",90],["garlic",8],["olive oil",12]]],
 ["Chinese tofu vegetable rice","Lunch","Chinese","vegan",[["tofu",190],["brown rice",165],["bell pepper",110],["ginger",10],["soy sauce",15]]],
 ["Chinese chicken mushroom rice","Dinner","Chinese","omnivore",[["chicken breast",155],["brown rice",165],["mushrooms",100],["broccoli",100],["soy sauce",15]]],
 ["Japanese salmon rice bowl","Dinner","Japanese","pescatarian",[["salmon",145],["brown rice",160],["edamame",100],["cucumber",100],["soy sauce",12]]],
 ["Japanese tofu edamame bowl","Lunch","Japanese","vegan",[["tofu",170],["edamame",100],["brown rice",145],["cucumber",85],["ginger",8]]],
 ["Thai lime shrimp bowl","Dinner","Thai","pescatarian",[["shrimp",160],["brown rice",165],["bell pepper",120],["lime",35],["ginger",8]]],
 ["Thai chicken pepper rice","Lunch","Thai","omnivore",[["chicken breast",155],["brown rice",155],["bell pepper",120],["lime",25],["garlic",8]]],
 ["Indian chickpea tomato curry","Dinner","Indian","vegan",[["chickpeas",170],["brown rice",150],["tomato",150],["curry powder",8],["spinach",80]]],
 ["Indian lentil spinach bowl","Lunch","Indian","vegan",[["lentils",200],["brown rice",145],["spinach",95],["tomato",100],["curry powder",8]]]
];
const MODIFIERS = [
 ["Classic",1,0],["Lighter",.8,0],["Hearty",1.25,0],["Extra protein",1.1,1],
 ["Quick serving",.9,0],["Family portion",1.45,0],["Balanced",1.05,0],
 ["Small appetite",.7,0],["Higher energy",1.35,0],["Recovery meal",1.2,1],
 ["Meal prep",1.15,0],["Easy lunchbox",.95,0],["Simple",1,0],
 ["Active day",1.3,1],["Reduced portion",.75,0],["Weekend",1.4,0],
 ["Everyday",1,0],["Post workout",1.15,1],["More filling",1.2,0],
 ["Light day",.85,0]
];
const PROTEIN_FOODS = new Set(["egg whites","chicken breast","turkey breast","salmon","tofu","lentils","chickpeas","black beans","lean beef","tuna","shrimp","greek yogurt","cottage cheese","edamame","cod"]);
const ALLERGENS = {
 "milk":["greek yogurt","milk","feta","cheddar","cottage cheese"],"dairy":["greek yogurt","milk","feta","cheddar","cottage cheese"],
 "eggs":["egg","egg whites"],"fish":["salmon","tuna","cod"],"shellfish":["shrimp"],
 "peanuts":["peanut butter"],"tree nuts":["almonds"],"soy":["tofu","edamame","soy sauce"],
 "gluten":["oats","whole wheat bread","whole wheat pasta","tortilla","soy sauce"],
 "wheat":["whole wheat bread","whole wheat pasta","tortilla","soy sauce"],"sesame":["hummus"],"soy sauce":["soy sauce"]
};
export const MEAL_CATALOG = Object.freeze(BASES.flatMap((base,index)=>MODIFIERS.map(([label,multiplier,extra],variant)=>{
 const [title,slot,cuisine,diet,items]=base;
 const ingredients=items.map(([food,grams])=>({food,grams:Math.round(grams*multiplier)}));
 if(extra){const protein=ingredients.find(item=>PROTEIN_FOODS.has(item.food));if(protein)protein.grams+=50;}
 return {id:"lu-meal-"+String(index*20+variant+1).padStart(3,"0"),name:label==="Classic"?title:title+" · "+label,slot,cuisine,diet,prepMinutes:index%5===0?30:20,ingredients,nutritionStatus:"estimated-not-verified",source:"generic-reference-estimate"};
})));
export function macrosForIngredients(items){
 const total={calories:0,protein:0,carbs:0,fat:0};
 for(const item of items||[]){const values=FOOD_VALUES[item.food];if(!values)continue;const quantity=Math.max(0,Number(item.grams)||0)/100;
 ["calories","protein","carbs","fat"].forEach((key,index)=>total[key]+=values[index]*quantity);}
 return Object.fromEntries(Object.entries(total).map(([key,value])=>[key,Math.round(value*10)/10]));
}
export function eligibleMeals(options={},catalog=MEAL_CATALOG){
 const diet=String(options.diet||"balanced").toLowerCase();
 const allergies=(options.allergies||[]).map(x=>String(x).toLowerCase()).filter(x=>x!=="other");
 const dislikes=String(options.dislikes||"").toLowerCase().split(",").map(x=>x.trim()).filter(Boolean);
 const cuisines=options.cuisines||[];
 const cooking=Number(options.cooking);
 return catalog.filter(meal=>{
   if(diet==="vegan"&&meal.diet!=="vegan")return false;
   if(diet==="vegetarian"&&!["vegan","vegetarian"].includes(meal.diet))return false;
   if(diet==="pescatarian"&&meal.diet==="omnivore")return false;
   if(cuisines.length&&!cuisines.includes(meal.cuisine))return false;
   if(Number.isFinite(cooking)&&cooking>0&&meal.prepMinutes>cooking)return false;
   if(meal.ingredients.some(item=>dislikes.some(word=>item.food.includes(word))))return false;
   if(meal.ingredients.some(item=>allergies.some(allergen=>(ALLERGENS[allergen]||[]).includes(item.food))))return false;
   return true;
 });
}
function keyForDay(offset,startDate){
 const date=new Date(startDate+"T12:00:00");date.setDate(date.getDate()+offset);
 return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
}
export function generatePlan(options={},startDate=new Date().toLocaleDateString("en-CA")){
 const slots=Array.isArray(options.meals)&&options.meals.length?options.meals:MEAL_SLOTS;
 const pool=eligibleMeals(options);
 // Cuisine is a preference, not a dietary restriction; if a particular meal
 // slot has no recipe in the requested cuisine, keep allergy/diet constraints.
 const dietarySafePool=eligibleMeals({...options,cuisines:[]});
 const days=Math.min(14,Math.max(1,Number(options.days)||7));
 const usedBases=new Map(),entries=[];
 const lovedFoods=(options.likes||[]).map(x=>String(x).toLowerCase());
 const favourites=new Set(options.likedRecipes||[]);
 const highProtein=["high-protein","low-carb"].includes(options.preferredDiet);
 for(let day=0;day<days;day++)for(const slot of slots){
   let candidates=pool.filter(x=>x.slot===slot);
   const usingOtherCuisine=!candidates.length;
   if(usingOtherCuisine)candidates=dietarySafePool.filter(x=>x.slot===slot);
   if(!candidates.length){entries.push({date:keyForDay(day,startDate),slot,recipeId:null,ingredients:[],warning:"No matching meal for this slot and dietary restrictions"});continue;}
   const scored=candidates.map(meal=>{
     const baseIndex=Math.floor((Number(meal.id.slice(-3))-1)/20);
     const used=usedBases.get(baseIndex)||0;
     const macros=macrosForIngredients(meal.ingredients);
     const proteinRatio=macros.calories?macros.protein*4/macros.calories:0;
     let score=meal.ingredients.reduce((sum,item)=>sum+(lovedFoods.some(food=>item.food.includes(food))?1.5:0),0);
     if(favourites.has(meal.id))score+=5;
     if(highProtein)score+=proteinRatio*12;
     score-=used*8;
     score-=Math.abs((day+slots.indexOf(slot))%5-(Number(meal.id.slice(-3))%5))*.05;
     return {meal,baseIndex,score};
   }).sort((a,b)=>b.score-a.score || a.meal.id.localeCompare(b.meal.id));
   const picked=scored[0];
   usedBases.set(picked.baseIndex,(usedBases.get(picked.baseIndex)||0)+1);
   const servings=Math.max(1,Math.min(12,Number(options.mealSizes?.[slot]||options.household||1)));
   entries.push({date:keyForDay(day,startDate),slot,recipeId:picked.meal.id,servings,
     ingredients:picked.meal.ingredients.map(x=>({...x})),
     ...(usingOtherCuisine?{notice:"This meal uses another cuisine to keep your plan complete."}:{})});
 }
 return {version:2,createdAt:new Date().toISOString(),startDate,preferences:options,entries,consumed:false};
}
export function groceryList(plan){
 const quantities=new Map();
 for(const meal of plan?.entries||[])for(const item of meal.ingredients||[]){
  const servings=Math.max(1,Math.min(12,Number(meal.servings)||1));
  quantities.set(item.food,(quantities.get(item.food)||0)+Math.max(0,Number(item.grams)||0)*servings);
 }
 return [...quantities].map(([food,grams])=>({food,grams:Math.round(grams)})).sort((a,b)=>a.food.localeCompare(b.food));
}
export function replacePlannedMeal(plan,date,slot,recipeId){
 const recipe=MEAL_CATALOG.find(x=>x.id===recipeId);if(!recipe)return plan;
 return {...plan,entries:plan.entries.map(x=>x.date===date&&x.slot===slot?{date,slot,recipeId,ingredients:recipe.ingredients.map(y=>({...y}))}:x)};
}
export function editPlannedIngredient(plan,date,slot,index,grams){
 if(!Number.isFinite(Number(grams))||Number(grams)<0)return plan;
 return {...plan,entries:plan.entries.map(entry=>entry.date===date&&entry.slot===slot?{...entry,ingredients:entry.ingredients.map((item,i)=>i===index?{...item,grams:Number(grams)}:item)}:entry)};
}
