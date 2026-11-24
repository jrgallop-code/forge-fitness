// Original Level Up preparation guidance for source-index dishes with an
// imported publisher ingredient list. These steps are NOT copied instructions
// and do not make an unverified index entry schedulable or nutrition-verified.
const includes=(text,words)=>words.some(word=>text.includes(word));
/* Original Level Up preparation drafts built against the imported ingredient
   lists. Not copied publisher instructions, not kitchen-tested, and not a
   substitute for approving amounts or nutrition before scheduling. */
const DISH_SPECIFIC_DRAFTS=Object.freeze({
 "Big Boy Korean BBQ Beef Bowls":[
  "Cook the rice according to its package instructions and keep it covered.",
  "Dice the sweet potatoes and coat with the listed oil. Roast until tender and browned; steam or roast the broccoli separately.",
  "Brown the ground beef in a large skillet over medium heat, breaking it apart. Cook to a measured 71°C (160°F); stir in the kidney beans.",
  "Mix gochujang, soy sauce, honey, rice wine vinegar, garlic powder and onion powder. Simmer with the cooked beef and beans until coated.",
  "Stir mayo, Greek yogurt, sriracha and water together for the drizzle.",
  "Divide rice, beef and beans, sweet potato and broccoli among five meal-prep portions; pack the creamy sauce separately.",
  "Cool promptly, refrigerate at 4°C or colder and reheat cooked portions to 74°C (165°F)."
 ],
 "Mediterranean Spiced Beef":[
  "Cook the dry rice according to package directions.",
  "Dice the carrots, zucchini and onion. Toss with the listed vegetable oil, lemon zest and dill; sauté or roast until tender.",
  "Heat oil in a skillet; cook both ground-beef blends with cumin, paprika, onion powder, oregano, minced garlic, lemon zest, salt and pepper until the meat reaches 71°C (160°F). Finish with lemon juice.",
  "Whisk the Greek yogurt with the additional lemon juice, garlic, olive oil, dill and enough water for a spoonable sauce.",
  "Portion rice, beef and vegetables into five containers. Keep the lemon-dill yogurt sauce chilled separately until serving.",
  "Chill promptly at 4°C or colder; reheat cooked beef and rice thoroughly before adding the cold sauce."
 ],
 "Broccoli Cheddar Rice":[
  "Cook the rice according to package directions. Steam the broccoli until just tender, then chop into bite-size florets.",
  "Melt butter over medium-low heat and whisk in the flour. Cook briefly while stirring, without letting it brown.",
  "Gradually whisk in milk and chicken broth. Simmer gently until the sauce thickens; stir in Dijon mustard, garlic powder and onion powder.",
  "Remove the pan from high heat and stir in cheddar until melted. Season to taste with salt and pepper.",
  "Fold the cooked rice and broccoli through the cheddar sauce until evenly coated. Portion into servings and cool promptly.",
  "Refrigerate below 4°C; when reheating leftovers, heat thoroughly to 74°C (165°F)."
 ],
 "Veggie Rice":[
  "Rinse the basmati rice. Sauté minced garlic in a portion of the butter until fragrant, then stir through rice, paprika and onion powder.",
  "Add the measured water, cover and cook over low heat according to the rice package until tender. Rest covered, then fluff.",
  "Chop the carrots and onion and sauté in olive oil until tender. Stir in the kale and cook until wilted.",
  "Toss the sautéed vegetables with the rice, remaining butter and soy sauce; adjust with the listed salt.",
  "Portion into containers and cool promptly. Refrigerate at 4°C or colder and thoroughly reheat before eating."
 ]
});

export function sourceRecipeSteps(recipe){
 const statements=Array.isArray(recipe?.ingredientStatements)?recipe.ingredientStatements:[];
 if(!statements.length)return [];
 if(DISH_SPECIFIC_DRAFTS[recipe?.name])return [...DISH_SPECIFIC_DRAFTS[recipe.name]];
 const text=(recipe.name+' '+statements.map(x=>x.description).join(' ')).toLowerCase();
 const steps=['Review the ingredient list, portion quantities and allergens before starting. Prepare and measure each ingredient.'];
 if(includes(text,['rice','quinoa','couscous','pasta','noodle','potato','oats']))
   steps.push('Prepare the listed grain, pasta, oats or potatoes separately according to its packaging or standard cooking method.');
 if(includes(text,['chicken','turkey','poultry']))
   steps.push('Season and cook poultry until its thickest part reaches 74°C (165°F) on a food thermometer.');
 else if(includes(text,['ground beef','ground pork','ground lamb']))
   steps.push('Brown ground meat thoroughly, checking that it reaches 71°C (160°F).');
 else if(includes(text,['beef','pork','lamb','steak']))
   steps.push('Cook the meat using a suitable recipe method and check the appropriate safe internal temperature for the cut.');
 if(includes(text,['salmon','shrimp','prawn','fish','cod','tuna','tilapia']))
   steps.push('Prepare seafood safely and cook fish and shellfish to 63°C (145°F), or applicable local food-safety guidance.');
 if(includes(text,['tofu','tempeh','chickpeas','beans','lentils']))
   steps.push('Drain and rinse canned legumes where applicable; heat or season plant proteins using the intended dish style.');
 if(includes(text,['broccoli','spinach','onion','pepper','carrot','zucchini','mushroom','cabbage']))
   steps.push('Wash and prepare the vegetables, cooking those intended to be served warm until tender.');
 if(includes(text,['sauce','soy sauce','yogurt','cream','gochujang','honey','vinegar']))
   steps.push('Combine the listed sauce ingredients, adjusting consistency with the recipe’s measured liquids; pack cold sauces separately where appropriate.');
 steps.push('Assemble the components, portion into the stated number of servings, and check flavour and texture before serving.');
 steps.push('Cool cooked food within two hours, keep refrigerated at or below 4°C, and reheat leftovers thoroughly to 74°C (165°F).');
 return steps;
}
