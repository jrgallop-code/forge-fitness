import { firefox } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const css=['css/styles.css','css/progress-volume.css','css/muscle-overview.css','css/progress-edge-layout.css','css/training-analytics-carousel.css','css/muscle-overview-v2-fix.css'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
const asset=p=>'data:image/svg+xml;base64,'+fs.readFileSync(p).toString('base64');
const browser=await firefox.launch({headless:true});
let checks=0;
try {
 for(const layout of ['stacked','carousel'])for(const sex of ['male','female'])for(const width of [320,375,390,430,768]) {
  console.log("Checking",layout,sex,width);const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(10000);
  const figures=['front','back'].map(side=>{
   const src=asset(`assets/recovery/${sex==='female'?'female-':''}${side}-view.svg`);
   const vb=sex==='male'&&side==='back'?'960 0 960 1920':'0 0 960 1920';
   return `<figure class="seven-day-volume-figure"><svg class="seven-day-volume-anatomy" viewBox="${vb}"><image href="${src}" x="${vb.startsWith('960')?960:0}" width="960" height="1920"/></svg><figcaption>${side}</figcaption></figure>`;
  }).join('');
  await page.setContent(`<style>${css}\n*{box-sizing:border-box}body{margin:0}#content{padding:6px;width:100%}.progress-page{width:100%;padding:6px}.fixed-label{color:white}</style><main id="content"><section class="section-card progress-page"><div id="lifting-progress"><div class="training-progress-view" data-view="training"><div class="muscle-overview-volume-content"><div data-seven-day-volume-root><header class="seven-day-volume-heading"><div><h4>Sets per Muscle Group</h4><p>Last 7 days</p></div><strong class="seven-day-volume-window">Oct 24–30</strong></header><div class="seven-day-volume-map-card"><div class="seven-day-volume-bodies">${figures}</div></div><div class="seven-day-volume-breakdown"><div class="seven-day-volume-breakdown-heading"><h4>Sets by Muscle</h4><span id="range-label">1W · Primary 1.0 · Secondary 0.5</span></div><div class="seven-day-volume-row"><div class="seven-day-volume-row-top"><strong>Chest</strong><span id="sets">10 sets</span></div><div class="seven-day-volume-track"><div class="seven-day-volume-fill" style="width:50%"></div></div></div></div></div><div class="training-analytics-carousel"><div class="training-analytics-carousel-track"><article class="analytics-card training-analytics-slide"><div class="weekly-muscle-volume"><div class="volume-heatmap-wrap"><div class="volume-heatmap" id="weeks"></div></div></div><div class="overall-week-chart" id="overall"></div></article></div></div></div></div></section></main>`,{waitUntil:"domcontentloaded",timeout:10000});
  if(layout==='stacked')await page.evaluate(()=>{
   const carousel=document.querySelector('.training-analytics-carousel');
   const track=carousel.querySelector('.training-analytics-carousel-track');
   carousel.removeAttribute('class');carousel.setAttribute('data-muscle-volume-analytics','');
   track.removeAttribute('class');track.style.display='contents';
   carousel.querySelector('.training-analytics-slide').classList.remove('training-analytics-slide');
  });
  const measure=()=>page.evaluate(()=>({page:document.documentElement.scrollWidth,card:document.querySelector('.seven-day-volume-map-card').getBoundingClientRect().width,svg:[...document.querySelectorAll('.seven-day-volume-anatomy')].map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})),markup:document.querySelector('.seven-day-volume-bodies').innerHTML}));
  const first=await measure();
  for(const weeks of [1,4,12,26,52,104]) {
   await page.evaluate(n=>{const host=document.getElementById('weeks');host.style.setProperty('--week-count',n);host.innerHTML='<div>Muscle</div>'+Array.from({length:n},(_,i)=>'<div class="volume-week-label">Oct '+(i+1)+'</div>').join('')+'<div class="volume-muscle-label">Hamstrings</div>'+Array.from({length:n},()=>'<div class="volume-cell">12.5</div>').join('');document.getElementById('overall').innerHTML=Array.from({length:n},()=>'<div class="overall-week-column"><strong>55</strong><div class="overall-week-bar-wrap"></div><small>Oct 30</small></div>').join('');document.getElementById('sets').textContent=n*10+' sets';document.getElementById('range-label').textContent=(n===1?'1W':'ALL')+' · Primary 1.0 · Secondary 0.5';},weeks);
   const after=await measure();assert.ok(after.page<=width,`${sex} ${width}px ${weeks} weeks: page overflow ${after.page}`);assert.ok(Math.abs(after.card-first.card)<1,'map card changed width');assert.deepEqual(after.svg,first.svg,'SVG dimensions changed');assert.equal(after.markup,first.markup,'SVG content changed');checks++;
  }
  if(sex==='male'&&width===390)await page.screenshot({path:'muscle-map-viewport.png',fullPage:true});
  await page.close();
 }
 console.log(`PASS: ${checks} male/female viewport and timeframe combinations; SVG content and dimensions unchanged; no page overflow.`);
}finally {await browser.close();}

