/**
 * Level Up recipe quality gate, v2.
 * Recipes stay in staging until kitchen tests, licensing review, complete
 * ingredient nutrient mappings and a unique verified image are approved.
 * Do not import a third-party recipe's prose or photography.
 */
export const RECIPE_STATES=Object.freeze(["draft","source-backed","nutrition-reviewed","kitchen-tested","approved"]);
export const INGREDIENT_ROLES=Object.freeze(["protein","starch","vegetable","fruit","sauce","oil","seasoning","garnish","liquid","dairy","other"]);
export const REQUIRED_SECTIONS=Object.freeze(["main","sauce"]);
const clean=s=>String(s??"").trim();
const canonical=s=>clean(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export function normalizeIngredient(row){
  const id=canonical(row.ingredientId||row.name);
  const grams=Number(row.grams);
  return {...row,ingredientId:id,grams};
}
export function flattenIngredients(recipe){
  return (recipe.components||[]).flatMap(component=>(component.ingredients||[]).map(ingredient=>({...normalizeIngredient(ingredient),component:component.id})));
}
export function scaleRecipe(recipe,portions){
  const base=Number(recipe.yieldPortions),n=Number(portions);
  if(!Number.isInteger(n)||n<1||n>100||!Number.isInteger(base)||base<1)throw Error("Invalid batch portions or recipe yield");
  const factor=n/base;
  return flattenIngredients(recipe).map(ingredient=>({...ingredient,grams:Math.round(ingredient.grams*factor*100)/100}));
}
export function groceryForRecipes(batches){
  const map=new Map();
  for(const {recipe,portions} of batches){
    for(const item of scaleRecipe(recipe,portions)){
      if(item.role==="liquid"&&item.shoppingRequired===false)continue;
      const key=item.ingredientId+"|g";
      const entry=map.get(key)||{ingredientId:item.ingredientId,name:item.name,grams:0,category:item.shoppingCategory||"Other",sources:[]};
      entry.grams+=item.grams;
      if(!entry.sources.includes(recipe.id))entry.sources.push(recipe.id);
      map.set(key,entry);
    }
  }
  return [...map.values()].map(item=>({...item,grams:Math.round(item.grams*100)/100})).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
}
export function auditRecipe(recipe){
  const errors=[],warnings=[];
  if(!clean(recipe.id)||!clean(recipe.title))errors.push("missing identity");
  if(!Number.isInteger(recipe.yieldPortions)||recipe.yieldPortions<1)errors.push("invalid yield");
  if(!RECIPE_STATES.includes(recipe.status))errors.push("invalid status");
  if(!recipe.source?.url)warnings.push("source provenance absent");
  if(!recipe.rights?.status||recipe.rights.status==="unreviewed")warnings.push("rights not reviewed");
  if(!recipe.components?.length)errors.push("missing ingredient components");
  const items=flattenIngredients(recipe);
  if(items.length<8)warnings.push("sparse ingredient detail: fewer than 8 entries");
  if(!items.some(x=>x.role==="seasoning"))warnings.push("seasonings missing");
  if(!items.some(x=>x.role==="oil"))warnings.push("cooking oil or fat not specified; verify whether intentionally oil-free");
  if(!items.some(x=>x.role==="sauce"))warnings.push("no sauce component: review whether applicable");
  for(const x of items){
    if(!x.ingredientId||!clean(x.name)||!Number.isFinite(x.grams)||x.grams<=0)errors.push("invalid ingredient "+clean(x.name));
    if(!INGREDIENT_ROLES.includes(x.role))errors.push("invalid ingredient role "+clean(x.name));
    if(!clean(x.state))warnings.push("raw/cooked/drained state missing: "+x.name);
    if(!clean(x.nutritionId))warnings.push("nutrition mapping missing: "+x.name);
  }
  const duplicate=new Set();
  for(const item of items){const key=item.component+"/"+item.ingredientId;if(duplicate.has(key))warnings.push("duplicate ingredient in component: "+item.name);duplicate.add(key);}
  if(!recipe.instructions?.length||recipe.instructions.length<4)warnings.push("incomplete cooking instructions");
  if(!recipe.storage?.refrigerateWithinHours||!recipe.storage?.reheatC)warnings.push("incomplete storage guidance");
  if(!recipe.image?.assetId)warnings.push("unique recipe image missing");
  if(recipe.image?.assetId&&!recipe.image?.ingredientReviewApproved)warnings.push("image ingredient review pending");
  if(!recipe.nutrition?.verified)warnings.push("nutrition not verified");
  if(!recipe.kitchenTest?.passed)warnings.push("kitchen test pending");
  const canPublish=errors.length===0&&warnings.length===0&&recipe.status==="approved";
  return {id:recipe.id,errors,warnings,canPublish};
}
export function auditLegacyCatalog(catalog){
  const uniqueBases=new Set();
  const titles=new Set();
  let noSpices=0,noInstructions=0,noVerified=0,duplicateTitles=0,missingNutrients=0;
  for(const recipe of catalog){
    if(titles.has(canonical(recipe.name)))duplicateTitles++;titles.add(canonical(recipe.name));
    uniqueBases.add(canonical(recipe.name).replace(/-(lighter|hearty|extra-protein|quick-serving|family-portion|balanced|small-appetite|higher-energy|recovery-meal|meal-prep|easy-lunchbox|simple|active-day|reduced-portion|weekend|everyday|post-workout|more-filling|light-day)$/,""));
    if(!(recipe.ingredients||[]).some(x=>/paprika|pepper|cumin|salt|oregano|chili|ginger|curry|garlic/i.test(x.food)))noSpices++;
    if(!recipe.instructions?.length)noInstructions++;
    if(recipe.nutritionStatus!=="verified")noVerified++;
    if((recipe.ingredients||[]).some(x=>!clean(x.food)||!(Number(x.grams)>0)))missingNutrients++;
  }
  return {catalogEntries:catalog.length,estimatedUniqueBaseRecipes:uniqueBases.size,noSpices,noInstructions,noVerified,duplicateTitles,invalidIngredientQuantities:missingNutrients};
}
