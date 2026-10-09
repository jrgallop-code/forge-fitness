import {buildWeeklyCalorieRate,weeklyComparisonWindow} from './weekly-calorie-rate-model.js';
import {readFoodLog} from '../nutrition/food-log-data.js?v=fatsecret-progress-calories-1';
import {displayMass,massUnit} from '../core/unit-system.js?v=granular-units-1';
let selected=null,bound=false;
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const short=d=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
export function initializeWeeklyCalorieRateCard(root=document){
 const card=root.querySelector?.('#weight-progress .weight-chart-card')||document.querySelector('#weight-progress .weight-chart-card');
 const track=card?.querySelector('[data-weight-graph-carousel-track-v2]'),pager=card?.querySelector('.weight-graph-carousel-pager-v2');
 if(!track||!pager)return;
 let slide=track.querySelector('[data-weight-graph-slide-v2="weekly-calorie-rate"]');
 if(!slide){
  slide=document.createElement('section');slide.className='weight-graph-carousel-slide-v2 weekly-calorie-rate';slide.dataset.weightGraphSlideV2='weekly-calorie-rate';
  slide.innerHTML='<h3>Calories &amp; Weight Change</h3><p>Weekly average intake · weekly trend rate</p><div data-weekly-rate-plot></div><p class="weekly-rate-legend"><span>━ Average calories</span><span>┄ Weight change rate</span></p><div data-weekly-rate-detail aria-live="polite"></div><p class="weekly-rate-note">Tap a week for values and logging coverage. Calories average logged days; at least 4 food-logging days are needed. Weight rate uses the existing trend calculation at each week’s end. Separate scales; line crossings have no meaning.</p>';
  track.append(slide);
  const button=document.createElement('button');button.type='button';button.dataset.weightGraphPageV2=String([...track.children].indexOf(slide));button.textContent='Calories + Rate';button.setAttribute('aria-pressed','false');pager.append(button);
  pager.style.gridTemplateColumns=`repeat(${track.children.length},minmax(0,1fr))`;
  slide.addEventListener('click',event=>{
   const point=event.target.closest('[data-weekly-rate-week]');if(point){selected=point.dataset.weeklyRateWeek;render(slide);}
  });
  slide.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-weekly-rate-week]')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  // Keep the existing page order; wrap a right swipe from Weight to the new card.
  let start=null;
  track.addEventListener('touchstart',e=>{start={x:e.touches[0].clientX,y:e.touches[0].clientY,left:track.scrollLeft};},{passive:true});
  track.addEventListener('touchend',e=>{
   if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;
   if(dx>50&&Math.abs(dx)>Math.abs(dy)*1.5&&start.left<10)track.scrollTo({left:track.scrollWidth-track.clientWidth,behavior:'instant'});
   if(dx < -50&&Math.abs(dx)>Math.abs(dy)*1.5&&start.left>=track.scrollWidth-track.clientWidth-10)track.scrollTo({left:0,behavior:'instant'});
   start=null;
  },{passive:true});
 }
 if(!document.getElementById('weekly-calorie-rate-style')){
  const style=document.createElement('style');style.id='weekly-calorie-rate-style';style.textContent='.weekly-calorie-rate{padding:4px 2px;color:var(--text)}.weekly-calorie-rate h3{margin:5px 0;font-size:18px}.weekly-calorie-rate p{font-size:12px;color:var(--muted)}.weekly-calorie-rate svg{display:block;width:100%;height:auto}.weekly-rate-legend{display:flex;justify-content:space-between;gap:8px}.weekly-rate-legend span:first-child{color:var(--accent)}.weekly-rate-legend span:last-child{color:#e99532}.weekly-rate-detail{padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-raised);font-size:13px;line-height:1.6}.weekly-rate-note{line-height:1.5}.weekly-calorie-rate [data-weekly-rate-week]{cursor:pointer;outline-color:var(--accent)}';document.head.append(style);
 }
 render(slide);
 if(!bound){bound=true;document.addEventListener('click',event=>{if(event.target.closest('button[data-weight-chart-range]')){selected=null;setTimeout(()=>initializeWeeklyCalorieRateCard(),0);}});['levelup:food-log-updated','levelup:weight-updated','levelup:units-changed','levelup:nutrition-updated','levelup:nutrition-phase-updated'].forEach(name=>window.addEventListener(name,()=>initializeWeeklyCalorieRateCard()));}
}
function render(slide){
 const weights=read('forge_weight_entries',[]);
 const phases=read('level_up_nutrition_phases',[]);
 const phase=[...phases].reverse().find(p=>p?.startDate&&!p.endDate);
 const window=weeklyComparisonWindow({range:localStorage.getItem('level_up_weight_chart_range')||'3m',today:today(),weights,phase});
 const rows=buildWeeklyCalorieRate({weights,foodLog:readFoodLog(),completeDays:read('level_up_food_log_complete_days_v1',{}),...window});
 const values=rows.map(r=>r.calories).filter(Number.isFinite),rates=rows.map(r=>Number.isFinite(r.rate)?displayMass(r.rate,2):null).filter(Number.isFinite);
 const cMin=values.length?Math.max(0,Math.floor((Math.min(...values)-100)/100)*100):0,cMax=values.length?Math.max(cMin+200,Math.ceil((Math.max(...values)+100)/100)*100):3000;
 const rMin=Math.min(-.5,...rates)-.1,rMax=Math.max(.5,...rates)+.1;
 const x=i=>58+i*444/Math.max(1,rows.length-1),yc=v=>40+(cMax-v)/(cMax-cMin)*240,yr=v=>40+(rMax-v)/(rMax-rMin)*240;
 let svg='<svg viewBox="0 0 560 330" role="img" aria-label="Weekly average daily calories and weight-change rate with separate scales"><g font-family="Arial" font-size="13" fill="currentColor">';
 svg+=`<text x="5" y="18">kcal/day</text><text x="555" y="18" text-anchor="end">${massUnit()}/week</text>`;
 for(let i=0;i<4;i++){const y=40+i*80;svg+=`<line x1="58" x2="502" y1="${y}" y2="${y}" stroke="currentColor" opacity=".12"/><text x="51" y="${y+4}" text-anchor="end">${Math.round(cMax-(cMax-cMin)*i/3)}</text><text x="509" y="${y+4}">${(rMax-(rMax-rMin)*i/3).toFixed(1)}</text>`;}
 svg+=`<line x1="58" x2="502" y1="${yr(0)}" y2="${yr(0)}" stroke="currentColor" stroke-dasharray="4 5" opacity=".3"/>`;
 for(const [key,color,dash,y] of [['calories','var(--accent)','',yc],['rate','#e99532','6 5',v=>yr(displayMass(v,2))]]){
  let path='',drawing=false;rows.forEach((r,i)=>{if(!Number.isFinite(r[key])){drawing=false;return;}path+=`${drawing?'L':'M'}${x(i)} ${y(r[key])} `;drawing=true;});
  svg+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${dash}"/>`;
  rows.forEach((r,i)=>{if(Number.isFinite(r[key]))svg+=`<circle cx="${x(i)}" cy="${y(r[key])}" r="${selected===r.startDate?6:4}" fill="${color}" data-weekly-rate-week="${r.startDate}" tabindex="0" role="button" aria-label="Week of ${short(r.startDate)}"><title>Week of ${short(r.startDate)}</title></circle>`;});
 }
 rows.forEach((r,i)=>{if(i===0||i===rows.length-1||i===Math.floor(rows.length/2))svg+=`<text x="${x(i)}" y="309" text-anchor="middle">${short(r.startDate)}</text>`;});svg+='</g></svg>';
 slide.querySelector('[data-weekly-rate-plot]').innerHTML=svg;
 const row=rows.find(r=>r.startDate===selected)||[...rows].reverse().find(r=>r.calories!=null||r.rate!=null)||rows.at(-1);
 const signed=v=>(v>0?'+':'')+v.toFixed(2);
 slide.querySelector('[data-weekly-rate-detail]').innerHTML=`<div class="weekly-rate-detail"><strong>Week of ${short(row.startDate)}${row.partial?' · In progress':''}</strong><br>${row.calories!=null?Math.round(row.calories)+' kcal/day':'More food logs needed'} · ${row.rate!=null?signed(displayMass(row.rate,2))+' '+massUnit()+'/week':'More weigh-ins needed'}<br>${row.foodDays} food-logging days · ${row.weighIns} weigh-ins</div>`;
}
