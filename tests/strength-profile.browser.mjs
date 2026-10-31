import {firefox} from 'playwright';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('js/progress/strength-profile.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
let css='';const c=vm.createContext({document:{getElementById:()=>null,createElement:()=>({}),head:{appendChild:s=>css=s.textContent}},window:{addEventListener(){}},STRENGTH_COMPARISONS_EVENT:'change',UNIT_KINDS:{LIFTING_WEIGHT:'liftingWeight'},formatMass:n=>n+' lb'});
vm.runInContext(source,c);c.ensureStyles();
const card=c.liftCard({name:'Barbell Bench Press',weight:150,reps:7,estimatedOneRepMax:185},{tier:'Intermediate',tierIndex:2,percentile:68,sampleSize:100});
const recapSource=fs.readFileSync('js/workouts/workout-complete-recap.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const r=vm.createContext({UNIT_KINDS:{LIFTING_WEIGHT:'liftingWeight'},formatUnitMass:n=>n+' lb'});vm.runInContext(recapSource,r);
const recap=r.renderTopSetsSlide({topSets:Array.from({length:3},()=>({name:'Barbell Bench Press',weight:150,reps:7,estimatedOneRepMax:185})),profileName:'John'});
const recapCss=fs.readFileSync('css/workout-complete-recap.css','utf8');
const browser=await firefox.launch();let count=0;
try{for(const width of [320,375,390,430])for(const light of [false,true]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:12px;--card:${light?'#fff':'#1c1c22'};--text:${light?'#202022':'#f7f7f8'};--text-secondary:${light?'#626267':'#aaaab3'};--border:${light?'#dededb':'#34343a'}}${css}</style><div class="strength-profile-grid">${card}</div>`);
 await page.evaluate(()=>{document.querySelectorAll('.strength-lift').forEach(card=>{const pages=card.querySelector('.strength-pages');card.querySelectorAll('[data-strength-page]').forEach((b,i)=>b.onclick=()=>pages.scrollTo({left:i*pages.clientWidth}));});});
 await page.locator('[data-strength-page="1"]').click();await page.waitForFunction(()=>document.querySelector('.strength-pages').scrollLeft>100);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const label=await page.locator('.strength-pages section').nth(1).getAttribute('aria-label');assert.equal(label,'Percentile');
 await page.locator('[data-strength-page="0"]').click();await page.waitForFunction(()=>document.querySelector('.strength-pages').scrollLeft===0);
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;--card:${light?'#fff':'#1c1c22'};--text:${light?'#202022':'#f7f7f8'};--share-text:var(--text);--share-muted:#888;--accent:#e10600}${recapCss}</style><div class="workout-complete-recap__carousel">${recap}</div>`);
 await page.evaluate(()=>document.querySelectorAll('[data-recap-strength]').forEach(n=>{n.hidden=false;n.textContent='Gym: Intermediate';n.style.cssText='display:block;font-size:10px;line-height:1.4;white-space:normal;max-width:100%;margin-top:4px;color:var(--share-text)'}));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.ok(await page.evaluate(()=>[...document.querySelectorAll('[data-recap-strength]')].every(n=>n.getBoundingClientRect().right<=innerWidth)));
 count+=2;await page.close();
}console.log(`PASS: ${count} profile/recap layouts; level-percentile navigation works; no page overflow.`);}finally{await browser.close();}
