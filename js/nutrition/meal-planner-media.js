import {generatedMealTile} from "./meal-planner-art.js?v=1";
// Photo-based meal planner artwork. Unsplash photos are illustrative: recipe
// ingredients/portions are described separately and may differ from photograph.
// The shipped local food photographs are used when remote images are unavailable.
const PHOTO_IDS = [
 "photo-1546069901-ba9599a7e63c", // vibrant food bowl
 "photo-1512621776951-a57141f2eefd", // colourful healthy food
 "photo-1490645935967-10de6ba17061", // healthy ingredients
 "photo-1511690743698-d9d85f2fbf38", // food bowl
 "photo-1498837167922-ddd27525d352", // produce
 "photo-1504674900247-0877df9cc836", // plated food
 "photo-1547592180-85f173990554", // meal plate
 "photo-1546069901-d5bfd2cbfb1f", // salad
 "photo-1494597564530-871f2b93ac55", // health food
 "photo-1512621776951-a57141f2eefd",
 "photo-1567620905732-2d1ec7ab7445", // breakfast plate
 "photo-1505576399275-bfbd1532d0b0", // cooking
 "photo-1540189549336-e6e99c3679fe", // salad
 "photo-1519708227418-c8fd9a32b7a2", // salmon
 "photo-1476224203421-9ac39bcb3327", // prepared meal
 "photo-1482049016688-2d3e1b311543", // breakfast
 "photo-1565299624946-b28f40a0ae38", // food
 "photo-1517248135467-4c7edcad34c4", // dinner
 "photo-1525351484163-7529414344d8", // breakfast
 "photo-1576402187878-974f70c890a5", // food
 "photo-1543362906-acfc16c67564", // salad
 "photo-1551024506-0bccd828d307", // sweet
 "photo-1519996529931-28324d1a630e", // fruit
 "photo-1555939594-58d7cb561ad1", // protein plate
 "photo-1490645935967-10de6ba17061"
];
const photos=Object.freeze(PHOTO_IDS.map(id=>"https://images.unsplash.com/"+id+"?auto=format&fit=crop&w=520&q=75"));
export const mealPhoto=(recipe)=>"generated-meal:"+generatedMealTile(recipe);
export const ingredientPhoto=(food)=>{
 const name=String(food||"").toLowerCase();
 const categories=[
  ["berries|apple|banana|pineapple",2],
  ["chicken|turkey|beef|tuna|salmon|cod|shrimp",6],
  ["oats|rice|quinoa|pasta|tortilla|bread|potato",0],
  ["yogurt|milk|cheese|feta|egg",11],
  ["broccoli|spinach|pepper|tomato|cucumber|avocado|zucchini|mushroom",4],
  ["lentils|chickpeas|beans|tofu|edamame|hummus",1],
 ];
 const match=categories.find(([pattern])=>new RegExp(pattern).test(name));
 return photos[match?.[1]??8];
};
export const localFoodFallback=(index=0)=>"/assets/food/category-"+Math.abs(index)%25+".webp";
export const recipeSteps=(recipe)=>{
 const foods=(recipe?.ingredients||[]).map(x=>x.food);
 const has=(name)=>foods.some(x=>name.test(x));
 const steps=[];
 const protein=foods.find(x=>/chicken|turkey|beef|salmon|cod|shrimp|tuna|egg|tofu/.test(x));
 if(has(/oats/)){steps.push("Combine oats with the milk or yogurt and any other listed ingredients.");steps.push("For overnight oats, cover and chill until softened; for a warm bowl, heat gently until the oats are tender.");}
 else if(has(/rice|quinoa|pasta|potato/)){steps.push("Prepare the rice, quinoa, pasta, or potatoes according to package directions until tender. Measured quantities in this draft represent the listed food amount, not necessarily dry weight.");}
 if(has(/lentils|chickpeas|beans|edamame/))steps.push("Drain or rinse canned legumes where applicable, or cook dried legumes thoroughly before adding them.");
 if(protein && /chicken|turkey|beef|salmon|cod|shrimp|tofu|egg/.test(protein))steps.push("Season and cook the "+protein+" using a pan, oven, or suitable method until fully cooked and safe to eat; follow the package's food-safety guidance.");
 if(has(/broccoli|spinach|pepper|zucchini|mushroom/))steps.push("Wash and chop the vegetables. Steam, roast, or sauté those intended to be served warm.");
 if(has(/berries|banana|apple|pineapple/))steps.push("Rinse and prepare fresh fruit; slice or portion as needed.");
 if(has(/tortilla|bread|rice cakes/))steps.push("Warm or toast the bread, wrap, or rice cakes if desired.");
 if(has(/cucumber|tomato|salsa|avocado/))steps.push("Slice the fresh vegetables and add salsa or avocado at serving time.");
 steps.push("Combine or plate the ingredients, then divide into your planned serving. Adjust individual amounts in the planner before marking the meal eaten.");
 return steps;
};
