// First one hundred distinct source-listed dishes; reviewer decisions stay local.
// A user marking a source entry reviewed is NOT clinical, food-safety or nutrient approval.
import {MPM_INDEX_RECIPES} from "./meal-prep-manual-discovery.js";
import {MPM_REVIEW_100_IMPORTED,MPM_REVIEW_100_IMPORT_META} from "./mpm-review-first-100-generated.js";
export const REVIEW_IDS=new Set(MPM_INDEX_RECIPES.slice(0,100).map(r=>r.id));
const LOOKUP=new Map(MPM_REVIEW_100_IMPORTED.filter(x=>REVIEW_IDS.has(x.id)).map(r=>[r.id,r]));
export const REVIEW_RECORDS=Object.freeze(MPM_INDEX_RECIPES.slice(0,100).map(item=>Object.freeze({...item,...LOOKUP.get(item.id),reviewPriority:true,indexOnly:true,canSchedule:false,nutritionVerified:false})));
export const REVIEW_IMPORT_META=MPM_REVIEW_100_IMPORT_META;
export const REVIEW_STORE_KEY="level_up_meal_review_first_100_v1";
export function readReviewDecisions(){try{const data=JSON.parse(localStorage.getItem(REVIEW_STORE_KEY)||"{}");return data&&typeof data==="object"&&!Array.isArray(data)?data:{}}catch{return {}}}
export function getReviewDecision(id){return readReviewDecisions()[id]||{decision:"unreviewed",notes:""};}
export function saveReviewDecision(id,{decision,notes}={}){
 if(!REVIEW_IDS.has(id))return false;
 if(!["unreviewed","looks-good","needs-changes"].includes(decision))return false;
 const original=readReviewDecisions(),previous=original[id]||{};
 const cleanNotes=String(notes??previous.notes??"").slice(0,2000);
 try{localStorage.setItem(REVIEW_STORE_KEY,JSON.stringify({...original,[id]:{decision,notes:cleanNotes,updatedAt:new Date().toISOString()}}));return true}catch{return false}
}
export function reviewSummary(){
 const decisions=readReviewDecisions();
 const results={total:REVIEW_RECORDS.length,reviewed:0,needsChanges:0,notReviewed:0,sourced:0,ingredientLists:0};
 for(const record of REVIEW_RECORDS){
   if(record.sourceUrl)results.sourced++;
   if(record.ingredientStatements?.length)results.ingredientLists++;
   const s=decisions[record.id]?.decision;
   if(s==="looks-good")results.reviewed++;
   else if(s==="needs-changes")results.needsChanges++;
   else results.notReviewed++;
 }
 return results;
}
