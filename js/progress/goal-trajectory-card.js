import { calculateVisibleWeightTrend, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { getGoalTimelineViewModel } from "../dashboard/dashboard-goal-timeline.js?v=goal-timeline-1";

const ID = "level-up-goal-trajectory";
const styleId = ID + "-styles";
const parse = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } };
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
const dateValue = value => new Date(String(value) + "T12:00:00").getTime();
const format = value => finite(value) === null ? "—" : Number(value).toFixed(1);
const rate = value => finite(value) === null ? "Calibrating" : (value > 0 ? "+" : "") + Number(value).toFixed(2) + " lb/wk";
const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function phase() {
    const phases = parse("level_up_nutrition_phases", []);
    return Array.isArray(phases) ? [...phases].reverse().find(item => item?.startDate && !item?.endDate) : null;
}
function model() {
    const goal = getGoalTimelineViewModel();
    const active = phase();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const weights = normalizeWeightEntries(parse("forge_weight_entries", [])).filter(item => item.date <= today);
    const trend = calculateVisibleWeightTrend(weights);
    const startDate = active?.startDate || parse("level_up_current_goal", {})?.startDate || weights[0]?.date;
    const startMs = dateValue(startDate);
    const points = (trend.series || []).filter(item => item.date && finite(item.weight) !== null && dateValue(item.date) >= startMs && dateValue(item.date) <= dateValue(today)).map(item => ({date:item.date, weight:Number(item.weight)}));
    const start = finite(goal.startWeight);
    if (start !== null && startDate && (!points.length || points[0].date !== startDate)) points.unshift({date:startDate,weight:start});
    return {goal,active,points,startDate,startMs};
}
function goalEndMs(data) {
    const key=data.goal.estimatedDate;
    return data.goal.status==="scheduled"&&/^\d{4}-\d{2}-\d{2}$/.test(key||"") ? dateValue(key) : null;
}
function graph(data, range, zoom=1) {
    const {goal,points,startMs}=data;
    const selected=finite(goal.selectedRateLbPerWeek), start=finite(goal.startWeight);
    if(start===null||selected===null||!Number.isFinite(startMs)||!points.length)return '<p class="lugt-empty">Add a starting weight and target rate to see your trajectory.</p>';
    const today=Date.now(), endMs=goalEndMs(data);
    const fullEnd=Math.max(today,endMs||0,startMs+6*604800000);
    // All always includes the actual goal intersection; shorter views remain anchored to today.
    const days=({"1w":7,"1m":30,"3m":90,"6m":180})[range];
    const xMax=days ? Math.max(today,startMs+604800000) : fullEnd;
    const baseMin=days ? Math.max(startMs,today-days*86400000) : startMs;
    const span=Math.max(86400000,xMax-baseMin);
    const xMin=Math.max(startMs,xMax-span/Math.max(1,zoom));
    const targetAt=time=>start+selected*((time-startMs)/604800000);
    const actual=points.filter(point=>{const ms=dateValue(point.date);return ms>=xMin&&ms<=xMax;});
    const values=[...actual.map(point=>point.weight),targetAt(xMin),targetAt(xMax)];
    const targetWeight=finite(goal.goalWeight);
    if(targetWeight!==null)values.push(targetWeight);
    const lo=Math.min(...values)-1,hi=Math.max(...values)+1;
    const x=time=>42+302*(time-xMin)/Math.max(1,xMax-xMin);
    const y=weight=>194-162*(weight-lo)/Math.max(1,hi-lo);
    const path=actual.map((point,i)=>(i?"L":"M")+x(dateValue(point.date)).toFixed(1)+","+y(point.weight).toFixed(1)).join(" ");
    const targetEnd=endMs!==null ? Math.min(xMax,endMs) : xMax;
    const current=finite(goal.currentWeight);
    const historicalEnd=Math.min(xMax,Math.max(xMin,today));
    const target='M'+x(xMin).toFixed(1)+','+y(targetAt(xMin)).toFixed(1)+' L'+x(historicalEnd).toFixed(1)+','+y(targetAt(historicalEnd)).toFixed(1)
        +(current!==null&&endMs!==null&&endMs>today&&xMax>today
          ? ' M'+x(today).toFixed(1)+','+y(current).toFixed(1)+' L'+x(targetEnd).toFixed(1)+','+y(finite(goal.goalWeight)).toFixed(1)
          : '');
    const goalLine=targetWeight!==null?'<line x1="42" x2="344" y1="'+y(targetWeight)+'" y2="'+y(targetWeight)+'" stroke="#51c99c" stroke-width="1.4" stroke-dasharray="5 5"/>':"";
    const endDot=endMs!==null&&endMs>=xMin&&endMs<=xMax?'<circle cx="'+x(endMs)+'" cy="'+y(goal.goalWeight)+'" r="4" fill="#f25265"/><text x="'+Math.min(340,x(endMs))+'" y="'+(y(goal.goalWeight)-10)+'" text-anchor="end" fill="currentColor" font-size="10">Goal</text>':"";
    const ticks=[0,1,2,3].map(i=>{const val=lo+(hi-lo)*i/3;return '<g><line x1="42" x2="344" y1="'+y(val)+'" y2="'+y(val)+'" stroke="currentColor" opacity=".12"/><text x="35" y="'+(y(val)+4)+'" text-anchor="end" fill="currentColor" opacity=".65" font-size="10">'+format(val)+'</text></g>';}).join("");
    const label=ms=>new Date(ms).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
    return '<svg class="lugt-chart" viewBox="0 0 354 220" role="img" aria-label="Trend weight and target trajectory through the projected goal date"><g>'+ticks+goalLine+'<path d="'+target+'" stroke="#f25265" stroke-width="2.4" fill="none"/>'+endDot+(path?'<path d="'+path+'" stroke="var(--accent,#df141e)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" fill="none"/>':"")+'</g><text x="42" y="214" fill="currentColor" opacity=".65" font-size="10">'+label(xMin)+'</text><text x="344" y="214" text-anchor="end" fill="currentColor" opacity=".65" font-size="10">'+label(xMax)+'</text></svg>';
}
function projectedEndDate(data) {
    const goal=data.goal;
    if(goal.status==="reached")return "Goal reached";
    if(goal.status!=="scheduled"||!goal.estimatedDate)return "Not available";
    return new Date(goal.estimatedDate+"T12:00:00").toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
}
function styles() {
    if(document.getElementById(styleId))return;
    const el=document.createElement("style");el.id=styleId;
    el.textContent=`#${ID}{margin:16px 0;padding:18px;border:1px solid var(--card-border,var(--line,#455));border-radius:20px;background:var(--card-bg,var(--surface,#202329));color:var(--text,#f4f5f8)}#${ID} .lugt-head{display:flex;align-items:center;justify-content:space-between;gap:10px}#${ID} h3{font-size:1.2rem;margin:0}#${ID} .lugt-sub,#${ID} .lugt-legend,#${ID} .lugt-empty{opacity:.75;font-size:.82rem}#${ID} .lugt-tabs{display:flex;gap:3px;border:1px solid var(--line,#59606b);border-radius:12px;padding:3px}#${ID} .lugt-tabs button{border:0;background:transparent;color:inherit;padding:7px;border-radius:9px}#${ID} .lugt-tabs button[aria-pressed=true]{background:var(--accent,#405b80);color:white}#${ID} .lugt-chart{width:100%;display:block;overflow:visible;margin:12px 0}#${ID} .lugt-legend{display:flex;flex-wrap:wrap;gap:12px}#${ID} .lugt-legend i{display:inline-block;width:16px;height:3px;vertical-align:middle;margin-right:5px}#${ID} .lugt-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--line,#555)}#${ID} .lugt-metrics small{display:block;opacity:.7}#${ID} .lugt-metrics strong{display:block;font-size:1.05rem;margin-top:5px}#${ID} .lugt-note{font-size:.8rem;opacity:.8;margin-top:12px}#${ID} .lugt-progress{height:7px;background:var(--line,#4a4d57);border-radius:8px;overflow:hidden;margin:14px 0 4px}#${ID} .lugt-progress span{display:block;height:100%;background:#51c99c;border-radius:8px}`;
    el.textContent+=`#weight-progress .weight-graph-dot-pager{display:flex!important;justify-content:center;align-items:center;gap:9px;border:0;background:transparent;padding:12px 0}#weight-progress .weight-graph-dot-pager button{width:9px;height:9px;min-height:9px;padding:0;border-radius:50%;background:var(--line,#cbd5e1);opacity:.65;flex:none}#weight-progress .weight-graph-dot-pager button[aria-pressed="true"]{background:var(--accent,#df141e);opacity:1;box-shadow:0 0 0 2px var(--accent-glow,rgba(223,20,30,.22))}#${ID} .lugt-date{padding-top:12px;margin-top:12px;border-top:1px solid var(--line,#555)}#${ID} .lugt-date small{display:block;opacity:.7}#${ID} .lugt-date strong{display:block;font-size:1.1rem;margin-top:5px}`;
    document.head.append(el);
}
export function renderGoalTrajectory() {
    const section=document.getElementById("weight-progress");if(!section)return;
    styles();
    let card=document.getElementById(ID);
    if(!card){card=document.createElement("section");card.id=ID;const anchor=section.querySelector(".weight-summary");anchor?.insertAdjacentElement("afterend",card);if(!card.isConnected)section.append(card);}
    const previous=localStorage.getItem("level_up_weight_chart_range")||"3m";
    const zoom=Math.max(1,Math.min(16,Number(card.dataset.zoom)||1));
    const data=model(),goal=data.goal;
    if(!goal.configured){card.hidden=true;return;}card.hidden=false;
    const progress=Math.max(0,Math.min(100,finite(goal.percent)||0));
    card.innerHTML='<div class="lugt-head"><div><h3>Goal Progress</h3><div class="lugt-sub">'+safe(goal.phaseLabel)+'</div></div></div><div data-chart>'+graph(data,previous,zoom)+'</div><div class="lugt-legend"><span><i style="background:var(--accent,#df141e)"></i>Trend weight</span><span><i style="background:#f25265"></i>Target trajectory</span><span><i style="background:#51c99c"></i>Goal weight</span></div><div class="lugt-metrics"><div><small>Start</small><strong>'+format(goal.startWeight)+' lb</strong></div><div><small>Current trend</small><strong>'+format(goal.currentWeight)+' lb</strong></div><div><small>Goal</small><strong>'+format(goal.goalWeight)+' lb</strong></div></div><div class="lugt-progress"><span style="width:'+progress+'%"></span></div><div class="lugt-note">'+Math.round(progress)+'% complete</div><div class="lugt-metrics"><div><small>Target rate</small><strong>'+rate(goal.selectedRateLbPerWeek)+'</strong></div><div><small>Actual trend rate</small><strong>'+ (goal.actualRateStatus==="insufficient"?"Calibrating":rate(goal.actualRateLbPerWeek))+'</strong></div><div><small>Difference</small><strong>'+ (finite(goal.actualRateLbPerWeek)!==null&&finite(goal.selectedRateLbPerWeek)!==null?rate(goal.actualRateLbPerWeek-goal.selectedRateLbPerWeek):"—")+'</strong></div></div><div class="lugt-date"><small>Projected goal date</small><strong>'+safe(projectedEndDate(data))+'</strong></div>';
    card.dataset.range=previous;
    card.dataset.zoom=String(zoom);
    mountInCarousel(section,card);
    bindZoom(card);

}

