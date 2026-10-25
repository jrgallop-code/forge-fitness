import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/core/muscle-map-colors.js',import.meta.url),'utf8').replace(/^import .*;\n/, '').replace(/export /g,'');
function setup(theme='arctic') {
 const context=vm.createContext({getAppearanceTheme:()=>theme,resolveAppearanceTheme:t=>t,localStorage:{getItem:()=>null}});
 vm.runInContext(source,context);return context;
}
test('set palette endpoints and zero remain distinct across every appearance',()=>{
 for(const theme of ['arctic','level-up','midnight','pulse','pure','ocean','slate']){
  const c=setup(theme), color=n=>vm.runInContext(`getSetDistributionColor(${n})`,c);
  const palette=vm.runInContext('getSetDistributionPalette()',c);
  assert.equal(color(1),palette.at(-1));assert.equal(color(2),palette.at(-1));
  assert.notEqual(color(0),palette[0]);assert.equal(color(-1),color(0));
  assert.equal(color(.5),palette[3]);assert.notEqual(color(.1),color(.9));
 }
});
test('male and female rendered regions share normalized colors without changing set intensities or recovery',()=>{
 const c=setup(); const nodes=[0,.25,.5,1].map(intensity=>({style:{values:{'--seven-day-volume-intensity':String(intensity)},getPropertyValue(k){return this.values[k]||''},setProperty(k,v){this.values[k]=v}}}));
 c.document={querySelectorAll:selector=>selector==='[data-seven-day-muscle]'?nodes:[]};
 vm.runInContext('syncRenderedMaps()',c);
 assert.equal(nodes[2].style.values.fill,'#62B86C');
 assert.equal(nodes[3].style.values.fill,'#DC655D');
 assert.equal(nodes[0].style.values['fill-opacity'],'0');
 for(const n of nodes.slice(1))assert.equal(n.style.values['fill-opacity'],'1');
 assert.deepEqual(nodes.map(n=>n.style.values['--seven-day-volume-intensity']),['0','0.25','0.5','1']);
});
