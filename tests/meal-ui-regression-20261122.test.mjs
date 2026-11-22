import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Dashboard calories opens Food Log through registered app route",()=>{
 const s=read("js/dashboard/nutrition-target-card.js");
 assert.match(s,/new CustomEvent\("levelup:navigate"/);
 assert.match(s,/page: "energy", tab: "log"/);
 assert.doesNotMatch(s,/querySelector\('\.nav-btn\[data-page="energy"\]'/);
});
test("Meal group headings do not render decorative photos",()=>{
 const s=read("js/nutrition/food-log.js");
 assert.doesNotMatch(s,/\$\{diaryMealPhotoMarkup\(meal, entries\)\}<span class="food-meal-title"/);
 assert.match(s,/class="food-meal-title"/);
});
test("iOS weekly scheduled cards open the original editable recipe details",()=>{
 const file=new URL("../js/nutrition/meal-planner-ui.js",import.meta.url);
 if(!existsSync(file))return;
 const s=read("js/nutrition/meal-planner-ui.js");
 assert.match(s,/function renderDaysFull\(plan\)/);
 assert.match(s,/function renderPlannedMealDetail\(plan,date,slot\)/);
 assert.match(s,/class="mp-week-recipe-open"/);
 assert.match(s,/data-mp-planned-detail/);
 assert.match(s,/page==="planned-detail"/);
 assert.match(s,/data-meal-grams/);
 assert.match(s,/data-meal-consume/);
 assert.match(s,/data-meal-remove/);
});
