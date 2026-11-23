// Read-only audit of Level Up's bundled recipe catalogue.
// No Firestore writes; no recipe is declared kitchen-tested by inference.
// Run: node scripts/audit-recipe-catalog.mjs
import {mkdirSync,writeFileSync} from "node:fs";
import {MPM_CATALOG_300} from "../js/nutrition/mpm-catalog-300.js";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
import {MEAL_CATALOG} from "../js/nutrition/meal-planner-data.js";

const output="reports/meal-recipe-audit";
const norm=s=>String(s||"").toLocaleLowerCase("en").normalize("NFKC").replace(/[‘’]/g,"'").replace(/[^a-z0-9]+/g," ").trim();
const source=new Map(MPM_CATALOG_300.map(x=>[norm(x.name),x]));
const detailed=new Map(FEATURED_RECIPES.map(x=>[norm(x.name),x]));
const originals=MEAL_CATALOG.filter(x=>!String(x.name).includes(" · "));
const records=[];
function audit(recipe,sourceKind){
 const full=detailed.get(norm(recipe.name));
 const primary=full||recipe;
 const ingredientStatements=Array.isArray(recipe.ingredientStatements)?recipe.ingredientStatements:[];
 const sourceIngredients=Array.isArray(full?.groups)?full.groups.flatMap(g=>g.ingredients):[];
 const mappedIngredients=sourceIngredients.length?sourceIngredients:Array.isArray(recipe.ingredients)?recipe.ingredients:[];
 const fullIngredients=mappedIngredients.length>0&&mappedIngredients.every(i=>Number.isFinite(Number(i.grams))&&Number(i.grams)>0);
 const hasPublisherIngredients=sourceIngredients.length>0||ingredientStatements.length>0;
 const steps=full?.steps||recipe.steps||[];
 const publisherMacros=full?.publishedEstimate||recipe.publishedEstimate||null;
 const hasMacros=publisherMacros&&["calories","protein","carbs","fat"].every(key=>Number.isFinite(Number(publisherMacros[key])));
 // Existing eight detailed recipes have generated atlas images; all 40 original
 // catalogue recipes also have their own atlas image tiles. New source records
 // must not be misreported as illustrated until an asset actually exists.
 const featuredTile=FEATURED_RECIPES.findIndex(x=>norm(x.name)===norm(recipe.name));
 const imageAvailable=(sourceKind==="level-up-original"||featuredTile>=0&&featuredTile<8);
 const imageReviewNeeded=true; // generated/illustrative artwork is not user-approved
 const flags=[];
 if(!fullIngredients)flags.push("missing_mapped_ingredients");
 if(!hasPublisherIngredients)flags.push("missing_source_ingredient_list");
 if(!Array.isArray(steps)||steps.length<3)flags.push("missing_recipe_instructions");
 if(!hasMacros)flags.push("missing_calories_macros");
 if(hasMacros&&!full?.nutritionVerified)flags.push("nutrition_unverified");
 if(!imageAvailable)flags.push("missing_recipe_image");
 if(imageReviewNeeded)flags.push("image_review_pending");
 if(!Number.isFinite(Number(full?.servings||recipe.servings))||Number(full?.servings||recipe.servings)<=0)flags.push("missing_servings");
 if(!Number.isFinite(Number(full?.prepMinutes||recipe.prepMinutes))||Number(full?.prepMinutes||recipe.prepMinutes)<=0)flags.push("missing_prep_time");
 if(!primary.slot)flags.push("missing_meal_category");
 if(!full?.storage)flags.push("storage_safety_review");
 if(!full?.allergensVerified)flags.push("allergens_unverified");
 if(!full?.rightsApproved)flags.push("rights_review_pending");
 if(!full?.kitchenTested)flags.push("kitchen_test_pending");
 const scheduledReady=Boolean(fullIngredients&&Array.isArray(steps)&&steps.length>=3&&hasMacros&&full?.nutritionVerified&&full?.rightsApproved);
 return {id:primary.id||recipe.id,name:recipe.name,collection:sourceKind,sourceUrl:full?.sourceUrl||recipe.sourceUrl||recipe.sourceIndexUrl||null,ingredientCount:mappedIngredients.length,publisherIngredientStatements:ingredientStatements.length,instructionCount:Array.isArray(steps)?steps.length:0,imageAvailable,imageApproved:false,nutritionStatus:hasMacros?(full?.nutritionVerified?"verified":"publisher_estimate"):"missing",readyForPlanning:scheduledReady,sourceAccess:recipe.name==="30 Minute Stir Fry"?"membership-required":"public-or-needs-check",flags,completionStatus:flags.length?"needs_review":"complete"};
}
for(const item of MPM_CATALOG_300)records.push(audit(item,"meal-prep-manual"));
for(const item of originals){if(!source.has(norm(item.name)))records.push(audit(item,"level-up-original"));}
const priority=record=>record.collection==="meal-prep-manual"?0:1;
records.sort((a,b)=>priority(a)-priority(b)||a.name.localeCompare(b.name));
records.forEach((record,i)=>{record.batch=Math.floor(i/25)+1;record.batchPosition=i%25+1;});
const counts={total:records.length,source:records.filter(x=>x.collection==="meal-prep-manual").length,originals:records.filter(x=>x.collection==="level-up-original").length,ready:records.filter(x=>x.readyForPlanning).length,withSourceIngredients:records.filter(x=>x.ingredientCount||x.publisherIngredientStatements).length,detailedSourceRecipes:FEATURED_RECIPES.length,sourceLockedKnown:records.filter(x=>x.sourceAccess==="membership-required").length,withIllustrativeImage:records.filter(x=>x.imageAvailable).length,missingImage:records.filter(x=>x.flags.includes("missing_recipe_image")).length,awaitingImageReview:records.filter(x=>x.flags.includes("image_review_pending")).length,missingMappedIngredients:records.filter(x=>x.flags.includes("missing_mapped_ingredients")).length,missingInstructions:records.filter(x=>x.flags.includes("missing_recipe_instructions")).length,missingMacros:records.filter(x=>x.flags.includes("missing_calories_macros")).length,numberOfBatches:Math.ceil(records.length/25)};
mkdirSync(output,{recursive:true});
writeFileSync(output+"/audit.json",JSON.stringify({generatedAt:new Date().toISOString(),scope:"bundled source catalogue only; excludes Firestore user-created recipes",counts,recipes:records},null,2)+"\n");
const columns=["batch","batchPosition","id","name","collection","sourceUrl","ingredientCount","publisherIngredientStatements","instructionCount","imageAvailable","imageApproved","nutritionStatus","readyForPlanning","completionStatus","sourceAccess","flags"];
const csv=s=>'"'+String(s??"").replace(/"/g,'""')+'"';
writeFileSync(output+"/audit.csv",columns.join(",")+"\n"+records.map(r=>columns.map(k=>csv(Array.isArray(r[k])?r[k].join(";"):r[k])).join(",")).join("\n")+"\n");
writeFileSync(output+"/summary.json",JSON.stringify(counts,null,2)+"\n");
console.log(JSON.stringify(counts,null,2));
