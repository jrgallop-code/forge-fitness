
/* iOS HealthKit is the read-only authority for steps and sleep. No imported
 * health data is written to localStorage or the automatic cloud backup. */
const plugin = () => window.Capacitor?.Plugins?.LevelUpHealthKit || null;
const number = value => Number(value || 0).toLocaleString();
const day = date => new Date(date + "T12:00:00").toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric"});
let latest = null;
let pending = null;
let lastRead = 0;
export function getCachedAppleHealth() { return latest; }
const REFRESH_MS = 90 * 1000;

export async function connectAppleHealth() {
    if (!plugin()) return {available:false, message:"Apple Health is available only in Level Up for iPhone."};
    try {
        const available = await plugin().availability();
        if (!available?.available) return {available:false, message:"Apple Health is unavailable on this device."};
        await plugin().connect();
        const result = await refreshAppleHealth(true);
        return {available:true, message:result.sleep.length || result.steps.some(x=>x.steps !== null) ?
            "Apple Health connected. Activity is ready." :
            "Apple Health was opened. Enable Steps and Sleep read access in Health settings if no data appears."};
    } catch (error) {
        return {available:false, message:error?.message || "Could not connect to Apple Health."};
    }
}
export async function refreshAppleHealth(force=false) {
    if (!plugin()) return {steps:[], sleep:[], unavailable:true};
    if (!force && latest && Date.now()-lastRead < REFRESH_MS) return latest;
    if (pending) return pending;
    pending = plugin().readActivity({days:365}).then(result => {
        latest = {steps:Array.isArray(result.steps)?result.steps:[], sleep:Array.isArray(result.sleep)?result.sleep:[],readAt:result.readAt};
        lastRead=Date.now();
        window.dispatchEvent(new CustomEvent("levelup:apple-health-refreshed"));
        return latest;
    }).finally(()=>{pending=null});
    return pending;
}
function metric(label,value){return `<div class="lu-health-metric"><small>${label}</small><strong>${value}</strong></div>`;}
function barChart(rows,key,scale=1){
    const max=Math.max(1,...rows.map(row=>Number(row[key]) || 0));
    return `<div class="lu-health-bars" role="img" aria-label="Daily ${key} chart">${rows.map(row=>`
       <div class="lu-health-bar"><span>${row[key] == null ? "—" : key==="steps" ? number(row[key]) : Number(row[key]).toFixed(1)+"h"}</span>
       <i style="height:${Math.max(2,Math.round(100*(Number(row[key])||0)/max))}%"></i>
       <small>${new Date(row.date+"T12:00:00").toLocaleDateString(undefined,{weekday:"short"})}</small></div>`).join("")}</div>`;
}
export function renderAppleSleepTracker() {
    return `<div class="lu-health-view" data-apple-sleep>
        <h3>Sleep & Recovery</h3><p>Read-only sleep history from Apple Health. Sync your watch or sleep tracker to Apple Health first.</p>
        <div data-apple-sleep-body><p>Loading Apple Health sleep data…</p></div>
        <button class="secondary-btn" type="button" data-apple-health-connect>Connect / Manage Apple Health</button>
        <button class="secondary-btn" type="button" data-apple-health-refresh>Refresh sleep</button>
        <p class="lu-health-note">No manual entry. Existing manual sleep history is retained privately but is no longer displayed or edited here.</p>
    </div>`;
}
export function initializeAppleSleepTracker(){
    void refreshAppleHealth().then(renderSleep).catch(error=>setSleepStatus(error.message));
}
function setSleepStatus(message){const e=document.querySelector("[data-apple-sleep-body]");if(e)e.textContent=message;}
function renderSleep(data){
    const root=document.querySelector("[data-apple-sleep-body]");if(!root)return;
    if(data.unavailable){root.innerHTML='<p>Apple Health sleep is available in the iOS app only. Open Level Up on your iPhone to connect.</p>';return;}
    const rows=data.sleep.slice(-7);
    if(!rows.length){root.innerHTML='<p>No Apple Health sleep data is available yet. Check the Health app’s Sleep records and read permission.</p>';return;}
    const sum=rows.reduce((v,r)=>v+Number(r.hours||0),0);
    root.innerHTML=`<div class="lu-health-metrics">${metric("Latest sleep",rows.at(-1).hours.toFixed(1)+"h")}${metric("7-night average",(sum/rows.length).toFixed(1)+"h")}</div>${barChart(rows,"hours")}
      <div class="lu-health-history">${rows.slice().reverse().map(r=>`<div><span>${day(r.date)}</span><strong>${Number(r.hours).toFixed(1)} h</strong></div>`).join("")}</div>`;
}
function renderDashboard(data){
    const content=document.getElementById("content");
    if(!content?.querySelector(".dashboard-welcome"))return;
    const host=content.querySelector(".dashboard");
    if(!host || !host.querySelector(".metric-card"))return;
    let card=host.querySelector("[data-levelup-steps-card]");
    if(!card){
        card=document.createElement("article");card.className="metric-card lu-health-steps";card.dataset.levelupStepsCard="1";
        card.innerHTML='<button type="button" data-apple-health-open-steps><span>👟 Steps · Last 7 Days</span><strong data-apple-step-average>—</strong><small data-apple-step-total>Weekly total: — · Apple Health</small></button>';
        host.insertBefore(card, host.querySelector('.metric-card'));
    }
    const rows=data.steps?.slice(-7)||[];
    const available=rows.some(r=>r.steps !== null);
    const total=rows.reduce((sum,r)=>sum+Number(r.steps||0),0);
    const totalNode=card.querySelector("[data-apple-step-total]");
    const averageNode=card.querySelector("[data-apple-step-average]");
    const totalLabel=available?`Weekly total: ${number(total)} · Apple Health`:"Connect Apple Health to view steps";
    const averageLabel=available?number(Math.round(total/7))+" steps/day":"—";
    if(totalNode.textContent!==totalLabel)totalNode.textContent=totalLabel;
    if(averageNode.textContent!==averageLabel)averageNode.textContent=averageLabel;
    // Existing manual sleep dashboard metric must not imply it is from Apple Health.
    const sleepCard=[...host.querySelectorAll(".metric-card")].find(el=>el.textContent?.includes("Latest Sleep Duration"));
    if(sleepCard){
       const value=sleepCard.querySelector("strong, .metric-value, h3 + p");
       if(value){
           const label=data.sleep?.length?Number(data.sleep.at(-1).hours).toFixed(1)+"h":"—";
           if(value.textContent!==label)value.textContent=label;
       }
       sleepCard.setAttribute("title","Apple Health sleep (read-only)");
    }
}

