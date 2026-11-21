// Source-linked reference recipe: ingredient facts, original independently written directions.
// Not a licensed reproduction; never substitute an unrelated stock/atlas photograph.
// Nutrition is publisher-estimated, not independently verified in Level Up.
export const FEATURED_RECIPES=Object.freeze([{
 id:"reference-creamy-cilantro-lime-chicken",name:"Creamy Cilantro Lime Chicken Bowls",
 slot:"Dinner",cuisine:"North American",diet:"omnivore",prepMinutes:80,servings:5,
 sourceName:"The Meal Prep Manual",sourceUrl:"https://mealprepmanual.com/creamy-cilantro-lime-chicken-bowls/",
 reviewStatus:"source-linked-awaiting-nutrition-and-rights-review",imageStatus:"awaiting-unique-ingredient-accurate-image",
 publishedEstimate:{calories:490,protein:43,carbs:46,fat:15,fiber:4.8},
 groups:[
 {label:"Seasoned chicken",ingredients:[
  {food:"Chicken thighs, boneless skinless, raw",grams:908,unit:"g"},
  {food:"Smoked paprika",grams:6,unit:"g"},{food:"Garlic powder",grams:6,unit:"g"},
  {food:"Onion powder",grams:3,unit:"g"},{food:"Chili powder",grams:3,unit:"g"},
  {food:"Salt",grams:9,unit:"g"},{food:"Black pepper",grams:3,unit:"g"},
  {food:"Lime juice",grams:15,unit:"g"},{food:"Water",grams:15,unit:"g"},
  {food:"Cooking oil",grams:15,unit:"g"}]},
 {label:"Rice and vegetables",ingredients:[
  {food:"Sweet potato, raw",grams:340,unit:"g"},
  {food:"Rice, cooked",grams:450,unit:"g"},
  {food:"Broccoli, raw",grams:227,unit:"g"},
  {food:"Cooking oil",grams:15,unit:"g"}]},
 {label:"Creamy cilantro-lime sauce",ingredients:[
  {food:"Fresh cilantro",grams:20,unit:"g"},
  {food:"Green onions",grams:20,unit:"g"},
  {food:"Jalapeño",grams:20,unit:"g"},
  {food:"Garlic powder",grams:3,unit:"g"},
  {food:"Ground cumin",grams:1,unit:"g"},
  {food:"Salt",grams:1,unit:"g"},
  {food:"Lime juice",grams:30,unit:"g"},
  {food:"Cooking oil",grams:15,unit:"g"},
  {food:"Plain Greek yogurt, 2% milk fat",grams:120,unit:"g"},
  {food:"Water",grams:15,unit:"g"}]}
 ],
 steps:[
  "Prepare rice according to its packaging, measuring out 450 g of cooked rice for the batch.",
  "Combine the chicken seasonings, lime, water and oil. Coat the thighs evenly before baking.",
  "Roast the chicken at 205°C, checking the thickest pieces with a thermometer until they reach 74°C.",
  "Dice sweet potatoes, roast with part of the vegetable oil, then add chopped broccoli with the remaining oil and finish roasting until tender.",
  "Blend cilantro, green onions, jalapeño, yogurt, remaining lime juice, sauce seasonings and sauce oil. Adjust the texture with the measured water.",
  "Divide rice, chicken and vegetables between five containers; pack the yogurt sauce separately to keep it fresh.",
  "Cool promptly and refrigerate at 4°C or colder within two hours. Use within two to three days or freeze suitable portions. Reheat chicken and rice to 74°C."
 ],
 allergies:["milk"],storage:"Chill within 2 hours; refrigerate at or below 4°C and eat in 2–3 days or freeze. Reheat thoroughly to 74°C. Keep sauce separate.",
 notes:"Source quantities preserved for traceability. Publisher nutrition estimates apply only to its original five-serving recipe; Level Up has not recomputed nutrients or verified taste. Check the source before cooking."
}]);
export function featuredIngredients(recipe){return (recipe?.groups||[]).flatMap(group=>group.ingredients.map(x=>({...x,group:group.label})))}
export function scaledFeaturedGrocery(recipe,portions){const multiplier=Math.max(0,Number(portions)||0)/recipe.servings;const byName=new Map();for(const item of featuredIngredients(recipe)){const key=item.food;let old=byName.get(key)||{food:key,grams:0,unit:item.unit};old.grams+=item.grams*multiplier;byName.set(key,old);}return [...byName.values()];}
