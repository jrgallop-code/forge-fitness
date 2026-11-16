/* Exact Level Up athlete weight chart renderer + weight-trend computation.
 * Coach supplies only the selected, permission-scoped athlete history.
 * No athlete entries or localStorage keys are written.
 */
import {drawSharedWeightTrendChart} from "./js/progress/weight-trend-chart.js";
import {normalizeWeightEntries,calculateTrendWeightSeries,calculateVisibleWeightTrend,calculateRegressionWeeklyChange} from "./js/core/weight-trend.js";

const ranges=[["1w","1W",7],["1m","1M",30],["3m","3M",90],["6m","6M",180],["1y","1Y",365],["all","ALL",null]];
const units=[["7","7 days"],["14","14 days"],["21","21 days"],["30","30 days"],["60","60 days"],["90","90 days"]];
const day=86400000,localDate=s=>new Date(s+"T12:00:00Z").getTime();
const date=t=>new Date(t).toISOString().slice(0,10);
const fmt=(n,d=2)=>Number(n).toLocaleString("en-CA",{maximumFractionDigits:d});
const E=(tag,host,attrs={})=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==="text")n.textContent=v;else if(k==="className")n.className=v;else n.setAttribute(k,v)}host?.append(n);return n};
const field=(host,label,options)=>{const wrap=E("label",host,{className:"cw-field"});E("span",wrap,{text:label});const select=E("select",wrap);for(const [key,name]of options)E("option",select,{value:key,text:name});return select};
export function renderCoachSharedWeightProgress(host,profile){
 host.replaceChildren();
 const entries=normalizeWeightEntries(profile?.weight?.history||[]);
 const card=E("section",host,{className:"cw-shared-progress"});
 E("p",card,{className:"cw-source",text:"Shared Level Up weight trend engine · recorded and smoothed values · athlete history remains read-only"});
 if(entries.length<2){E("p",card,{className:"cw-empty",text:"At least two synced weigh-ins are needed to display weight-change trends."});return}
 const controls=E("div",card,{className:"cw-controls"});
 const period=field(controls,"Chart timeframe",ranges.map(([id,label])=>[id,label]));period.value="3m";
 const rateInterval=field(controls,"Weight change over",units);
 rateInterval.value="21";
 const rateUnit=field(controls,"Display rate as",[["day","Per day"],["week","Per week"],["month","Per month"]]);rateUnit.value="week";
 const zoomGroup=E("div",controls,{className:"cw-zoom"});
 const back=E("button",zoomGroup,{type:"button",text:"← Earlier"});
 const zoomIn=E("button",zoomGroup,{type:"button",text:"Zoom +"});
 const zoomOut=E("button",zoomGroup,{type:"button",text:"Zoom −"});
 const forward=E("button",zoomGroup,{type:"button",text:"Later →"});
 const pills=E("div",card,{className:"cw-summary"});
 const chart=E("div",card,{className:"cw-chart"});
 const canvas=E("canvas",chart,{"aria-label":"Level Up weight trend line chart"});
 const hover=E("div",card,{className:"cw-hover",role:"status"});hover.textContent="Move across the graph to inspect date and weight.";
 const tableWrap=E("div",card,{className:"cw-table-wrap"});
 let shift=0,scale=1;
 const latest=entries.at(-1).date;
 const pointAt=(x,points)=>points.reduce((best,p)=>Math.abs(p.t-x)<Math.abs(best.t-x)?p:best,points[0]);
 function draw(){
  const total=ranges.find(x=>x[0]===period.value)?.[2]||null;
  const displayed=Math.max(2,Math.round((total||Math.max(2,(localDate(latest)-localDate(entries[0].date))/day+1))/scale));
  const end=localDate(latest)-shift*day,start=end-(displayed-1)*day;
  const selected=entries.filter(x=>localDate(x.date)>=start&&localDate(x.date)<=end);
  const trend=calculateTrendWeightSeries(entries.filter(x=>localDate(x.date)<=end)).filter(x=>localDate(x.date)>=start);
  const rateDays=Number(rateInterval.value);
  const computed=calculateVisibleWeightTrend(entries,{endDate:date(end),rateDays});
  const rateRaw=entries.filter(x=>localDate(x.date)<=end&&localDate(x.date)>=end-(rateDays-1)*day);
  const intervalSeries=calculateTrendWeightSeries(rateRaw);
  const intervalWeeklyRate=rateDays===21?computed.weeklyChange:calculateRegressionWeeklyChange(intervalSeries);
  const factor=rateUnit.value==="day"?1/7:rateUnit.value==="month"?30.44/7:1;
  const suffix=rateUnit.value==="day"?"lb/day":rateUnit.value==="month"?"lb/month":"lb/week";
  const current=selected.at(-1);
  pills.replaceChildren();
  function pill(name,value){const el=E("div",pills,{className:"cw-stat"});E("small",el,{text:name});E("strong",el,{text:value})}
  pill("Latest recorded",current?fmt(current.weight,1)+" lb":"Unavailable");
  pill("Trend weight",trend.length?fmt(trend.at(-1).weight,1)+" lb":"Unavailable");
  const rate=Number.isFinite(intervalWeeklyRate)?intervalWeeklyRate*factor:null;
  pill(rateDays+"-day trend rate",rate===null?"Insufficient data":(rate>=0?"+":"")+fmt(rate)+" "+suffix);
  pill("Change during selected window",selected.length>=2?(selected.at(-1).weight>=selected[0].weight?"+":"")+fmt(selected.at(-1).weight-selected[0].weight,1)+" lb":"Insufficient data");
  drawSharedWeightTrendChart(canvas,{entries:selected,trendSeries:trend,goalWeight:null,startDate:date(start),endDate:date(end),label:period.value.toUpperCase()});
  const points=trend.map(x=>({t:localDate(x.date),date:x.date,value:x.weight,raw:x.observedWeight}));
  chart.onpointermove=event=>{
   if(!points.length)return;
   const rect=canvas.getBoundingClientRect();
   if(!rect.width)return;
   const fraction=Math.max(0,Math.min(1,(event.clientX-rect.left-50)/(rect.width-68)));
   const p=pointAt(start+fraction*(end-start),points);
   hover.textContent=p.date+" · Trend "+fmt(p.value,1)+" lb · Observed "+fmt(p.raw,1)+" lb";
  };
  chart.onpointerleave=()=>{hover.textContent="Move across the graph to inspect date and weight."};
  tableWrap.replaceChildren();
  const count=E("p",tableWrap,{className:"cw-source",text:selected.length+" recorded weigh-ins · "+date(start)+" – "+date(end)});
  if(!selected.length)return;
  const table=E("table",tableWrap,{className:"cw-table"}),head=E("thead",table),h=E("tr",head);
  for(const name of ["Date","Recorded weight (lb)","Smoothed trend (lb)"])E("th",h,{text:name});
  const tbody=E("tbody",table),byDate=new Map(trend.map(p=>[p.date,p.weight]));
  for(const p of [...selected].reverse()){
   const row=E("tr",tbody);E("td",row,{text:p.date});
   E("td",row,{text:fmt(p.weight,1)});
   E("td",row,{text:byDate.has(p.date)?fmt(byDate.get(p.date),1):"—"});
  }
 }
 period.onchange=()=>{shift=0;scale=1;draw()};
 rateInterval.onchange=draw;
 rateUnit.onchange=draw;
 zoomIn.onclick=()=>{scale=Math.min(32,scale*2);draw()};
 zoomOut.onclick=()=>{scale=Math.max(1,scale/2);draw()};
 back.onclick=()=>{shift+=Math.max(1,Math.floor((ranges.find(x=>x[0]===period.value)?.[2]||90)/scale/2));draw()};
 forward.onclick=()=>{shift=Math.max(0,shift-Math.max(1,Math.floor((ranges.find(x=>x[0]===period.value)?.[2]||90)/scale/2)));draw()};
 draw();
}
export function injectCoachSharedWeightStyles(){
 if(document.getElementById("cw-shared-weight-style"))return;
 const css=E("style",document.head,{id:"cw-shared-weight-style"});
 css.textContent="#coach-functional-profile .cw-shared-progress{background:white;border:1px solid #e3eaf4;border-radius:17px;padding:18px}#coach-functional-profile .cw-source{font-size:12px;color:#71839b}#coach-functional-profile .cw-controls{display:flex;align-items:end;gap:11px;flex-wrap:wrap;margin:15px 0}#coach-functional-profile .cw-field{display:grid;gap:5px;font-size:12px;font-weight:650}#coach-functional-profile .cw-field select{min-width:110px;border-radius:12px}#coach-functional-profile .cw-zoom{display:flex;gap:7px;flex-wrap:wrap}#coach-functional-profile .cw-zoom button{background:#eaf1ff;color:#26569b;border:1px solid #d5e3f7;border-radius:12px;padding:9px 12px}#coach-functional-profile .cw-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}#coach-functional-profile .cw-stat{padding:13px;background:#f5f8fe;border:1px solid #e7eef8;border-radius:12px;display:grid;gap:6px}#coach-functional-profile .cw-stat small{font-size:11px;color:#6d829d}#coach-functional-profile .cw-stat strong{font-size:18px}#coach-functional-profile .cw-chart{position:relative;margin-top:16px;min-width:0}#coach-functional-profile .cw-chart canvas{width:100%!important;display:block}#coach-functional-profile .cw-hover{font-size:12px;color:#2a5c9b;margin:10px 0}#coach-functional-profile .cw-table-wrap{max-height:420px;overflow:auto;margin-top:20px}#coach-functional-profile .cw-table{width:100%;border-collapse:collapse;font-size:12px}#coach-functional-profile .cw-table th,#coach-functional-profile .cw-table td{padding:12px;border-bottom:1px solid #e3eaf4;text-align:left}#coach-functional-profile .cw-table th{position:sticky;top:0;background:#f4f7fc}@media(max-width:650px){#coach-functional-profile .cw-zoom button{padding:8px}#coach-functional-profile .cw-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}";
}