const STEP_WINDOWS = Object.freeze({"1W":7,"1M":30,"3M":90,"6M":180,"1Y":365});
let activeStepWindow = "1W";
const STEP_SCREEN_ID = "levelup-steps-detail-screen";
function getStepRange(data, days) {
    const rows = (data?.steps || []).slice(-days);
    const measured = rows.filter(r=>Number.isFinite(r.steps) && r.steps>=0);
    const total = measured.reduce((sum,r)=>sum+r.steps,0);
    const average = measured.length ? Math.round(total/measured.length) : null;
    const weeklyAverage = measured.length ? Math.round(total/measured.length*7) : null;
    return {rows, total, average, weeklyAverage, recordedDays:measured.length};
}
function groupedStepBars(rows, days) {
    if (days <= 30) return rows.map(r=>({label:new Date(r.date+"T12:00:00").toLocaleDateString(undefined,{month:"numeric",day:"numeric"}),value:r.steps}));
    const chunk=days <= 90 ? 7 : days <= 180 ? 14 : 30;
    const groups=[];
    for(let i=0;i<rows.length;i+=chunk){
        const group=rows.slice(i,i+chunk);
        const observed=group.filter(r=>Number.isFinite(r.steps) && r.steps>=0);
        groups.push({label:new Date(group.at(-1).date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}),
                     value:observed.length ? Math.round(observed.reduce((sum,r)=>sum+r.steps,0)/observed.length):null});
    }
    return groups;
}
function renderStepsChart(rows, days){
    const points=groupedStepBars(rows,days);
    const maximum=Math.max(1,...points.map(p=>p.value ?? 0));
    return `<div class="lu-step-chart" role="img" aria-label="Apple Health step activity for the selected range">
       ${points.map(p=>`<div class="lu-step-chart-column" title="${p.label}: ${p.value===null?"No data":number(p.value)+" steps"}">
       <div class="lu-step-chart-track"><i style="height:${p.value===null?0:Math.max(2,Math.round(p.value/maximum*100))}%"></i></div>
       <small>${p.label}</small></div>`).join("")}
    </div><p class="lu-step-chart-caption">${days<=30?"Daily step totals":"Average daily steps per group"} · Source: Apple Health</p>`;
}
export function openStepsDetail() {
    document.getElementById(STEP_SCREEN_ID)?.remove();
    const screen=document.createElement("section");
    screen.id=STEP_SCREEN_ID;
    screen.className="dashboard-analytics-screen lu-step-detail-screen";
    screen.setAttribute("role","dialog");
    screen.setAttribute("aria-modal","true");
    screen.setAttribute("aria-label","Steps");
    screen.innerHTML=`<header class="dashboard-preview-header">
      <button class="dashboard-preview-back" type="button" data-apple-steps-close aria-label="Back to previous screen">‹</button>
      <div><small>Apple Health</small><h2>Steps</h2></div></header>
      <main class="dashboard-preview-body"><section class="lu-step-detail-intro"><h3>Step Activity</h3>
      <p>View activity trends collected by Apple Health.</p></section>
      <div class="lu-step-periods" role="group" aria-label="Step history range">
      ${Object.keys(STEP_WINDOWS).map(w=>`<button type="button" data-apple-steps-range="${w}" aria-pressed="${w===activeStepWindow}">${w}</button>`).join("")}</div>
      <div data-apple-steps-content><p>Loading Apple Health steps…</p></div>
      <button type="button" class="secondary-btn" data-apple-health-refresh>Refresh from Apple Health</button></main>`;
    document.body.appendChild(screen);
    document.body.classList.add("lu-steps-detail-open");
    void refreshAppleHealth().then(renderStepDetail).catch(error=>{
       const host=screen.querySelector("[data-apple-steps-content]");
       if(host) host.textContent=error?.message||"Could not read Apple Health.";
    });
}
export function closeStepsDetail(){
    document.getElementById(STEP_SCREEN_ID)?.remove();
    document.body.classList.remove("lu-steps-detail-open");
}
function renderStepDetail(data){
 const host=document.querySelector("#"+STEP_SCREEN_ID+" [data-apple-steps-content]");
 if(!host)return;
 if(data.unavailable){host.innerHTML='<p>Apple Health steps are available in the Level Up iOS app only.</p>';return;}
 const days=STEP_WINDOWS[activeStepWindow]||7;
 const {rows,total,average,weeklyAverage,recordedDays}=getStepRange(data,days);
 if(!recordedDays){host.innerHTML='<p>No steps found for this range. Confirm that Apple Health has step records and Level Up has Steps read permission.</p><button type="button" class="primary-btn" data-apple-health-connect>Connect Apple Health</button>';return;}
 host.innerHTML=`<div class="lu-step-stats">
   <div><small>Daily average</small><strong>${number(average)}</strong><span>steps / day</span></div>
   <div><small>Weekly average</small><strong>${number(weeklyAverage)}</strong><span>steps / week</span></div>
   <div><small>Total steps</small><strong>${number(total)}</strong><span>over ${recordedDays} recorded days</span></div>
   </div>${renderStepsChart(rows,days)}
   <p class="lu-step-source-note">Missing days are excluded from averages. Steps remain read-only on your device.</p>`;
}
function openSettings(){
 const content=document.getElementById("content");if(!content)return;
 content.innerHTML=`<section class="section-card lu-health-view"><button class="secondary-btn" data-apple-health-back="more" type="button">← More</button><h2>Apple Health</h2><p>Allow Level Up to read your steps and sleep. Garmin data appears here once Garmin Connect has written it into Apple Health.</p>
 <button type="button" class="primary-btn" data-apple-health-connect>Connect Apple Health</button>
 <button type="button" class="secondary-btn" data-apple-health-refresh>Refresh data</button>
 <p data-apple-health-message aria-live="polite"></p><small>Read-only. Level Up does not send HealthKit steps or sleep to its cloud backup.</small></section>`;
}
function ensureMoreCard(){
 const group=document.querySelector('.more-menu-group[data-more-group="health"]');
 if(!group || group.querySelector("[data-apple-health-settings]"))return;
 const card=document.createElement("button");card.className="more-menu-card";card.type="button";card.dataset.appleHealthSettings="1";
 card.innerHTML='<span class="more-menu-icon" aria-hidden="true">♥</span><span><strong>Apple Health</strong><small>Connect steps and sleep · Manage access</small></span>';
 group.appendChild(card);
}
function reconcile(){
 ensureMoreCard();
 if(latest)renderDashboard(latest);
}
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reconcile()})}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener("click", async event=>{
 const target=event.target.closest("button");if(!target)return;
 if(target.matches("[data-apple-health-settings]")){event.preventDefault();openSettings();}
 else if(target.matches("[data-apple-health-open-steps]")){event.preventDefault();openStepsDetail();}
 else if(target.matches("[data-apple-steps-close]")){event.preventDefault();closeStepsDetail();}
 else if(target.matches("[data-apple-steps-range]")){event.preventDefault();activeStepWindow=target.dataset.appleStepsRange;document.querySelectorAll("[data-apple-steps-range]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.appleStepsRange===activeStepWindow)));void refreshAppleHealth().then(renderStepDetail);}
 else if(target.matches("[data-apple-health-back]")){event.preventDefault();const page=target.dataset.appleHealthBack==="dashboard"?"dashboard":"more";document.querySelector(`.bottom-nav .nav-btn[data-page="${page}"]`)?.click();}
 else if(target.matches("[data-apple-health-connect]")){
   event.preventDefault();const status=await connectAppleHealth();
   document.querySelectorAll("[data-apple-health-message]").forEach(e=>e.textContent=status.message);
   if(document.querySelector("[data-apple-sleep]"))void refreshAppleHealth(true).then(renderSleep).catch(e=>setSleepStatus(e.message));
   if(document.getElementById(STEP_SCREEN_ID))void refreshAppleHealth(true).then(renderStepDetail);
 } else if(target.matches("[data-apple-health-refresh]")){
   event.preventDefault();try{const data=await refreshAppleHealth(true);renderSleep(data);renderStepDetail(data);reconcile();}
   catch(e){document.querySelectorAll("[data-apple-health-message]").forEach(el=>el.textContent=e.message);}
 }
},true);
document.addEventListener("keydown", event=>{if(event.key==="Escape" && document.getElementById(STEP_SCREEN_ID))closeStepsDetail();});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void refreshAppleHealth(true).then(reconcile).catch(()=>{});});
window.addEventListener("levelup:apple-health-refreshed",reconcile);
void refreshAppleHealth().then(reconcile).catch(()=>{});
const style=document.createElement("style");style.textContent=`
.lu-health-view{padding:16px;display:grid;gap:14px}.lu-health-view button{justify-self:start}
.lu-health-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.lu-health-metric{border:1px solid var(--border-color,#383343);border-radius:14px;padding:16px;background:var(--surface,#191722)}
.lu-health-metric small{display:block;font-size:12px;opacity:.7}.lu-health-metric strong{font-size:25px}
.lu-health-bars{height:190px;display:flex;align-items:stretch;gap:7px;padding:18px 4px 20px}
.lu-health-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0}
.lu-health-bar i{display:block;width:65%;min-height:2px;background:var(--accent,#a25cf4);border-radius:5px 5px 0 0}
.lu-health-bar span{font-size:10px;white-space:nowrap}.lu-health-bar small{font-size:11px;margin-top:5px}
.lu-health-history>div{display:flex;justify-content:space-between;padding:11px;border-bottom:1px solid #5554}
.lu-health-note{font-size:12px;opacity:.65}.lu-health-steps button{display:grid;text-align:left;width:100%;padding:12px;background:none;color:inherit;border:0;gap:5px}.lu-health-steps strong{font-size:25px}
`;document.head.appendChild(style);

