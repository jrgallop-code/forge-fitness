import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const files=['js/nutrition/calorie-range-card.js','js/nutrition/calorie-range-calendar.js'];
const theme=readFileSync('css/appearance-themes.css','utf8');
const luminance=hex=>{const c=hex.replace('#','');const full=c.length===3?c.split('').map(x=>x+x).join(''):c;return [0,2,4].map(i=>parseInt(full.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);};
test('intake controls and calendar use defined shared appearance tokens',()=>{
 for(const file of files){const s=readFileSync(file,'utf8');assert.doesNotMatch(s,/--surface-2|--border|color:white/);assert.match(s,/var\(--surface-raised\)/);assert.match(s,/var\(--accent-contrast\)/);}
});
test('all seven appearances provide readable text on selected-row/control surfaces',()=>{
 for(const name of ['level-up','arctic','pure','ocean','midnight','slate','pulse']){
  const block=theme.split(`html[data-theme="${name}"] {`)[1].split('}')[0];
  const bg=block.match(/--surface-raised:(#[0-9a-f]+)/i)[1],fg=block.match(/--text:(#[0-9a-f]+)/i)[1];
  const a=luminance(bg),b=luminance(fg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  assert.ok(ratio>=4.5,`${name}: ${ratio}`);
 }
});
