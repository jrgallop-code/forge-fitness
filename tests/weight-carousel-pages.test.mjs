import test from 'node:test';import assert from 'node:assert/strict';
import {syncWeightCarouselPages,nearestWeeklyPoint} from '../js/progress/weight-carousel-pages.js';
test('carousel page numbers follow real slide order after goal and comparison insertion',()=>{
 const slides=['weekly-calorie-rate','trend','goal','carbs'].map(kind=>({dataset:{weightGraphSlideV2:kind}}));
 const buttons=['Weight','Goal','Weight + Carbs','Calories + Rate'].map(label=>({dataset:{},textContent:label,getAttribute:()=>label}));
 const pager={children:[...buttons],querySelectorAll:()=>buttons,insertBefore(button,before){this.children.splice(this.children.indexOf(button),1);const index=before?this.children.indexOf(before):this.children.length;this.children.splice(index,0,button);}};
 syncWeightCarouselPages({querySelector:selector=>selector.includes('track')?{children:slides}:pager});
 assert.deepEqual(pager.children.map(b=>b.dataset.weightGraphPageV2),['0','1','2','3']);
 assert.deepEqual(pager.children.map(b=>b.dataset.weightGraphKind),['weekly-calorie-rate','trend','goal','carbs']);
});
test('plot-wide taps select nearest week without needing a point hit',()=>{
 const rows=Array.from({length:8},(_,i)=>({startDate:String(i),calories:2500+i,rate:null}));
 assert.equal(nearestWeeklyPoint(rows,.43).startDate,'3');
 assert.equal(nearestWeeklyPoint(rows,-.2).startDate,'0');
 assert.equal(nearestWeeklyPoint(rows,1.2).startDate,'7');
});
test('taps skip weeks with no values and handle a completely empty plot',()=>{
 const rows=[{calories:2000,rate:null},{calories:null,rate:null},{calories:null,rate:.5}];
 assert.equal(nearestWeeklyPoint(rows,.8),rows[2]);assert.equal(nearestWeeklyPoint([{calories:null,rate:null}],.5),null);
});
test('swipe completion always selects a whole neighbouring page or returns to the starting page',async()=>{
 const {swipePage}=await import('../js/progress/weight-carousel-pages.js');
 assert.equal(swipePage(0,-100,390,4),1);
 assert.equal(swipePage(1,100,390,4),0);
 assert.equal(swipePage(1,-15,390,4),1);
 assert.equal(swipePage(0,100,390,4),0);
 assert.equal(swipePage(3,-100,390,4),3);
});