const stepStyles=document.createElement("style");stepStyles.textContent=`
body.lu-steps-detail-open{overflow:hidden}.lu-step-detail-screen{position:fixed;inset:0;z-index:13080;overflow-y:auto;background:var(--bg,#09090b);color:var(--text,#fff);-webkit-overflow-scrolling:touch}
.lu-step-detail-intro{margin:5px 0 18px}.lu-step-detail-intro h3{font-size:1.15rem;margin:0 0 6px}.lu-step-detail-intro p{margin:0;color:var(--muted,#aaa);font-size:.8rem}
.lu-step-periods{display:flex;gap:6px;margin:0 0 17px}.lu-step-periods button{flex:1;min-width:0;border-radius:9px;border:1px solid var(--line,#444);padding:10px 3px;background:var(--card,#1b1b20);color:var(--text,#fff);font-weight:750;font-size:.75rem}
.lu-step-periods button[aria-pressed="true"]{background:var(--accent,#ee506b);color:white;border-color:var(--accent,#ee506b)}
.lu-step-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:22px}
.lu-step-stats>div{display:grid;padding:14px;background:var(--card,#1b1b20);border:1px solid var(--card-border,var(--line,#393941));border-radius:16px;gap:6px}
.lu-step-stats>div:last-child{grid-column:1/-1}.lu-step-stats small{color:var(--muted,#aaa);font-size:.7rem}.lu-step-stats strong{font-size:1.65rem}.lu-step-stats span{font-size:.65rem;color:var(--muted,#aaa)}
.lu-step-chart{height:210px;display:flex;gap:3px;align-items:stretch;padding:12px 2px 3px;margin-bottom:8px;border-bottom:1px solid var(--line,#444)}
.lu-step-chart-column{display:flex;flex:1;flex-direction:column;justify-content:flex-end;min-width:0}
.lu-step-chart-track{height:172px;display:flex;align-items:flex-end;justify-content:center}
.lu-step-chart-track i{display:block;width:75%;min-width:2px;max-width:22px;background:var(--accent,#ee506b);border-radius:4px 4px 0 0}
.lu-step-chart-column small{height:18px;color:var(--muted,#aaa);font-size:8px;white-space:nowrap;text-align:center;overflow:hidden}
.lu-step-chart-column:not(:nth-child(5n+1)) small{visibility:hidden}
.lu-step-chart-caption,.lu-step-source-note{color:var(--muted,#aaa);font-size:.72rem;margin:12px 0 20px}
`;document.head.appendChild(stepStyles);
