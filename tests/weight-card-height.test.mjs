import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('carousel height follows active slide rather than tallest sibling',()=>{
 const source=readFileSync(new URL('../js/progress/weight-chart-carousel-v3.js', import.meta.url),'utf8');const fn=source.slice(source.indexOf('function syncCarouselHeight('),source.indexOf('function syncPager('));
 const track={clientWidth:340,scrollLeft:0,style:{},children:[{getBoundingClientRect:()=>({height:450})},{getBoundingClientRect:()=>({height:740})}]};
 const box={};vm.createContext(box);vm.runInContext(fn+';globalThis.sync=syncCarouselHeight',box);
 const card={querySelector:()=>track};box.sync(card);assert.equal(track.style.height,'450px');track.scrollLeft=340;box.sync(card);assert.equal(track.style.height,'740px');track.scrollLeft=0;box.sync(card);assert.equal(track.style.height,'450px');
});
