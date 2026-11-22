import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {mealPlannerHomeMarkup} from "../js/nutrition/meal-planner-home.js";
import {baseRecipes,photoMarkup} from "../js/nutrition/meal-planner-catalog-ui.js";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");
test("approved iOS dashboard renders one functional SVG tile for each main destination",()=>{
 const html=mealPlannerHomeMarkup({plan:null,recipes:baseRecipes(),photoMarkup,favoriteIds:[]});
 for(const dest of ["calendar","groceries","catalog","favorites"])assert.match(html,new RegExp('data-mp-open="'+dest+'"'));
 assert.equal((html.match(/class="mp-home-shortcut"/g)||[]).length,4);
 assert.equal((html.match(/<svg /g)||[]).length>=5,true);
 assert.match(html,/data-mp-home-date=/);
 assert.match(html,/mp-home-recipe/);
 assert.match(html,/data-mp-exit/);
 assert.match(html,/Generate a personalized meal plan/);
});
test("home shows sharp-image recipes rather than tiny featured preview atlas on first visit",()=>{
 const html=mealPlannerHomeMarkup({plan:null,recipes:baseRecipes(),photoMarkup,favoriteIds:[]});
 for(const name of ["Chicken rice bowl","Lean beef rice skillet","Turkey avocado wrap","Salmon and sweet potato"])assert.ok(html.includes(name));
 assert.equal((html.match(/class="mp-home-recipe"/g)||[]).length,4);
 assert.match(html,/generated-001-020\.png/);
 assert.doesNotMatch(html,/featured-unique-photos/);
});
test("saved weekly meals are displayed only as plans, never silently logged",()=>{
 const recipes=baseRecipes(),r=recipes.find(x=>x.name==="Chicken rice bowl");
 const date="2026-11-23";
 const html=mealPlannerHomeMarkup({plan:{entries:[{date,slot:"Dinner",recipeId:r.id,ingredients:r.ingredients}]},selectedDate:date,recipes,photoMarkup,favoriteIds:[r.id]});
 assert.match(html,/This Week/);
 assert.match(html,/1 planned meal/);
 assert.equal((html.match(/class="mp-home-recipe"/g)||[]).length,1);
 assert.match(html,/data-mp-favorite/);
 assert.doesNotMatch(html,/data-meal-consume/);
});
test("existing iOS Nutrition Food Log tab stays default, home is inside Meal Plan only",async()=>{
 const [router,foodLog,planner,styles]=await Promise.all([read("../js/core/router.js"),read("../js/nutrition/food-log.js"),read("../js/nutrition/meal-planner-ui.js"),read("../css/meal-planner-catalog-polish.css")]);
 assert.match(router,/case "nutrition":\s*case "energy":/);
 assert.match(foodLog,/showTab\("log"\);/);
 assert.match(planner,/let plannerScreen="home"/);
 assert.match(planner,/page==="home"/);
 assert.match(styles,/\.mp-home-quick/);
 assert.match(styles,/\.mp-home-recipe/);
});
