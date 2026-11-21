// Read-only discovery index of publicly visible recipe titles from The Meal Prep Manual.
// These records are NOT complete recipes: no amounts, steps, nutrition, safety or image.
import {MPM_INDEX_PAGES_A} from "./meal-prep-manual-index-a.js";
import {MPM_INDEX_PAGES_B} from "./meal-prep-manual-index-b.js";
import {MPM_INDEX_PAGES_C} from "./meal-prep-manual-index-c.js";
const normalizedName=name=>String(name).normalize("NFKC").toLocaleLowerCase("en").replace(/[‘’]/g,"'").replace(/[^a-z0-9]+/g," ").trim().replace(/\\s+/g," ");
const suggestion=name=>{
 const text=name.toLowerCase();
 if(/breakfast|pancake|waffle|baked oatmeal|omelette|egg bake|granola|hash brown|french toast/.test(text))return "Breakfast";
 if(/cookie|cake|fudge|brownie|froyo|muffin|doughnut|donut|crisp|dessert|cheesecake|pudding|ice cream|milkshake|cinnamon roll|scone/.test(text))return "Meal 4";
 if(/bites|snack|wing|tots|fries|dip|spring roll/.test(text))return "Meal 4";
 return "Dinner";
};
function recipeId(name){
 const key=normalizedName(name);
 let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}
 return "mpm-index-"+(h>>>0).toString(36);
}
export const MPM_INDEX_RECIPES=Object.freeze((()=>{
 const seen=new Set();const result=[];
 for(const [page,joined] of [...MPM_INDEX_PAGES_A,...MPM_INDEX_PAGES_B,...MPM_INDEX_PAGES_C]){
   for(const value of joined.split("|")){
     const name=value.trim();const key=normalizedName(name);
     if(!key||seen.has(key))continue;
     seen.add(key);
     result.push(Object.freeze({
       id:recipeId(name),name,slot:suggestion(name),slotInferred:true,
       sourceName:"The Meal Prep Manual",
       sourceIndexPage:page,
       sourceIndexUrl:"https://mealprepmanual.com/recipes/?_page="+page,
       indexOnly:true,verificationStatus:"title-index-only",
       photoStatus:"not-created",nutritionStatus:"not-available",
       ingredients:null,rightsReview:"required"
     }));
   }
 }
 return result;
})());
export const MPM_INDEX_COUNT=MPM_INDEX_RECIPES.length;
