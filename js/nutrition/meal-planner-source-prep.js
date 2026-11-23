// Original Level Up preparation guidance for source-index dishes with an
// imported publisher ingredient list. These steps are NOT copied instructions
// and do not make an unverified index entry schedulable or nutrition-verified.
const includes=(text,words)=>words.some(word=>text.includes(word));
export function sourceRecipeSteps(recipe){
 const statements=Array.isArray(recipe?.ingredientStatements)?recipe.ingredientStatements:[];
 if(!statements.length)return [];
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