function bindZoom(card) {
    const chart=card.querySelector("[data-chart]");
    if(!chart||chart.dataset.zoomBound==="1")return;
    chart.dataset.zoomBound="1";
    let pinch=null;
    const distance=event=>Math.hypot(event.touches[0].clientX-event.touches[1].clientX,event.touches[0].clientY-event.touches[1].clientY);
    chart.addEventListener("touchstart",event=>{if(event.touches.length===2)pinch={distance:distance(event),zoom:Number(card.dataset.zoom)||1};},{passive:true});
    chart.addEventListener("touchmove",event=>{
        if(!pinch||event.touches.length!==2)return;
        event.preventDefault();
        const next=Math.max(1,Math.min(16,pinch.zoom*distance(event)/Math.max(1,pinch.distance)));
        card.dataset.zoom=String(next);
        chart.innerHTML=graph(model(),card.dataset.range||"3m",next);
    },{passive:false});
    chart.addEventListener("touchend",event=>{if(event.touches.length<2)pinch=null;},{passive:true});
}
function mountInCarousel(section,card) {
    const chart=section.querySelector(".weight-chart-card");
    const track=chart?.querySelector("[data-weight-graph-carousel-track-v2]");
    const pager=chart?.querySelector(".weight-graph-carousel-pager-v2");
    const carbs=track?.querySelector('[data-weight-graph-slide-v2="carbs"]');
    if(!track||!pager||!carbs)return;
    let slide=track.querySelector('[data-weight-graph-slide-v2="goal"]');
    if(!slide){slide=document.createElement("section");slide.className="weight-graph-carousel-slide-v2 is-goal";slide.dataset.weightGraphSlideV2="goal";track.insertBefore(slide,carbs);}
    if(card.parentElement!==slide)slide.appendChild(card);
    let button=pager.querySelector('[data-weight-graph-page-v2="1"]');
    if(!button||button.getAttribute("aria-label")!=="Goal"){
        button=document.createElement("button");button.type="button";button.dataset.weightGraphPageV2="1";button.textContent="Goal";button.setAttribute("aria-pressed","false");pager.insertBefore(button,pager.firstElementChild?.nextSibling||null);
        button.addEventListener("click",()=>track.scrollTo({left:track.clientWidth,behavior:"smooth"}));
    }
    pager.querySelectorAll("button").forEach(item=>{
        if(item===button)return;
        if((item.getAttribute("aria-label")||item.textContent?.trim())==="Weight + Carbs")item.dataset.weightGraphPageV2="2";
        if((item.getAttribute("aria-label")||item.textContent?.trim())==="Weight + Calories")item.dataset.weightGraphPageV2="3";
    });
    const calories=track.querySelector('[data-weight-graph-slide-v2="calories"]');
    if(calories&&calories.previousElementSibling!==carbs)track.append(calories);
    card.style.margin="0";
    pager.classList.add("weight-graph-dot-pager");
    pager.querySelectorAll("button").forEach(item=>{const name=item.getAttribute("aria-label")||item.textContent.trim();item.setAttribute("aria-label",name);item.title=name;item.textContent="";});
}
let pending=false;
function queue(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;renderGoalTrajectory();});}
new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.id==="weight-progress"||node.querySelector?.("#weight-progress")||node.matches?.("[data-weight-graph-carousel-track-v2]")))))queue();}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener("click",event=>{if(event.target.closest?.("#weight-tab"))setTimeout(queue,0);});
window.addEventListener("storage",queue);
document.addEventListener("weight:updated",queue);
document.addEventListener("click",event=>{if(event.target.closest?.("[data-weight-chart-range]")){const card=document.getElementById(ID);if(card)card.dataset.zoom="1";setTimeout(queue,0);}});
["levelup:weight-updated","levelup:nutrition-phase-updated"].forEach(name=>window.addEventListener(name,queue));
queue();
