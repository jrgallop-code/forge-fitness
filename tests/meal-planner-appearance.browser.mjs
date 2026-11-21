import {firefox} from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const css=["css/appearance-themes.css","css/meal-planner.css","css/meal-planner-appearance-fix.css"].map(p=>fs.readFileSync(p,"utf8")).join("\n");
const browser=await firefox.launch({headless:true});
try{
 for(const theme of ["level-up","arctic","pulse"]){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const items=["🥦","🫐","🍎","🥑"].map((emoji,i)=>
   '<label class="mp-photo-choice mp-food-choice"><input type="checkbox" '+(i===0?'checked':'')+'><span class="mp-illustration" style="--mp-illustration-color:#357a52"><span class="mp-illustration-icon">'+emoji+'</span></span><span class="mp-photo-copy"><strong>'+["Broccoli","Blueberries","Apple","Avocado"][i]+'</strong></span><span class="mp-choice-tick">✓</span></label>').join("");
  const html='<html data-theme="'+theme+'"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'</style></head><body style="margin:0"><main data-calories-panel="meals"><div data-meal-planner-root><section class="lu-meal-planner mp-onboarding mp-standalone"><header class="mp-screen-header"><button>‹</button><h2>Meal preferences</h2><span></span></header><div class="mp-onboarding-content"><form class="mp-wizard"><div class="mp-step-progress"><span></span></div><p class="mp-step-counter">Step 5 of 10</p><section class="mp-step"><h3>Foods you enjoy</h3><p>Choose favourite foods.</p><div class="mp-photo-grid mp-produce-grid">'+items+'</div><div class="mp-goal-box"><label>Planning goal <select><option>Maintain</option></select></label><label>Daily calories<input value="2600"></label></div><div class="mp-pills"><label class="mp-pill"><input type="checkbox" checked><span>Mediterranean</span></label></div></section><footer class="mp-wizard-footer"><button>Back</button><button class="primary-btn">Next</button></footer></form></div></section></div></main><nav class="bottom-nav">Navigation</nav></body></html>';
  await page.setContent(html);
  const data=await page.evaluate(()=>{
   const cards=[...document.querySelectorAll(".mp-produce-grid .mp-photo-choice")];
   return {columns:getComputedStyle(document.querySelector(".mp-produce-grid")).gridTemplateColumns,
    cardSizes:cards.map(c=>({width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height})),
    goalBackground:getComputedStyle(document.querySelector(".mp-goal-box")).backgroundColor,
    nav:getComputedStyle(document.querySelector(".bottom-nav")).visibility,
    docWidth:document.documentElement.scrollWidth};
  });
  assert.equal(data.cardSizes.length,4);
  assert.ok(data.cardSizes.every(c=>c.width>135&&c.width<200&&c.height<240),JSON.stringify(data));
  assert.equal(data.columns.split(" ").length,2);
  assert.equal(data.nav,"hidden");
  assert.ok(data.docWidth<=390,JSON.stringify(data));
  assert.equal(data.goalBackground,theme==="arctic"?"rgb(255, 255, 255)":theme==="pulse"?"rgb(29, 16, 28)":"rgb(28, 28, 34)");
  console.log("PASS",theme,"theme card, 2-column grid, no overflow, app nav hidden");
  await page.close();
 }
}finally{await browser.close();}
