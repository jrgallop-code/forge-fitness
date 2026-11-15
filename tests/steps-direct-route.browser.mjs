import { firefox } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const progressSource=readFileSync('js/progress/progress-ui.js','utf8');
const weightSource=readFileSync('js/progress/weight-tracker.js','utf8');
const stepsSource=readFileSync('js/progress/steps-progress-carousel.js','utf8');
const strip = code => code.replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'');
const render=vm.runInNewContext(strip(progressSource)+'\nrenderProgress',{
  renderCalorieStats:()=>'',renderPhotoJournal:()=>''
});
const selectorStart=weightSource.indexOf('export function selectProgressTab(');
const selectorEnd=weightSource.indexOf('\nfunction initializeProgressTabs()',selectorStart);
assert.ok(selectorStart>0&&selectorEnd>selectorStart);
const selector=weightSource.slice(selectorStart,selectorEnd).replace('export function','function');
const deepStart=stepsSource.indexOf('export function openStepsInProgress(){');
const deepEnd=stepsSource.indexOf('function ensureStyles(){',deepStart);
assert.ok(deepStart>0&&deepEnd>deepStart);
const deep=stepsSource.slice(deepStart,deepEnd).replace('export function','function');

const browser=await firefox.launch({headless:true});
try {
 for(const width of [320,390,430]){
   const page=await browser.newPage({viewport:{width,height:780}});
   await page.setContent(`<style>
     body{margin:0;font:14px system-ui}
     #content{padding:14px}
     .progress-tabs{display:flex;overflow-x:auto;width:100%;gap:8px}
     .progress-tab{flex:0 0 105px;padding:12px 0}
     .progress-tab.active{background:#dd3355;color:white}
     [hidden]{display:none!important}
     #steps-progress{min-height:220px}
   </style><button id="dashboard-steps">Steps</button><div id="content"></div>`);
   await page.addScriptTag({content:`
     ${selector}
     ${deep}
     function initializeStepsProgress(){}
     document.addEventListener('levelup:navigate',e=>{
        const page=e.detail.page;
        const tab=page==='progress-steps'||e.detail.tab==='steps'?'steps':'lifting';
        document.getElementById('content').innerHTML=window.__renderedProgress[tab];
        if(tab==='steps')selectProgressTab('steps',{center:false});
     });
     document.getElementById('dashboard-steps').addEventListener('click',openStepsInProgress);
   `});
   await page.evaluate(markup=>{window.__renderedProgress=markup;},{
     steps:render({initialTab:'steps'}),lifting:render({initialTab:'lifting'})
   });
   await page.locator('#dashboard-steps').click();
   const state=await page.evaluate(()=>({
      selected:document.querySelector('.progress-tab.active')?.id,
      stepsHidden:document.querySelector('#steps-progress')?.hidden,
      liftingHidden:document.querySelector('#lifting-progress')?.hidden,
      width:document.querySelector('.progress-tabs')?.clientWidth,
      tabScroll:document.querySelector('.progress-tabs')?.scrollLeft,
      stepsShown:!!document.querySelector('#steps-progress [data-levelup-steps-detail]')
   }));
   assert.equal(state.selected,'steps-progress-tab',JSON.stringify(state));
   assert.equal(state.stepsHidden,false,JSON.stringify(state));
   assert.equal(state.liftingHidden,true,JSON.stringify(state));
   assert.equal(state.stepsShown,true,JSON.stringify(state));
   console.log('PASS: Dashboard Steps routes directly to visible Progress Steps at '+width+'px',state);
   await page.close();
 }
}finally{await browser.close()}
