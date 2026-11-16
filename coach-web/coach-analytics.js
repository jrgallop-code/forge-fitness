/* Connected Coach analytics: actual Level Up readings, same weight trend
 * model and same primary/secondary muscle set credits as athlete app. */
import {calculateTrendWeightSeries,normalizeWeightEntries} from "./js/core/weight-trend.js";
import {getExerciseImpacts} from "./js/workouts/plan-muscle-volume.js";
const h=(tag,parent,props={})=>{const el=document.createElement(tag);for(const [key,value]of Object.entries(props)){if(key==="text")el.textContent=value;else if(key==="className")el.className=value;else el.setAttribute(key,value)}parent?.append(el);return el};
const arr=v=>Array.isArray(v)?v:[];
const num=v=>Number(v).toLocaleString("en-CA",{maximumFractionDigits:1});
const CORE=[
 ["Horizontal push",["barbell-bench-press","dumbbell-bench-press","machine-chest-press","incline-barbell-press","incline-dumbbell-press"]],
 ["Vertical push",["overhead-press","dumbbell-shoulder-press","machine-shoulder-press"]],
 ["Horizontal pull",["barbell-row","chest-supported-row","seated-cable-row","machine-row","single-arm-dumbbell-row"]],
 ["Vertical pull",["lat-pulldown","weighted-pull-up"]],
 ["Knee-dominant lower body",["hack-squat","back-squat","front-squat"]],
 ["Hip-dominant lower body",["romanian-deadlift","deadlift","barbell-hip-thrust"]]
];
function box(host,title,sub){const root=h("section",host,{className:"cf-card"}),head=h("header",root);h("strong",head,{text:title});if(sub)h("small",head,{text:sub});return h("div",root,{className:"cf-body"})}
function text(host,msg){h("p",host,{className:"cf-muted",text:msg})}
function stat(host,label,value,foot=""){const card=h("div",host,{className:"cf-analytics-stat"});h("small",card,{text:label});h("strong",card,{text:value==null?"—":String(value)});if(foot)h("span",card,{text:foot})}
function svgChart(host,values,{baseline=null,unit="",stroke="#226ed9"}={}){
 const points=arr(values).filter(p=>p?.date&&Number.isFinite(+p.value));if(points.length<2){text(host,"Not enough synced readings to draw a trend.");return}
 const width=620,height=210,padL=48,padR=16,padT=18,padB=30;
 const min=Math.min(...points.map(p=>p.value),...(baseline===null?[]:[baseline])),max=Math.max(...points.map(p=>p.value),...(baseline===null?[]:[baseline]));
 const margin=Math.max(1.4,(max-min)*0.12),lo=min-margin,hi=max+margin,span=hi-lo;
 const first=Date.parse(points[0].date+"T12:00:00Z"),last=Date.parse(points.at(-1).date+"T12:00:00Z"),duration=last-first||1;
 const x=p=>padL+(Date.parse(p.date+"T12:00:00Z")-first)/duration*(width-padL-padR);
 const y=p=>padT+(hi-p.value)/span*(height-padT-padB);
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 620 210");svg.setAttribute("role","img");svg.setAttribute("aria-label","Synced progress trend");svg.style.cssText="width:100%;height:auto;display:block";
 const shape=(tag,attrs,t)=>{const e=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(t)e.textContent=t;svg.append(e)};
 for(let i=0;i<4;i++){const yy=padT+(height-padT-padB)*i/3;shape("line",{x1:padL,y1:yy,x2:width-padR,y2:yy,stroke:"#e2e9f1"});shape("text",{x:padL-7,y:yy+4,"text-anchor":"end",fill:"#6a8098","font-size":"11"},(hi-span*i/3).toFixed(1))}
 if(baseline!==null){const yy=y({value:baseline});shape("line",{x1:padL,y1:yy,x2:width-padR,y2:yy,stroke:"#8499b2","stroke-dasharray":"5,4"})}
 shape("path",{d:points.map((p,i)=>(i?"L":"M")+x(p).toFixed(1)+","+y(p).toFixed(1)).join(" "),fill:"none",stroke,"stroke-width":3,"stroke-linejoin":"round"});
 shape("circle",{cx:x(points.at(-1)),cy:y(points.at(-1)),r:5,fill:stroke});
 for(const p of [points[0],points.at(-1)])shape("text",{x:x(p),y:height-7,"text-anchor":p===points[0]?"start":"end",fill:"#627c96","font-size":11},p.date.slice(5));
 host.append(svg);
 h("p",host,{className:"cf-muted",text:"Latest: "+num(points.at(-1).value)+unit+" · First reading: "+points[0].date+" · Last: "+points.at(-1).date});
}
function byExercise(history){
 const grouped=new Map();for(const item of arr(history)){if(!item?.exerciseId||!item?.date||!(Number(item.estimated1rm)>0))continue;if(!grouped.has(item.exerciseId))grouped.set(item.exerciseId,[]);grouped.get(item.exerciseId).push({date:item.date,value:Number(item.estimated1rm)})}
 for(const [id,items]of grouped){const days=new Map();for(const point of items)days.set(point.date,Math.max(days.get(point.date)||0,point.value));grouped.set(id,[...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value})))}
 return grouped
}
function overallStrength(grouped){
 const selected=CORE.map(([name,ids])=>({name,exerciseId:ids.find(id=>(grouped.get(id)||[]).length>=2)})).filter(x=>x.exerciseId);
 if(selected.length<2)return{points:[],lifts:selected.length};
 const baseline=new Map(selected.map(x=>[x.exerciseId,grouped.get(x.exerciseId)[0].value]));
 const dates=new Map();for(const pick of selected)for(const pt of grouped.get(pick.exerciseId)){if(!dates.has(pt.date))dates.set(pt.date,[]);dates.get(pt.date).push({id:pick.exerciseId,value:pt.value})}
 const last=new Map(),points=[];for(const d of [...dates.keys()].sort()){for(const p of dates.get(d))last.set(p.id,p.value);if(last.size>=2){const factors=[...last].map(([id,v])=>v/baseline.get(id)*100);points.push({date:d,value:factors.reduce((a,b)=>a+b,0)/factors.length})}}
 return{points,lifts:selected.length};
}
function strengthChart(host,profile){
 const body=box(host,"Strength Index","Level Up's baseline-relative estimated 1RM; starting at 100");
 const grouped=byExercise(profile?.training?.exerciseHistory);
 const choices=h("div",body,{className:"cf-strength-filter"});
 const label=h("label",choices,{text:"Exercise / index"});
 const select=h("select",choices,{"aria-label":"Choose strength index or exercise"});
 h("option",select,{value:"overall",text:"Overall Strength Index"});
 const options=[...grouped.keys()].sort();for(const id of options)h("option",select,{value:id,text:id.replace(/-/g," ").replace(/\b\w/g,x=>x.toUpperCase())});
 const plot=h("div",body),helper=h("p",body,{className:"cf-muted"});
 const draw=()=>{
  plot.replaceChildren();const id=select.value;
  if(id==="overall"){const outcome=overallStrength(grouped);if(outcome.points.length<2){text(plot,"Overall strength needs at least two movement categories with two recorded sessions each.");helper.textContent=outcome.lifts+" of 6 movement categories available";return}
   svgChart(plot,outcome.points,{baseline:100,unit:" index"});helper.textContent=outcome.lifts+" of 6 represented movement categories · baseline 100 is the first valid performance for each lift";
  }else{const points=grouped.get(id)||[];svgChart(plot,points,{unit:" lb estimated 1RM"});helper.textContent="Best estimated 1RM per recorded day (Epley formula); display is descriptive, not a percentile rank."}
 };
 select.onchange=draw;draw();
}
export function renderCoachExpenditure(host,profile){
 if(!host)return;
 const exp=box(host,"Calculated Expenditure","From Level Up's synced weight and nutrition history");
 const kcal=profile?.expenditure?.calories;
 if(kcal!=null){
  const row=h("div",exp,{className:"cf-analytics-stats"});
  stat(row,"Estimated TDEE",num(kcal)+" kcal/day",profile.expenditure.source==="live"?"Current saved live estimate":"Last saved estimate");
  if(Number.isFinite(profile.expenditure.weightRateLbPerWeek))stat(row,"Weight rate",num(profile.expenditure.weightRateLbPerWeek)+" lb/week");
  if(profile?.backup?.syncedAt)text(exp,"Last Level Up cloud sync: "+new Date(profile.backup.syncedAt).toLocaleString("en-CA"));
 }else text(exp,"No calculated expenditure in this athlete's latest synced Level Up backup.");
}
export function renderCoachWeightTrend(host,profile){
 const weight=box(host,"Weight Trend","App weight smoothing, based on recorded weigh-ins");
 const samples=normalizeWeightEntries(profile?.weight?.history||[]);const trend=calculateTrendWeightSeries(samples);
 svgChart(weight,trend.map(x=>({date:x.date,value:x.weight})),{unit:" lb"});
}
export function renderCoachProgressAnalytics(host,profile){
 if(!host)return;
 strengthChart(host,profile);
}
export function renderCoachOverviewAnalytics(host,profile){
 renderCoachExpenditure(host,profile);
 renderCoachWeightTrend(host,profile);
}
export function injectCoachAnalyticsStyles(){
 if(document.getElementById("cf-analytics-styles"))return;
 const style=h("style",document.head,{id:"cf-analytics-styles"});
 style.textContent="#coach-functional-profile .cf-analytics-stats{display:flex;flex-wrap:wrap;gap:10px}#coach-functional-profile .cf-analytics-stat{background:#eef5ff;padding:13px 16px;border-radius:9px;display:grid;gap:3px;min-width:150px}#coach-functional-profile .cf-analytics-stat small{color:#607d9c}#coach-functional-profile .cf-analytics-stat strong{font-size:19px}#coach-functional-profile .cf-analytics-stat span{font-size:11px;color:#617a94}#coach-functional-profile .cf-strength-filter{margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}#coach-functional-profile .cf-strength-filter label{font-size:12px;font-weight:700}#coach-functional-profile .cf-strength-filter select{min-width:230px;max-width:100%}#coach-functional-profile .cf-muscle-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}#coach-functional-profile .cf-muscle-cell{padding:12px;border-radius:9px;display:grid;gap:4px;min-height:72px;align-content:center}#coach-functional-profile .cf-muscle-cell span{font-size:11px}#coach-functional-profile .cf-heatmap-scroll{overflow-x:auto}#coach-functional-profile .cf-weekly-heatmap{display:grid;align-items:stretch;gap:4px;min-width:710px;margin:12px 0}#coach-functional-profile .cf-weekly-heatmap>strong,#coach-functional-profile .cf-weekly-heatmap>small{font-size:10px;color:#68819d;padding:7px 2px;text-align:center}#coach-functional-profile .cf-muscle-name{font-size:11px;padding:9px 3px;color:#35506e}#coach-functional-profile .cf-weekly-cell{border-radius:5px;min-height:31px;display:grid;place-items:center;font-size:10px;font-weight:750}#coach-functional-profile .cf-heatmap-legend{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-top:12px}#coach-functional-profile .cf-heatmap-legend>span{display:flex;gap:3px;align-items:center;font-size:10px}#coach-functional-profile .cf-heatmap-legend i{display:inline-block;width:11px;height:11px;border-radius:2px}";
}
