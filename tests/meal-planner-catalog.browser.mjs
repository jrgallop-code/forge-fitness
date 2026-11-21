import {firefox} from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const css=[
 "css/appearance-themes.css","css/meal-planner.css",
 "css/meal-planner-appearance-fix.css","css/meal-planner-catalog-polish.css"
].map(path=>fs.readFileSync(path,"utf8")).join("\n");
function brightness(value){
 const channels=(String(value).match(/[\d.]+/g)||[]).slice(0,3).map(Number);
 if(channels.length!==3)return 0;
 return channels.reduce((sum,c,idx)=>{
  const srgb=c/255;
  return sum+[.2126,.7152,.0722][idx]*(srgb<=.04045?srgb/12.92:((srgb+.055)/1.055)**2.4);
 },0);
}
function contrast(a,b){const x=brightness(a),y=brightness(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const browser=await firefox.launch({headless:true});
try{
 for(const theme of ["level-up","arctic","pure","ocean","midnight","slate","pulse"]){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<!doctype html><html data-theme="'+theme+'"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body style="margin:0"><div data-meal-planner-root><section class="lu-meal-planner mp-landing mp-standalone"><div class="mp-landing-actions"><button class="primary-btn">View my plan</button><button class="mp-landing-secondary">Edit preferences</button></div></section></div></body></html>');
  const colors=await page.evaluate(()=>{
   const secondary=document.querySelector(".mp-landing-secondary");
   const primary=document.querySelector(".primary-btn");
   return {secondaryBg:getComputedStyle(secondary).backgroundColor,
    secondaryText:getComputedStyle(secondary).color,
    primaryBg:getComputedStyle(primary).backgroundColor,
    primaryText:getComputedStyle(primary).color};
  });
  assert.ok(contrast(colors.secondaryBg,colors.secondaryText)>=4.5,"secondary button contrast in "+theme+": "+JSON.stringify(colors));
  assert.ok(contrast(colors.primaryBg,colors.primaryText)>=4.5,"primary button contrast in "+theme+": "+JSON.stringify(colors));
  console.log("PASS",theme,"contrast",contrast(colors.secondaryBg,colors.secondaryText).toFixed(1));
  await page.close();
 }
}finally{await browser.close();}
