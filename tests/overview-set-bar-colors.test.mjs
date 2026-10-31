import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function colors(theme) {const c=vm.createContext({getAppearanceTheme:()=>theme,resolveAppearanceTheme:t=>t,localStorage:{getItem:()=>null}});vm.runInContext(read('js/core/muscle-map-colors.js').replace(/^import .*;\n/,'').replace(/export /g,''),c);return c;}
test('high-specificity theme rules defer to the per-set band, including Classic',()=>{
 const css=read('css/theme-surface-audit.css');
 for(const theme of ['html[data-theme]','html[data-theme="level-up"]']) {
  const selector=theme+' :is(.smart-set-breakdown-row > i > b, .plan-muscle-breakdown-row > i > b)';
  const start=css.indexOf(selector);assert.ok(start>=0);
  const rule=css.slice(start,css.indexOf('}',start));
  assert.match(rule,/background:\s*var\(--set-band-color,/);
 }
});
test('Smart Builder generates the shared band variable for each muscle count',()=>{
 for(const theme of ['level-up','arctic','midnight','pulse']) {
  const c=colors(theme),s=read('js/workouts/smart-build-unified-engine-v11.js');
  c.MUSCLES=['Chest','Back','Biceps'];c.displayMuscle=n=>n;c.escapeHtml=n=>n;c.formatNumber=n=>n;
  vm.runInContext(s.slice(s.indexOf('function renderMuscleSetBreakdown('),s.indexOf('\nfunction savePlan(',s.indexOf('function renderMuscleSetBreakdown('))),c);
  const html=c.renderMuscleSetBreakdown({Chest:10,Back:13.5,Biceps:2});
  for(const sets of [10,13.5,2])assert.ok(html.includes(c.setBandStyle(sets)));
 }
});
test('existing workout overview uses the same helper without sex-specific colour rules',()=>{
 const s=read('js/workouts/workout-plan-target-map.js');assert.ok(s.includes('${setBandStyle(sets)};width:'));
 assert.ok(s.includes('getAnatomyConfig(side)'));assert.ok(!s.includes('sex === "male"'));
});
