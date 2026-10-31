import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const strip=s=>s.replace(/^import .*;\n/gm,'').replace(/export /g,'');
function colors(theme='level-up') {
 const c=vm.createContext({getAppearanceTheme:()=>theme,resolveAppearanceTheme:t=>t,localStorage:{getItem:()=>null}});
 vm.runInContext(strip(read('js/core/muscle-map-colors.js')),c);return c;
}
function ui(path,sex='male') {
 const c=colors();
 c.getNutritionProfile=()=>({sex});
 vm.runInContext(strip(read('js/core/anatomy-profile.js')),c);
 c.document={querySelector:()=>null,getElementById:()=>null,addEventListener:()=>{},querySelectorAll:()=>[]};
 c.window={addEventListener:()=>{},setTimeout:()=>{}};c.requestAnimationFrame=()=>{};c.formatSetCredits=n=>`${n} sets`;
 vm.runInContext(strip(read(path)),c);return c;
}
test('fixed band edges and half-sets match for every theme',()=>{
 for(const theme of ['level-up','arctic','pure','ocean','midnight','slate','pulse']) {
  const c=colors(theme);const palette=c.getSetDistributionPalette();
  for(const [n,index] of [[0,0],[.5,1],[2,1],[2.5,2],[4,2],[4.5,3],[6,3],[6.5,4],[8,4],[8.5,5],[10,5],[10.5,6],[12,6],[12.5,7],[99,7]]) {
   assert.equal(c.getSetBandIndex(n),index);
   assert.equal(c.getSetBandColor(n),index?palette[index-1]:c.getSetDistributionColor(0));
   assert.match(c.setBandStyle(n),new RegExp(`--set-band-${index}\\)`));
  }
  assert.equal(c.getSetBandIndex(NaN),0);assert.equal(c.getSetBandIndex(-5),0);
 }
});
test('dot legend has exact disjoint ranges and no gradient',()=>{
 const c=colors();const legend=c.renderSetRangeLegend();
 for(const label of ['0.5–2','2.5–4','4.5–6','6.5–8','8.5–10','10.5–12','12.5+'])assert.ok(legend.includes(label));
 assert.equal((legend.match(/<b /g)||[]).length,8);assert.ok(!legend.includes('gradient'));assert.ok(legend.includes('secondary muscles as 0.5'));
});
test('male and female front/back mapped fragments exist in their actual assets',()=>{
 for(const sex of ['male','female']) {
  const c=colors();c.getNutritionProfile=()=>({sex});vm.runInContext(strip(read('js/core/anatomy-profile.js')),c);
  for(const side of ['front','back']) {
   const config=c.getAnatomyConfig(side);assert.equal(config.sex,sex);const svg=read(config.asset.split('?')[0]);
   for(const ids of Object.values(config.regions))for(const id of ids)assert.ok(svg.includes(`id="${id}"`),`${sex} ${side}: ${id}`);
  }
 }
});
test('Progress and plan render identical band colors for the same set count and sex',()=>{
 for(const sex of ['male','female']) {
  for(const path of ['js/progress/muscle-overview.js','js/progress/muscle-overview-v2.js','js/workouts/workout-plan-target-map.js']) {
   const c=ui(path,sex);
   const html=path.includes('target-map')?c.renderMuscleBreakdownSlide(new Map([['Chest',10],['Back',13.5]])):c.renderVolumeRow('Chest',10);
   assert.ok(html.includes('--set-band-5'));assert.ok(html.includes('10 sets'));
   const anatomy=c.anatomyMarkup('front');assert.ok(anatomy.includes(sex==='female'?'female-front-view':'recovery/front-view'));
  }
 }
});
test('live map fill uses uncapped set counts while legacy continuous colors remain unchanged',()=>{
 const c=colors();const nodes=[0,2,2.5,10,12,12.5].map(sets=>({dataset:{completedSets:String(sets)},style:{v:{'--seven-day-volume-intensity':String(Math.min(1,sets/12))},getPropertyValue(k){return this.v[k]||''},setProperty(k,v){this.v[k]=v}}}));
 c.document={querySelectorAll:s=>s==='[data-seven-day-muscle]'?nodes:[]};c.syncRenderedMaps();
 for(const n of nodes)assert.equal(n.style.v.fill,c.getSetBandColor(n.dataset.completedSets));
 assert.notEqual(nodes[4].style.v.fill,nodes[5].style.v.fill);
 assert.equal(c.getSetDistributionColor(.5),c.getSetDistributionPalette()[3]);
});
