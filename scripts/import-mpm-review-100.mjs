// One-time, factual-only importer for the first 100 public recipe titles.
// No publisher photographs or expressive preparation instructions are stored.
import {writeFileSync} from "node:fs";
import {MPM_INDEX_RECIPES} from "../js/nutrition/meal-prep-manual-discovery.js";
import {FEATURED_RECIPES} from "../js/nutrition/meal-planner-featured-recipes.js";
const selected=MPM_INDEX_RECIPES.slice(0,100),origin="https://mealprepmanual.com";
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const text=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&amp;/gi,"&").replace(/&nbsp;/gi," ").replace(/&#039;|&apos;/gi,"'").replace(/\s+/g," ").trim();
const norm=s=>text(s).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[‘’]/g,"'").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const slug=s=>norm(s).replace(/\s+/g,"-");
async function get(url){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),13000);
 try{const res=await fetch(url,{signal:ctrl.signal,headers:{"User-Agent":"LevelUpRecipeReview/1.0","Accept":"text/html"}});
 if(!res.ok)return null;const body=await res.text();
 return body.length>1000&&!/captcha|access denied/i.test(body.slice(0,2000))?{url:res.url,body}:null;
 }catch{return null;}finally{clearTimeout(timer);}
}
function indexLinks(body){
 const found=new Map();const re=/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;let m;
 while((m=re.exec(body))){const href=m[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
 if(!href)continue;let url;try{url=new URL(href,origin);}catch{continue;}
 if(url.hostname!=="mealprepmanual.com"||url.pathname==="/recipes/")continue;
 const name=norm(m[2]);if(name.length>3&&!found.has(name))found.set(name,url.href);
 }return found;
}
const links=new Map();
for(const page of [...new Set(selected.map(x=>x.sourceIndexPage))]){
 const result=await get(origin+"/recipes/?_page="+page);
 if(result)for(const [name,url] of indexLinks(result.body))links.set(name,url);
 await delay(500);
}
function findRecipe(node,result=[]){
 if(!node||typeof node!=="object")return result;
 if(Array.isArray(node)){for(const x of node)findRecipe(x,result);return result;}
 const type=node["@type"];
 if((Array.isArray(type)?type:[type]).some(x=>String(x).toLowerCase()==="recipe"))result.push(node);
 for(const [key,value] of Object.entries(node))if(!["recipeIngredient","recipeInstructions"].includes(key)&&value&&typeof value==="object")findRecipe(value,result);
 return result;
}
function schema(body,name){
 const re=/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m,all=[];
 while((m=re.exec(body)))try{findRecipe(JSON.parse(m[1]),all);}catch{}
 return all.find(x=>norm(x.name)===norm(name))||all[0]||null;
}
const number=s=>{const match=String(s??"").match(/(\d+(?:\.\d+)?)/);return match?Number(match[1]):null;};
const ingredient=s=>{
 const line=text(s),m=line.match(/\(\s*(\d+(?:\.\d+)?)\s*(g|grams?|ml)\s*\)/i);
 return {description:line,amount:m?Number(m[1]):null,unit:m?(m[2].toLowerCase()==="ml"?"mL":"g"):null};
};
const featured=new Map(FEATURED_RECIPES.map(x=>[norm(x.name),x.sourceUrl]));
const records=[];let verified=0,ingredientsLoaded=0;
for(let i=0;i<selected.length;i++){
 const item=selected[i],key=norm(item.name),known=featured.get(key)||links.get(key),fallback=origin+"/"+slug(item.name)+"/";
 let page=await get(known||fallback);
 if(!page&&known&&known!==fallback)page=await get(fallback);
 const extracted=page?schema(page.body,item.name):null;
 const h1=norm(page?.body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
 const validated=Boolean(page&&(norm(extracted?.name)===key||h1===key));
 const ingredients=validated&&Array.isArray(extracted?.recipeIngredient)?extracted.recipeIngredient.filter(x=>typeof x==="string").map(ingredient):[];
 const nutrition=validated?extracted?.nutrition||{}:{};
 const estimates={calories:number(nutrition.calories),protein:number(nutrition.proteinContent),carbs:number(nutrition.carbohydrateContent),fat:number(nutrition.fatContent),fiber:number(nutrition.fiberContent)};
 const rating=validated?extracted?.aggregateRating||{}:{};
 const record={id:item.id,name:item.name,slot:item.slot,slotInferred:true,sourceName:"The Meal Prep Manual",sourceIndexPage:item.sourceIndexPage,sourceIndexUrl:item.sourceIndexUrl,sourceUrl:validated?page.url:null,indexOnly:true,canSchedule:false,nutritionVerified:false,imageStatus:"awaiting-unique-licensed-image",reviewStatus:"needs-review",importStatus:ingredients.length?"publisher-ingredient-facts-imported":"source-ingredients-unavailable",sourceYield:validated?number(Array.isArray(extracted?.recipeYield)?extracted.recipeYield[0]:extracted?.recipeYield):null,prepTime:validated?extracted?.prepTime||null:null,cookTime:validated?extracted?.cookTime||null:null,publishedEstimate:Object.values(estimates).some(x=>x!==null)?estimates:null,sourceUserRating:rating.ratingValue?{rating:number(rating.ratingValue),votes:number(rating.ratingCount||rating.reviewCount)}:null,ingredientStatements:ingredients,sourceInstructionsAvailable:validated&&Boolean(extracted?.recipeInstructions?.length),rightsReview:"required",reviewChecks:{ingredientMapping:false,seasonings:false,allergens:false,nutrition:false,storage:false,originalDirections:false,image:false,license:false}};
 records.push(record);if(validated)verified++;if(ingredients.length)ingredientsLoaded++;
 console.log("Recipe "+(i+1)+"/100: "+item.name+" - "+ingredients.length+" ingredients");
 await delay(500);
}
const meta={attempted:selected.length,sourcePagesVerified:verified,ingredientListsLoaded:ingredientsLoaded,generatedAt:new Date().toISOString(),status:ingredientsLoaded===100?"imported-awaiting-review":"partially-imported-awaiting-review"};
writeFileSync("js/nutrition/mpm-review-first-100-generated.js","// Factual publisher source record snapshot. No instructions or images copied.\nexport const MPM_REVIEW_100_IMPORTED=Object.freeze("+JSON.stringify(records,null,2)+");\nexport const MPM_REVIEW_100_IMPORT_META=Object.freeze("+JSON.stringify(meta,null,2)+");\n");
console.log("Import report:",JSON.stringify(meta));
