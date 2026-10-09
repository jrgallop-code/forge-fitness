const labels={'Weight':'trend','Goal':'goal','Weight + Carbs':'carbs','Calories + Rate':'weekly-calorie-rate'};
export function syncWeightCarouselPages(card){
 const track=card.querySelector('[data-weight-graph-carousel-track-v2]'),pager=card.querySelector('.weight-graph-carousel-pager-v2');
 if(!track||!pager)return;
 const slides=[...track.children];
 const buttons=[...pager.querySelectorAll('button')];
 for(const button of buttons){
  const name=button.getAttribute('aria-label')||button.textContent.trim();
  const kind=labels[name],index=slides.findIndex(s=>s.dataset.weightGraphSlideV2===kind);
  if(index>=0){button.dataset.weightGraphPageV2=String(index);button.dataset.weightGraphKind=kind;}
 }
 const sorted=buttons.sort((a,b)=>Number(a.dataset.weightGraphPageV2)-Number(b.dataset.weightGraphPageV2));
 sorted.forEach((button,i)=>{if(pager.children[i]!==button)pager.insertBefore(button,pager.children[i]||null);});
}
export function nearestWeeklyPoint(rows,ratio){
 const index=Math.max(0,Math.min(rows.length-1,Math.round(ratio*Math.max(1,rows.length-1))));
 let best=null,distance=Infinity;
 rows.forEach((row,i)=>{if(row.calories==null&&row.rate==null)return;const delta=Math.abs(i-index);if(delta<distance){best=row;distance=delta;}});
 return best;
}
