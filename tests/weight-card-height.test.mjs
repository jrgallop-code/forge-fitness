import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {swipePage} from '../js/progress/weight-carousel-pages.js';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/progress/weight-chart-carousel-v3.js',import.meta.url),'utf8');
function harness(){
 const handlers=new Map(),timers=new Map(),frames=[];let next=0;
 const track={clientWidth:340,clientLeft:0,scrollWidth:1361.5,scrollLeft:0,style:{height:'450px',scrollSnapType:'',scrollBehavior:''},dataset:{},isConnected:true,getBoundingClientRect:()=>({left:25}),addEventListener:(k,fn)=>handlers.set(k,fn),scrollTo:({left,behavior})=>{track.scrollLeft=left;track.lastBehavior=behavior;}};
 track.children=[450,740,530,510].map((height,index)=>({dataset:{weightGraphSlideV2:index===0?'trend':'other'},getBoundingClientRect:()=>({left:25+index*340.5-track.scrollLeft,height})}));
 const card={dataset:{},querySelector:()=>track,querySelectorAll:selector=>selector.includes('slide')?track.children:[]};
 const sandbox={swipePage,setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>frames.push(fn),scheduleRefresh:()=>{}};
 vm.createContext(sandbox);vm.runInContext(source.slice(source.indexOf('function carouselOffsets('),source.indexOf('function bindRefreshes('))+';globalThis.api={syncCarouselHeight,bindCarouselSettling,carouselOffsets,nearestCarouselPage}',sandbox);
 return{track,card,api:sandbox.api,fire:(name,event={type:name,touches:[{clientX:100,clientY:100}]})=>handlers.get(name)(event),flush:()=>{const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn());frames.splice(0).forEach(fn=>fn());}};
}
test('carousel sizes the active slide and defers height changes during a swipe',()=>{
 const {track,card,api}=harness();api.syncCarouselHeight(card);assert.equal(track.style.height,'450px');track.scrollLeft=340.5;track.dataset.scrolling='1';api.syncCarouselHeight(card);assert.equal(track.style.height,'450px');delete track.dataset.scrolling;api.syncCarouselHeight(card);assert.equal(track.style.height,'740px');
});
test('each midway position settles to real card geometry without another smooth scroll',()=>{
 const h=harness();h.api.bindCarouselSettling(h.card,h.track);
 for(const [position,expected] of [[200,340.5],[540,681],[950,1021.5],[450,340.5],[150,0]]){h.track.scrollLeft=position;h.fire('scroll');h.flush();assert.equal(h.track.scrollLeft,expected);assert.equal(h.track.lastBehavior,'instant');assert.equal(h.track.style.scrollSnapType,'x mandatory');assert.equal(h.track.dataset.scrolling,undefined);}
});
test('settling never interrupts a finger held on the carousel',()=>{
 const h=harness();h.api.bindCarouselSettling(h.card,h.track);h.fire('touchstart');h.track.scrollLeft=200;h.fire('scroll');h.flush();assert.equal(h.track.scrollLeft,200);assert.equal(h.track.style.height,'450px');h.fire('touchend');h.flush();assert.equal(h.track.scrollLeft,340.5);assert.equal(h.track.style.height,'740px');
});

