import test from "node:test";
import assert from "node:assert/strict";
import {GENERATED_MEAL_ATLAS,generatedMealTile} from "../js/nutrition/meal-planner-art.js";
import {MEAL_CATALOG} from "../js/nutrition/meal-planner-data.js";
import {mealPhoto} from "../js/nutrition/meal-planner-media.js";
test("offline generated artwork contains complete 40-meal image atlas",()=>{
 const base64=GENERATED_MEAL_ATLAS.split(",")[1];
 const image=Buffer.from(base64,"base64");
 assert.equal(image.subarray(0,4).toString(),"RIFF");
 assert.equal(image.subarray(8,12).toString(),"WEBP");
 assert.ok(image.length>5000);
 assert.equal(image.readUInt32LE(4)+8,image.length);
 assert.equal(new Set(MEAL_CATALOG.map(generatedMealTile)).size,40);
 for(const meal of MEAL_CATALOG){
  assert.equal(mealPhoto(meal),"generated-meal:"+generatedMealTile(meal));
 }
});
