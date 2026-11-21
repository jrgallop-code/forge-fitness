import test from "node:test";
import assert from "node:assert/strict";
import {ingredients,sum} from "../js/nutrition/meal-prep-beta.js";
test("Three batch-cooked dinner portions scale every ingredient including seasoning",()=>{
 const plans=[{id:"batch-1",portions:3}];
 const rows=sum(plans);
 assert.equal(rows.length,ingredients.length);
 assert.equal(rows.find(x=>x.name==="Chicken breast (raw)").amount,450);
 assert.equal(rows.find(x=>x.name==="White rice (dry)").amount,180);
 assert.equal(rows.find(x=>x.name==="Olive oil").amount,15);
 assert.equal(rows.find(x=>x.name==="Ground cumin").amount,3);
 assert.ok(Math.abs(rows.find(x=>x.name==="Black pepper").amount-0.9)<1e-9);
});
test("Grocery list consolidates repeated batches and recalculates removal",()=>{
 const a={portions:3},b={portions:2};
 const five=sum([a,b]);const three=sum([a]);
 assert.equal(five.find(x=>x.name==="Chicken breast (raw)").amount,750);
 assert.equal(three.find(x=>x.name==="Chicken breast (raw)").amount,450);
 assert.equal(five.filter(x=>x.name==="Chicken breast (raw)").length,1);
});