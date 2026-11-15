import { getCachedAppleHealth, refreshAppleHealth } from "../health/apple-health.js?v=steps-progress-y-axis-1";

const WINDOWS = Object.freeze({ "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 });
const STYLE_ID = "levelup-progress-steps-carousel-styles";
let activeRange="1W";
function fmt(value){return Math.round(value).toLocaleString();}
function daysInWindow(days){
 const now=new Date();now.setHours(12,0,0,0);
 return Array.from({length:days},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-days+i+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");});
}
export function stepsChartModel(data,range="1W",dates=daysInWindow(WINDOWS[range]||7)){
 const lookup=new Map((data?.steps||[]).filter(r=>typeof r?.date==="string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.steps!==null && r.steps!==undefined && Number.isFinite(Number(r.steps)) && Number(r.steps)>=0).map(r=>[r.date,Number(r.steps)]));
 const rows=dates.map(date=>({date,value:lookup.has(date)?lookup.get(date):null}));
 const valid=rows.filter(r=>r.value!==null);
 const total=valid.reduce((sum,r)=>sum+r.value,0);
 const period=WINDOWS[range]||7;
 const chunk=period<=30?1:period<=90?7:period<=180?14:30;
 const buckets=[];
 for(let i=0;i<rows.length;i+=chunk){
  const group=rows.slice(i,i+chunk),observed=group.filter(r=>r.value!==null);
  buckets.push({date:group.at(-1).date,value:observed.length?observed.reduce((s,r)=>s+r.value,0)/observed.length:null,days:observed.length});
 }
 return {rows,buckets,total,average:valid.length?Math.round(total/valid.length):null,recorded:valid.length,period};
}
function maxTick(value){
 if(!value)return 1000;
 const step=Math.max(500,Math.pow(10,Math.floor(Math.log10(value)))/2);
 return Math.max(1000,Math.ceil(value/(step*4))*step*4);
}
function tick(value){return value>=1000?(value/1000).toLocaleString(undefined,{maximumFractionDigits:1})+"k":fmt(value);}
function draw(model){
 const W=360,H=240,L=47,R=9,T=17,B=34,w=W-L-R,h=H-T-B;
 const max=maxTick(Math.max(0,...model.buckets.map(b=>b.value||0)));
 let svg='<svg class="lu-sp-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Step chart with labeled Y axis from zero to '+fmt(max)+' steps">';
 svg+='<text x="4" y="10" class="lu-sp-axis">Steps</text>';
 for(let i=0;i<=4;i++){
  const y=T+h*(1-i/4),value=max*i/4;
  svg+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" class="lu-sp-grid"/><text x="'+(L-7)+'" y="'+(y+3)+'" text-anchor="end" class="lu-sp-axis">'+tick(value)+'</text>';
 }
 const space=w/model.buckets.length,bw=Math.min(29,Math.max(2,space*.64)),every=Math.max(1,Math.ceil(model.buckets.length/5));
 model.buckets.forEach((b,i)=>{
  const x=L+(i+.5)*space;
  if(b.value!==null){
   const barHeight=Math.max(1,h*b.value/max),y=T+h-barHeight;
   svg+='<rect class="lu-sp-bar" x="'+(x-bw/2)+'" y="'+y+'" width="'+bw+'" height="'+barHeight+'" rx="3"><title>'+b.date+': '+fmt(b.value)+' steps/day average, '+b.days+' recorded day(s)</title></rect>';
  }
  if(i===0||i===model.buckets.length-1||i%every===0){
   const d=new Date(b.date+"T12:00:00");
   const label=d.toLocaleDateString(undefined,{month:"short",...(model.period<=30?{day:"numeric"}:{})});
   svg+='<text x="'+x+'" y="'+(H-8)+'" text-anchor="middle" class="lu-sp-axis">'+label+'</text>';
  }
 });
 return svg+'</svg>';
}
function markup(){
 return '<div class="lu-sp-title"><span class="weight-chart-kicker">APPLE HEALTH ACTIVITY</span><h3>Steps</h3><p>Daily movement over time</p></div>'+
  '<div class="lu-sp-summary"><div><small>Average steps/day</small><strong data-lu-sp-average>—</strong></div><div><small>Total steps</small><strong data-lu-sp-total>—</strong><small data-lu-sp-recorded>— recorded days</small></div></div>'+
  '<div class="lu-sp-ranges" role="group" aria-label="Step chart range">'+Object.keys(WINDOWS).map(x=>'<button type="button" data-lu-sp-range="'+x+'" aria-pressed="'+(activeRange===x)+'">'+x+'</button>').join("")+'</div>'+
  '<div class="lu-sp-chart" data-lu-sp-chart>Loading Apple Health steps…</div>'+
  '<p class="lu-sp-note" data-lu-sp-note>Missing HealthKit records are excluded from averages, not counted as zero.</p>'+
  '<button type="button" class="secondary-btn" data-lu-sp-refresh>Refresh Apple Health steps</button>';
}
const STEP_PANEL_SELECTOR="#steps-progress [data-levelup-steps-detail]";
let attached=false;
export function initializeStepsProgress(root=document){
 const host=root.querySelector?.(STEP_PANEL_SELECTOR) || document.querySelector(STEP_PANEL_SELECTOR);
 if(!host)return false;
 if(!host.dataset.stepsInitialized){
  host.dataset.stepsInitialized="true";
  host.innerHTML=markup();
  host.addEventListener("click",event=>{
   const range=event.target.closest("[data-lu-sp-range]");
   if(range){
    activeRange=range.dataset.luSpRange;
    host.querySelectorAll("[data-lu-sp-range]").forEach(el=>el.setAttribute("aria-pressed",String(el.dataset.luSpRange===activeRange)));
    updateStepsProgress();
   }
   if(event.target.closest("[data-lu-sp-refresh]")){
    void refreshAppleHealth(true).then(()=>updateStepsProgress()).catch(()=>{
     const chart=host.querySelector("[data-lu-sp-chart]");
     if(chart)chart.textContent="Unable to read steps from Apple Health.";
    });
   }
  });
 }
 ensureStyles();
 if(!attached && typeof window!=="undefined"){
  attached=true;
  window.addEventListener("levelup:apple-health-refreshed",updateStepsProgress);
  window.addEventListener("levelup:steps-progress-opened",updateStepsProgress);
 }
 updateStepsProgress();
 return true;
}
export function updateStepsProgress(){
 const host=document.querySelector(STEP_PANEL_SELECTOR);
 if(!host)return;
 const data=getCachedAppleHealth();
 if(!data){
  void refreshAppleHealth().then(()=>updateStepsProgress()).catch(()=>{
   const chart=host.querySelector("[data-lu-sp-chart]");
   if(chart)chart.textContent="Unable to read steps from Apple Health.";
  });
  return;
 }
 const model=stepsChartModel(data,activeRange);
 const avg=host.querySelector("[data-lu-sp-average]"),total=host.querySelector("[data-lu-sp-total]"),recorded=host.querySelector("[data-lu-sp-recorded]"),chart=host.querySelector("[data-lu-sp-chart]"),note=host.querySelector("[data-lu-sp-note]");
 if(avg)avg.textContent=model.average===null?"—":fmt(model.average);
 if(total)total.textContent=model.recorded?fmt(model.total):"—";
 if(recorded)recorded.textContent=model.recorded+" of "+model.period+" days recorded";
 if(chart)chart.innerHTML=draw(model);
 if(note)note.textContent=model.recorded?(model.period<=30?"Bars show daily totals. ":"Bars show average daily steps per group. ")+"Missing days are not counted as zero.":"No Apple Health step records in this range. Check Health → Steps → Show All Data.";
}
export function openStepsInProgress(){
  // Ask the router to render Steps active in the first Progress frame.
  // Never paint Weight/Lifting while waiting for an asynchronous tab click.
  window.__levelUpProgressInitialTab = "steps";
  try {
    document.dispatchEvent(new CustomEvent("levelup:navigate", {
      detail: { page: "progress" }
    }));
  } finally {
    delete window.__levelUpProgressInitialTab;
  }
  // The Progress router and weight-tracker controller select the destination
  // during navigation, without any delayed or synthetic tab clicks.
  const stepsTab = document.getElementById("steps-progress-tab");
  const stepsPanel = document.getElementById("steps-progress");
  if (!stepsTab?.classList.contains("active") || stepsPanel?.hidden) {
    console.error("Steps deep link did not activate its Progress tab.");
  }
  initializeStepsProgress();
  window.dispatchEvent(new Event("levelup:steps-progress-opened"));
}
function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement("style");style.id=STYLE_ID;
 style.textContent=[
 '#steps-progress .is-steps{min-width:0;padding:0 2px 10px}',
 '#steps-progress .lu-sp-title h3{font-size:20px;margin:4px 0;color:var(--heading,var(--text))}',
 '#steps-progress .lu-sp-title p{font-size:12px;color:var(--muted);margin:3px 0 13px}',
 '#steps-progress .lu-sp-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:13px 0}',
 '#steps-progress .lu-sp-summary>div{min-width:0;display:flex;flex-direction:column;gap:6px;border:1px solid var(--line);border-radius:12px;background:var(--card);padding:12px}',
 '#steps-progress .lu-sp-summary small{color:var(--muted);font-size:10px}',
 '#steps-progress .lu-sp-summary strong{font-size:23px;line-height:1.2;color:var(--heading,var(--text))}',
 '#steps-progress .lu-sp-ranges{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin:14px 0}',
 '#steps-progress .lu-sp-ranges button{font-size:11px;font-weight:800;padding:9px 0;border:1px solid var(--line);border-radius:9px;color:var(--text);background:var(--card);min-width:0}',
 '#steps-progress .lu-sp-ranges button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:white}',
 '#steps-progress .lu-sp-svg{display:block;width:100%;max-height:260px}',
 '#steps-progress .lu-sp-axis{font:10px system-ui,sans-serif;fill:var(--muted)}',
 '#steps-progress .lu-sp-grid{stroke:var(--line);stroke-width:.8}',
 '#steps-progress .lu-sp-bar{fill:var(--accent)}',
 '#steps-progress .lu-sp-note{font-size:11px;line-height:1.4;color:var(--muted)}',
 ].join("\n");document.head.append(style);
}
