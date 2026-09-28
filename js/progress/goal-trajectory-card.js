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
    const today = new Date().toLocaleDateString("en-CA");
    const weights = normalizeWeightEntries(parse("forge_weight_entries", [])).filter(item => item.date <= today);
    const trend = calculateVisibleWeightTrend(weights);
    const startDate = active?.startDate || parse("level_up_current_goal", {})?.startDate || weights[0]?.date;
    const startMs = dateValue(startDate);
    const points = (trend.series || []).filter(item => item.date && finite(item.weight) !== null && dateValue(item.date) >= startMs && dateValue(item.date) <= dateValue(today)).map(item => ({date:item.date, weight:Number(item.weight)}));
    const start = finite(goal.startWeight);
    if (start !== null && startDate && (!points.length || points[0].date !== startDate)) points.unshift({date:startDate,weight:start});
    return {goal,active,points,startDate,startMs};
}
function graph(data, weeks) {
    const {goal,points,startMs} = data;
    const selected = finite(goal.selectedRateLbPerWeek);
    const start = finite(goal.startWeight);
    if (start === null || selected === null || !Number.isFinite(startMs) || !points.length) return '<p class="lugt-empty">Add a starting weight and target rate to see your trajectory.</p>';
    const cutoff = weeks ? Date.now() - weeks * 7 * 86400000 : startMs;
    const shown = points.filter(point => dateValue(point.date) >= cutoff);
    const actual = shown.length ? shown : points.slice(-1);
    const end = Math.max(Date.now(),dateValue(actual.at(-1).date));
    const projected = Math.max(end, startMs + 6 * 7 * 86400000);
    const xMin = Math.min(startMs, dateValue(actual[0].date));
    const xMax = projected;
    const targetAt = time => start + selected * ((time - startMs) / 604800000);
    const values = [...actual.map(point => point.weight),targetAt(xMin),targetAt(xMax),finite(goal.goalWeight)].filter(value => value !== null);
    const lo = Math.min(...values)-1, hi = Math.max(...values)+1;
    const x = time => 42 + 302*(time-xMin)/Math.max(1,xMax-xMin);
    const y = weight => 194 - 162*(weight-lo)/Math.max(1,hi-lo);
    const path = actual.map((point,i) => (i ? "L" : "M")+x(dateValue(point.date)).toFixed(1)+","+y(point.weight).toFixed(1)).join(" ");
    const target = "M"+x(xMin).toFixed(1)+","+y(targetAt(xMin)).toFixed(1)+" L"+x(xMax).toFixed(1)+","+y(targetAt(xMax)).toFixed(1);
    const goalLine = finite(goal.goalWeight) !== null ? '<line x1="42" x2="344" y1="'+y(goal.goalWeight)+'" y2="'+y(goal.goalWeight)+'" stroke="#51c99c" stroke-width="1.4" stroke-dasharray="5 5"/>' : "";
    const ticks = [0,1,2,3].map(i => {const val=lo+(hi-lo)*i/3;return '<g><line x1="42" x2="344" y1="'+y(val)+'" y2="'+y(val)+'" stroke="currentColor" opacity=".12"/><text x="35" y="'+(y(val)+4)+'" text-anchor="end" fill="currentColor" opacity=".65" font-size="10">'+format(val)+'</text></g>';}).join("");
    return '<svg class="lugt-chart" viewBox="0 0 354 220" role="img" aria-label="Smoothed trend weight compared with the target weight trajectory"><g>'+ticks+goalLine+'<path d="'+target+'" stroke="#f25265" stroke-width="2.4" fill="none"/><path d="'+path+'" stroke="#9c9bd7" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" fill="none"/></g><text x="42" y="214" fill="currentColor" opacity=".65" font-size="10">'+safe(actual[0].date)+'</text><text x="344" y="214" text-anchor="end" fill="currentColor" opacity=".65" font-size="10">'+new Date(xMax).toLocaleDateString(undefined,{month:"short",day:"numeric"})+'</text></svg>';
}
function styles() {
    if(document.getElementById(styleId))return;
    const el=document.createElement("style");el.id=styleId;
    el.textContent=`#${ID}{margin:16px 0;padding:18px;border:1px solid var(--card-border,var(--line,#455));border-radius:20px;background:var(--card-bg,var(--surface,#202329));color:var(--text,#f4f5f8)}#${ID} .lugt-head{display:flex;align-items:center;justify-content:space-between;gap:10px}#${ID} h3{font-size:1.2rem;margin:0}#${ID} .lugt-sub,#${ID} .lugt-legend,#${ID} .lugt-empty{opacity:.75;font-size:.82rem}#${ID} .lugt-tabs{display:flex;gap:3px;border:1px solid var(--line,#59606b);border-radius:12px;padding:3px}#${ID} .lugt-tabs button{border:0;background:transparent;color:inherit;padding:7px;border-radius:9px}#${ID} .lugt-tabs button[aria-pressed=true]{background:var(--accent,#405b80);color:white}#${ID} .lugt-chart{width:100%;display:block;overflow:visible;margin:12px 0}#${ID} .lugt-legend{display:flex;flex-wrap:wrap;gap:12px}#${ID} .lugt-legend i{display:inline-block;width:16px;height:3px;vertical-align:middle;margin-right:5px}#${ID} .lugt-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--line,#555)}#${ID} .lugt-metrics small{display:block;opacity:.7}#${ID} .lugt-metrics strong{display:block;font-size:1.05rem;margin-top:5px}#${ID} .lugt-note{font-size:.8rem;opacity:.8;margin-top:12px}#${ID} .lugt-progress{height:7px;background:var(--line,#4a4d57);border-radius:8px;overflow:hidden;margin:14px 0 4px}#${ID} .lugt-progress span{display:block;height:100%;background:#51c99c;border-radius:8px}`;
    document.head.append(el);
}
export function renderGoalTrajectory() {
    const section=document.getElementById("weight-progress");if(!section)return;
    styles();
    let card=document.getElementById(ID);
    if(!card){card=document.createElement("section");card.id=ID;const anchor=section.querySelector(".weight-summary");anchor?.insertAdjacentElement("afterend",card);if(!card.isConnected)section.append(card);}
    const previous=card.dataset.range||"12";
    const data=model(),goal=data.goal;
    if(!goal.configured){card.hidden=true;return;}card.hidden=false;
    const progress=Math.max(0,Math.min(100,finite(goal.percent)||0));
    card.innerHTML='<div class="lugt-head"><div><h3>Goal Progress</h3><div class="lugt-sub">'+safe(goal.phaseLabel)+'</div></div><div class="lugt-tabs" aria-label="Graph time range">'+[["4","4W"],["12","12W"],["0","All"]].map(([v,label])=>'<button type="button" data-range="'+v+'" aria-pressed="'+(v===previous)+'">'+label+'</button>').join("")+'</div></div><div data-chart>'+graph(data,Number(previous))+'</div><div class="lugt-legend"><span><i style="background:#9c9bd7"></i>Trend weight</span><span><i style="background:#f25265"></i>Target trajectory</span><span><i style="background:#51c99c"></i>Goal weight</span></div><div class="lugt-metrics"><div><small>Start</small><strong>'+format(goal.startWeight)+' lb</strong></div><div><small>Current trend</small><strong>'+format(goal.currentWeight)+' lb</strong></div><div><small>Goal</small><strong>'+format(goal.goalWeight)+' lb</strong></div></div><div class="lugt-progress"><span style="width:'+progress+'%"></span></div><div class="lugt-note">'+Math.round(progress)+'% complete</div><div class="lugt-metrics"><div><small>Target rate</small><strong>'+rate(goal.selectedRateLbPerWeek)+'</strong></div><div><small>Actual trend rate</small><strong>'+ (goal.actualRateStatus==="insufficient"?"Calibrating":rate(goal.actualRateLbPerWeek))+'</strong></div><div><small>Difference</small><strong>'+ (finite(goal.actualRateLbPerWeek)!==null&&finite(goal.selectedRateLbPerWeek)!==null?rate(goal.actualRateLbPerWeek-goal.selectedRateLbPerWeek):"—")+'</strong></div></div><p class="lugt-note">The zigzag line is smoothed trend weight, not individual weigh-ins. The straight line is your selected weekly target. Future target values are plans, not predictions.</p>';
    card.dataset.range=previous;
    card.querySelectorAll("[data-range]").forEach(button=>button.addEventListener("click",()=>{card.dataset.range=button.dataset.range;renderGoalTrajectory();}));
}
let pending=false;
function queue(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;renderGoalTrajectory();});}
new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.id==="weight-progress"||node.querySelector?.("#weight-progress")))))queue();}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener("click",event=>{if(event.target.closest?.("#weight-tab"))setTimeout(queue,0);});
window.addEventListener("storage",queue);
document.addEventListener("weight:updated",queue);
queue();
