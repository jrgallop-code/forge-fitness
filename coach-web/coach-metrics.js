/* Level Up Coach metrics presentation: compact Everfit-style overview plus
 * clickable detail charts / calendar / dated entries. No synthetic athlete data. */
import {normalizeWeightEntries,calculateTrendWeightSeries} from "./js/core/weight-trend.js";
const E=(tag,host,attrs={})=>{const node=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==="text")node.textContent=v;else if(k==="className")node.className=v;else node.setAttribute(k,v)}host?.append(node);return node};
const toNum=v=>v===undefined||v===null||v===""?null:Number.isFinite(Number(v))?Number(v):null;
const arr=v=>Array.isArray(v)?v:[];
const fmt=(value,decimals=1)=>Number(value).toLocaleString("en-CA",{maximumFractionDigits:decimals});
const shortDate=s=>new Date(s+"T12:00:00").toLocaleDateString("en-CA",{month:"short",day:"numeric"});
const avg=points=>points.length?points.reduce((total,item)=>total+item.value,0)/points.length:null;
const dayRows=items=>arr(items).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x?.date)&&Number.isFinite(Number(x?.value))).map(x=>({...x,value:Number(x.value)})).sort((a,b)=>a.date.localeCompare(b.date));
const sleepLabel=hours=>{const m=Math.round(hours*60);return Math.floor(m/60)+"h "+String(m%60).padStart(2,"0")+"m"};
const metrics=[
 {id:"weight",title:"Weight",unit:"lb",display:x=>fmt(x)+" lb",tone:"#2875e8",goal:"Trend weight"},
 {id:"sleep",title:"Sleep",unit:"hours",display:sleepLabel,tone:"#4ccab9",goal:"Daily sleep duration"},
 {id:"calories",title:"Calories Consumed",unit:"kcal",display:x=>fmt(x,0)+" kcal",tone:"#f0a149",goal:"Daily logged calories"},
 {id:"steps",title:"Steps",unit:"steps",display:x=>fmt(x,0)+" steps",tone:"#ee7963",goal:"Daily steps versus goal"},
 {id:"expenditure",title:"Expenditure",unit:"kcal",display:x=>fmt(x,0)+" kcal",tone:"#8372cf",goal:"Weekly Level Up estimated expenditure"}
];
function seriesFor(profile,id){
 switch(id){
  case "weight":{const values=normalizeWeightEntries(profile?.weight?.history||[]);return dayRows(calculateTrendWeightSeries(values).map(x=>({date:x.date,value:x.weight,raw:x.observedWeight})))}
  case "sleep":return dayRows(profile?.dailyMetrics?.sleep?.history);
  case "calories":return dayRows(arr(profile?.nutrition?.calorieHistory).map(x=>({date:x.date,value:x.calories})));
  case "steps":return dayRows(profile?.dailyMetrics?.steps?.history);
  case "expenditure":return dayRows(profile?.dailyMetrics?.expenditure?.history);
 }
 return[];
}
function valueToString(metric,val){return val===null?"Not synced":metric.display(val)}
function buildSvg(host,points,metric,{goal=null,projected=false,small=false}={}){
 if(points.length<1)return E("p",host,{className:"cf-muted",text:"No synced data for this metric."});
 const w=small?420:850,h=small?135:330,pad={l:small?6:54,r:small?8:25,t:small?12:28,b:small?8:36};
 const amount=points.map(x=>x.value).filter(Number.isFinite);if(goal!==null)amount.push(goal);
 const low=Math.min(...amount),high=Math.max(...amount),margin=Math.max(metric.id==="weight"?.5:1,(high-low)*.17),min=Math.max(metric.id==="steps"||metric.id==="calories"?0:-Infinity,low-margin),max=high+margin;
 const t0=Date.parse(points[0].date+"T12:00:00Z"),t1=Date.parse(points.at(-1).date+"T12:00:00Z"),span=t1-t0||1,range=max-min||1;
 const px=x=>pad.l+(Date.parse(x.date+"T12:00:00Z")-t0)/span*(w-pad.l-pad.r),py=v=>pad.t+(max-v)/range*(h-pad.t-pad.b);
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox",`0 0 ${w} ${h}`);svg.setAttribute("role","img");svg.setAttribute("aria-label",metric.title+" date chart");svg.style.cssText="display:block;width:100%;height:auto;overflow:visible";
 const add=(tag,attributes,content)=>{const n=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attributes))n.setAttribute(k,String(v));if(content!==undefined)n.textContent=content;svg.append(n);return n};
 if(!small){for(let i=0;i<5;i++){const y=pad.t+i*(h-pad.t-pad.b)/4;add("line",{x1:pad.l,y1:y,x2:w-pad.r,y2:y,stroke:"#e2eaf3","stroke-width":1});add("text",{x:pad.l-8,y:y+4,"text-anchor":"end","font-size":11,fill:"#7990a6"},fmt(max-i*range/4,metric.id==="weight"?1:0))}}
 if(goal!==null){const y=py(goal);add("line",{x1:pad.l,y1:y,x2:w-pad.r,y2:y,stroke:"#d98f32","stroke-dasharray":"5 4","stroke-width":1.5});if(!small)add("text",{x:w-pad.r,y:y-5,"text-anchor":"end","font-size":11,fill:"#b77e2d"},"Goal "+fmt(goal,0))}
 if(projected){
  const predicted=points.filter(x=>toNum(x.projected)!==null);
  if(predicted.length>1)add("path",{d:predicted.map((x,i)=>(i?"L":"M")+px(x)+","+py(x.projected)).join(" "),fill:"none",stroke:"#e09b44","stroke-width":2,"stroke-dasharray":"6 4"});
  if(predicted.length===1){
   const item=predicted[0];
   add("line",{x1:px(item),y1:py(item.value),x2:px(item),y2:py(item.projected),stroke:"#e09b44","stroke-dasharray":"4 3","stroke-width":2});
   add("circle",{cx:px(item),cy:py(item.projected),r:small?3:6,fill:"#e09b44"});
  }
}
 if(metric.id==="steps"||metric.id==="sleep"||metric.id==="calories"){
  const width=Math.max(2,Math.min(small?11:32,(w-pad.l-pad.r)/Math.max(1,points.length)*.7));
  for(const x of points)add("rect",{x:px(x)-width/2,y:py(x.value),width,height:Math.max(1,h-pad.b-py(x.value)),rx:small?1:3,fill:metric.tone,opacity:.88});
 }else add("path",{d:points.map((x,i)=>(i?"L":"M")+px(x)+","+py(x.value)).join(" "),fill:"none",stroke:metric.tone,"stroke-width":small?2.5:3.5,"stroke-linejoin":"round","stroke-linecap":"round"});
 if(!small){const tip=E("div",host,{className:"cf-metric-tooltip"});tip.hidden=true;
  const hit=add("rect",{x:pad.l,y:pad.t,width:w-pad.l-pad.r,height:h-pad.t-pad.b,fill:"transparent"});
  const guide=add("line",{x1:0,x2:0,y1:pad.t,y2:h-pad.b,stroke:metric.tone,"stroke-dasharray":"4 4"});guide.style.display="none";
  hit.addEventListener("pointermove",ev=>{const bounds=svg.getBoundingClientRect();const cx=(ev.clientX-bounds.left)/bounds.width*w;const index=points.reduce((best,x,i)=>Math.abs(px(x)-cx)<Math.abs(px(points[best])-cx)?i:best,0);
   const x=points[index];guide.setAttribute("x1",px(x));guide.setAttribute("x2",px(x));guide.style.display="";tip.hidden=false;tip.textContent=x.date+" · "+metric.display(x.value)+(toNum(x.raw)!==null?" · recorded "+fmt(x.raw)+" lb":"")+(toNum(x.projected)!==null?" · predicted "+fmt(x.projected,0)+" kcal":"");
  });
  hit.addEventListener("pointerleave",()=>{tip.hidden=true;guide.style.display="none"});
  add("text",{x:pad.l,y:h-9,fill:"#70869e","font-size":12},shortDate(points[0].date));
  add("text",{x:w-pad.r,y:h-9,fill:"#70869e","text-anchor":"end","font-size":12},shortDate(points.at(-1).date));
 }
 if(small){
  const hover=E("div",host,{className:"cf-mini-hover"});
  hover.hidden=true;
  svg.addEventListener("pointermove",ev=>{
   const rect=svg.getBoundingClientRect();if(!rect.width)return;
   const pointer=(ev.clientX-rect.left)/rect.width*w;
   const nearest=points.reduce((best,item,i)=>Math.abs(px(item)-pointer)<Math.abs(px(points[best])-pointer)?i:best,0);
   hover.hidden=false;hover.textContent=points[nearest].date+" · "+metric.display(points[nearest].value);
  });
  svg.addEventListener("pointerleave",()=>{hover.hidden=true});
 }
 host.append(svg);
}
function summaryGraph(body,metric,history,{goal,projected}={}){const chart=E("div",body,{className:"cf-mini-graph"});buildSvg(chart,history.slice(-28),metric,{goal,projected,small:true})}
function highlights(host,profile){
 const area=E("section",host,{className:"cf-metric-section"});
 const header=E("header",area);E("h3",header,{text:"Workout Highlights"});E("small",header,{text:"Recorded Level Up training · no demo statistics"});
 const grid=E("div",area,{className:"cf-highlight-grid"});
 const t=profile?.training||{};
 const items=[
  ["Workouts logged",t.completedCount],
  ["This month",arr(t.recentWorkouts).filter(x=>x.date?.slice(0,7)===new Date().toISOString().slice(0,7)).length],
  ["Weight lifted",toNum(t.totalVolumeLb)!==null?fmt(t.totalVolumeLb,0)+" lb":null],
  ["Personal best exercises",t.personalBestExercises],
  ["Training minutes",t.trainingMinutes],
  ["Recorded weighted sets",t.completedWeightedSets]
 ];
 for(const [label,value]of items){const tile=E("div",grid,{className:"cf-highlight-tile"});E("strong",tile,{text:value===null||value===undefined?"—":String(value)});E("span",tile,{text:label})}
}
export function renderCoachMetricOverview(host,profile,onOpen){
 if(!host)return;
 const wrap=E("div",host,{className:"cf-metric-overview"});
 highlights(wrap,profile);
 const card=E("section",wrap,{className:"cf-metric-section"});const head=E("header",card);E("h3",head,{text:"Body Metrics Overview"});E("small",head,{text:"Open any metric for detailed history"});
 const grid=E("div",card,{className:"cf-body-metric-grid"});
 for(const metric of metrics){
  const history=seriesFor(profile,metric.id);
  const tile=E("button",grid,{type:"button",className:"cf-body-metric",title:"Open "+metric.title+" detailed metrics"});
  const top=E("div",tile,{className:"cf-body-metric-title"});E("strong",top,{text:metric.title});E("span",top,{text:"View details ›"});
  const value=history.at(-1)?.value??(metric.id==="expenditure"?toNum(profile?.expenditure?.calories):null);
  E("div",tile,{className:"cf-body-metric-number",text:valueToString(metric,value)});
  if(metric.id==="steps"){
   const goal=toNum(profile?.dailyMetrics?.steps?.goal);
   const latest7=history.slice(-7);E("p",tile,{className:"cf-muted",text:goal?"Goal "+fmt(goal,0)+" · last 7 logged days avg "+(latest7.length?fmt(avg(latest7),0):"—"):"No synced step goal or recorded steps"});
  }else if(metric.id==="sleep"){
   const last7=history.slice(-7),latest=history.at(-1)?.date||null;
   E("p",tile,{className:"cf-muted",text:last7.length?"Last "+last7.length+" logged nights avg "+sleepLabel(avg(last7)):"No synced sleep entries"});
   if(latest){
    const daysOld=Math.round((Date.now()-new Date(latest+"T12:00:00Z").getTime())/86400000);
    E("p",tile,{className:daysOld>14?"cf-metric-stale":"cf-muted",text:"Latest synced sleep: "+latest+(daysOld>14?" · Recent sleep is not present in the cloud backup.":"")});
   }
  }else if(metric.id==="calories"){
   const latest=profile?.nutrition?.latestCalorieDay;
   const complete=profile?.nutrition?.latestCompletedCalorieDay;
   E("p",tile,{className:"cf-muted",text:latest?"Last synced log: "+latest.date+" · "+(latest.entryCount??"?")+" entries"+(latest.complete?" · Day closed":" · Day not marked complete"):"No logged food days synced"});
   if(complete&&complete.date!==latest?.date)E("p",tile,{className:"cf-muted",text:"Last closed day: "+complete.date+" · "+fmt(complete.calories,0)+" kcal"});
   if(latest?.pendingCount)E("p",tile,{className:"cf-metric-stale",text:latest.pendingCount+" pending food entries may not have finalized nutrition values."});
  }else if(metric.id==="expenditure"){E("p",tile,{className:"cf-muted",text:"Weekly predicted / calculated expenditure"})}
  else{
   const rate=toNum(profile?.expenditure?.weightRateLbPerWeek);
   E("p",tile,{className:"cf-muted",text:"Smoothed weight trend"+(rate!==null?" · "+(rate>=0?"+":"")+fmt(rate,2)+" lb/week":"")});
  }
  if(history.length)summaryGraph(tile,metric,history,{goal:metric.id==="steps"?toNum(profile?.dailyMetrics?.steps?.goal):null,projected:metric.id==="expenditure"});
  else E("div",tile,{className:"cf-no-graph",text:"No synced history"});
  tile.onclick=()=>onOpen(metric.id);
 }
}
function calendar(parent,points,metric,focusDate){
 parent.replaceChildren();const byDate=new Map(points.map(x=>[x.date,x]));
 const reference=focusDate||points.at(-1)?.date||new Date().toISOString().slice(0,10);
 const year=+reference.slice(0,4),month=+reference.slice(5,7)-1;
 const start=new Date(Date.UTC(year,month,1));const daysInMonth=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const label=E("div",parent,{className:"cf-metric-calendar-label"});E("strong",label,{text:start.toLocaleString("en-CA",{month:"long",year:"numeric",timeZone:"UTC"})});
 const grid=E("div",parent,{className:"cf-metric-calendar"});for(const d of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"])E("strong",grid,{text:d});
 for(let i=0;i<(start.getUTCDay()+6)%7;i++)E("span",grid,{className:"cf-calendar-blank"});
 for(let d=1;d<=daysInMonth;d++){
  const date=start.toISOString().slice(0,7)+"-"+String(d).padStart(2,"0"),point=byDate.get(date);const cell=E("div",grid,{className:"cf-metric-calendar-day"+(point?" has-value":"")});
  E("small",cell,{text:String(d)});if(point){E("strong",cell,{text:metric.id==="sleep"?sleepLabel(point.value):fmt(point.value,metric.id==="weight"?1:0)});cell.title=date+" · "+metric.display(point.value)}
 }
}
export function renderCoachMetricDetail(host,profile,id,onBack,initialView="graph"){
 if(!host)return;host.replaceChildren();
 const metric=metrics.find(x=>x.id===id);if(!metric)return E("p",host,{text:"Metric unavailable"});
 const state={range:"30",zoom:1,end:0,view:initialView};
 const all=seriesFor(profile,id);
 const wrap=E("section",host,{className:"cf-detail-metric"});
 const header=E("div",wrap,{className:"cf-detail-title"});
 const nav=E("button",header,{type:"button",text:"← All metrics"});nav.onclick=onBack;
 E("h2",header,{text:metric.title+" — Detailed Metrics"});
 const subtitle=E("p",wrap,{className:"cf-muted",text:"Level Up athlete data · read-only · select a chart area to see its recorded value"});
 const controls=E("div",wrap,{className:"cf-detail-controls"});
 const range=E("select",controls,{"aria-label":"Metric date range"});
 for(const [value,label]of [["7","7 days"],["30","30 days"],["90","90 days"],["365","1 year"],["all","All data"]])E("option",range,{value,text:label});
 range.value="30";
 const chartButton=E("button",controls,{type:"button",text:"Graph"});
 const calendarButton=E("button",controls,{type:"button",text:"Calendar"});
 const zoomIn=E("button",controls,{type:"button",text:"Zoom +"}),zoomOut=E("button",controls,{type:"button",text:"Zoom −"}),left=E("button",controls,{type:"button",text:"← Earlier"}),right=E("button",controls,{type:"button",text:"Later →"});
 const graphHost=E("div",wrap,{className:"cf-detail-chart"});const tableHost=E("div",wrap,{className:"cf-detail-entries"});
 function selectedRows(){
  if(!all.length)return[];
  if(state.range==="all")return all;
  const latest=Date.parse(all.at(-1).date+"T12:00:00Z");
  const end=latest-state.end*86400000,windowDays=Math.max(2,Math.round(Number(state.range)/state.zoom)),start=end-(windowDays-1)*86400000;
  return all.filter(x=>{const t=Date.parse(x.date+"T12:00:00Z");return t>=start&&t<=end});
 }
 function refresh(){
  graphHost.replaceChildren();tableHost.replaceChildren();const rows=selectedRows();
  zoomIn.disabled=state.view==="calendar";zoomOut.disabled=state.view==="calendar";
  if(state.view==="calendar"){calendar(graphHost,rows,metric,rows.at(-1)?.date||all.at(-1)?.date)}
  else buildSvg(graphHost,rows,metric,{goal:id==="steps"?toNum(profile?.dailyMetrics?.steps?.goal):null,projected:id==="expenditure"});
  const h=E("div",tableHost,{className:"cf-metric-table-title"});E("h3",h,{text:"All recorded entries"});E("span",h,{className:"cf-muted",text:rows.length+" measurements shown"});
  if(!rows.length)return E("p",tableHost,{className:"cf-muted",text:"No synced entries in this date range. A blank chart does not mean a zero result."});
  const scroll=E("div",tableHost,{className:"cf-metric-table-scroll"}),table=E("table",scroll,{className:"cf-entry-table"}),thead=E("thead",table),tr=E("tr",thead);
  for(const label of ["Date",metric.title+(metric.unit?" ("+metric.unit+")":""),...(id==="weight"?["Recorded weight"]:[]),...(id==="expenditure"?["Predicted expenditure"]:[])])E("th",tr,{text:label});
  const tbody=E("tbody",table);
  for(const row of [...rows].reverse()){
   const r=E("tr",tbody);E("td",r,{text:row.date});E("td",r,{text:metric.display(row.value)});
   if(id==="weight")E("td",r,{text:toNum(row.raw)!==null?fmt(row.raw)+" lb":"—"});
   if(id==="expenditure")E("td",r,{text:toNum(row.projected)!==null?fmt(row.projected,0)+" kcal":"Not supplied"});
  }
 }
 range.onchange=()=>{state.range=range.value;state.zoom=1;state.end=0;refresh()};
 chartButton.onclick=()=>{state.view="graph";refresh()};
 calendarButton.onclick=()=>{state.view="calendar";refresh()};
 zoomIn.onclick=()=>{state.zoom=Math.min(32,state.zoom*2);refresh()};
 zoomOut.onclick=()=>{state.zoom=Math.max(1,state.zoom/2);refresh()};
 left.onclick=()=>{state.end+=Math.max(1,Math.round((state.range==="all"?90:Number(state.range))/state.zoom/2));refresh()};
 right.onclick=()=>{state.end=Math.max(0,state.end-Math.max(1,Math.round((state.range==="all"?90:Number(state.range))/state.zoom/2)));refresh()};
 refresh();
}
export function injectCoachMetricStyles(){
 if(document.getElementById("cf-metric-style"))return;
 const css=E("style",document.head,{id:"cf-metric-style"});
 css.textContent="#coach-functional-profile .cf-metric-overview{grid-column:1/-1;margin-bottom:4px;display:grid;gap:15px}#coach-functional-profile .cf-metric-section{background:#fff;border:1px solid #d7e2ef;border-radius:12px;overflow:hidden}#coach-functional-profile .cf-metric-section>header{padding:15px 17px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e9f2}#coach-functional-profile .cf-metric-section h3{margin:0;font-size:16px}#coach-functional-profile .cf-metric-section>header small{font-size:11px;color:#71879f}#coach-functional-profile .cf-highlight-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:15px}#coach-functional-profile .cf-highlight-tile{background:#f7f9fd;border:1px solid #e2e8f0;border-radius:9px;min-height:74px;padding:13px;display:grid;align-content:center;gap:5px}#coach-functional-profile .cf-highlight-tile strong{font-size:19px}#coach-functional-profile .cf-highlight-tile span{font-size:11px;color:#6e819c}#coach-functional-profile .cf-body-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;padding:15px}#coach-functional-profile button.cf-body-metric{display:block;text-align:left;width:100%;background:#fff;color:#273e58;border:1px solid #dbe4f0;border-radius:9px;padding:14px;min-width:0;cursor:pointer}#coach-functional-profile button.cf-body-metric:hover{border-color:#74a9e8;background:#f8fbff}#coach-functional-profile .cf-metric-stale{background:#fff4e7;border:1px solid #f8d7ab;padding:7px;border-radius:6px;color:#86511d;font-size:11px;margin:5px 0}#coach-functional-profile .cf-body-metric-title{display:flex;justify-content:space-between;gap:9px}#coach-functional-profile .cf-body-metric-title span{font-size:11px;color:#2c72ce}#coach-functional-profile .cf-body-metric-number{font-size:22px;font-weight:750;margin:11px 0 4px}#coach-functional-profile .cf-mini-graph{height:115px;position:relative;overflow:hidden}#coach-functional-profile .cf-mini-graph svg{height:100%!important}#coach-functional-profile .cf-mini-hover{position:absolute;z-index:3;top:5px;left:5px;background:#283950;color:#fff;padding:5px 8px;border-radius:5px;font-size:10px;pointer-events:none}#coach-functional-profile .cf-no-graph{height:90px;display:grid;place-items:center;color:#8b9bb0;font-size:12px}#coach-functional-profile .cf-detail-metric{padding:18px;background:white;border:1px solid #dbe4f0;border-radius:12px}#coach-functional-profile .cf-detail-title,#coach-functional-profile .cf-detail-controls{display:flex;align-items:center;gap:9px;flex-wrap:wrap}#coach-functional-profile .cf-detail-title h2{margin:0;font-size:20px}#coach-functional-profile .cf-detail-controls{margin:18px 0}#coach-functional-profile .cf-detail-controls button,#coach-functional-profile .cf-detail-title button{background:#eaf1fa;color:#285b92}#coach-functional-profile .cf-detail-chart{position:relative;padding:10px 5px;min-height:190px}#coach-functional-profile .cf-metric-tooltip{background:#26374d;color:#fff;font-size:12px;padding:8px;border-radius:7px;margin:8px 0}#coach-functional-profile .cf-metric-table-title{display:flex;justify-content:space-between;align-items:center;margin:20px 0 10px}#coach-functional-profile .cf-metric-table-scroll{max-height:390px;overflow:auto}#coach-functional-profile .cf-entry-table{width:100%;border-collapse:collapse;font-size:12px}#coach-functional-profile .cf-entry-table th,#coach-functional-profile .cf-entry-table td{text-align:left;padding:12px;border-bottom:1px solid #e5ecf4}#coach-functional-profile .cf-entry-table th{background:#f2f6fb;position:sticky;top:0}#coach-functional-profile .cf-metric-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}#coach-functional-profile .cf-metric-calendar>strong{text-align:center;font-size:12px}#coach-functional-profile .cf-metric-calendar-day{background:#edf3fa;border:1px solid #dbe5f0;min-height:65px;border-radius:6px;padding:6px;display:grid;gap:5px}#coach-functional-profile .cf-metric-calendar-day.has-value{background:#e7f3ff}#coach-functional-profile .cf-metric-calendar-day strong{font-size:10px;overflow-wrap:anywhere}#coach-functional-profile .cf-metric-calendar-label{padding:10px 0}@media(max-width:800px){#coach-functional-profile .cf-body-metric-grid{grid-template-columns:1fr}#coach-functional-profile .cf-highlight-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}";
}
