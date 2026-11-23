// Optional read-only D1 catalogue sync. The bundled catalogue remains fully
// functional offline and if the Worker/database has not yet been deployed.
const ENDPOINT="https://api.leveluphypertrophy.com/v1/meal-recipes";
const cache=new Map();
let pending=null;
export const cloudRecipe=id=>cache.get(String(id||""))||null;
export const cloudRecipes=()=>[...cache.values()];
export function syncCloudRecipes(){
 if(pending)return pending;
 pending=(async()=>{
  if(typeof fetch!=="function")return 0;
  const incoming=new Map();
  for(let offset=0;offset<400;offset+=100){
   const response=await fetch(ENDPOINT+"?limit=100&offset="+offset,{method:"GET",credentials:"omit"});
   if(!response.ok)throw new Error("Recipe catalogue response "+response.status);
   const result=await response.json();
   if(!Array.isArray(result.recipes))throw new Error("Invalid recipe catalogue response");
   for(const item of result.recipes){
    if(!item||typeof item.id!=="string"||typeof item.name!=="string")continue;
    if(!["source_index_only","source_ingredients_review","ingredient_complete_unverified"].includes(item.status))continue;
    incoming.set(item.id,item);
   }
   if(!result.hasMore)break;
  }
  if(!incoming.size)return 0;
  cache.clear();for(const [key,value] of incoming)cache.set(key,value);
  return incoming.size;
 })().catch(()=>0).finally(()=>{pending=null});
 return pending;
}
