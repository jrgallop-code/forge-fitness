
/* iOS HealthKit is the read-only authority for steps and sleep. No imported
 * health data is written to localStorage or the automatic cloud backup. */
const plugin = () => window.Capacitor?.Plugins?.LevelUpHealthKit || null;
const number = value => Number(value || 0).toLocaleString();
const day = date => new Date(date + "T12:00:00").toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric"});
let latest = null;
let pending = null;
let lastRead = 0;
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
    pending = plugin().readActivity({days:90}).then(result => {
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
        card.innerHTML='<button type="button" data-apple-health-open-steps><span>👟 Steps · Last 7 Days</span><strong data-apple-step-total>—</strong><small data-apple-step-average>Apple Health · Connect to view</small></button>';
        host.insertBefore(card, host.querySelector('.metric-card'));
    }
    const rows=data.steps?.slice(-7)||[];
    const available=rows.some(r=>r.steps !== null);
    const total=rows.reduce((sum,r)=>sum+Number(r.steps||0),0);
    const totalNode=card.querySelector("[data-apple-step-total]");
    const averageNode=card.querySelector("[data-apple-step-average]");
    const totalLabel=available?number(total):"—";
    const averageLabel=available?`Daily average: ${number(Math.round(total/7))} · Apple Health`:"Connect Apple Health to view steps";
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
function showSteps(){
    const content=document.getElementById("content");if(!content)return;
    content.innerHTML=`<section class="section-card lu-health-view"><button type="button" class="secondary-btn" data-apple-health-back="dashboard">← Dashboard</button><h2>Steps</h2><p>Daily activity from Apple Health</p><div data-apple-step-detail>Loading activity…</div><button class="secondary-btn" data-apple-health-refresh type="button">Refresh from Apple Health</button></section>`;
    void refreshAppleHealth().then(renderStepDetail).catch(e=>{const n=content.querySelector("[data-apple-step-detail]");if(n)n.textContent=e.message});
}
function renderStepDetail(data){
 const host=document.querySelector("[data-apple-step-detail]");if(!host)return;
 if(data.unavailable){host.textContent="Apple Health is available in the iOS app only.";return;}
 const rows=data.steps.slice(-7), total=rows.reduce((sum,r)=>sum+Number(r.steps||0),0);
 if(!rows.some(r=>r.steps != null)){host.innerHTML='<p>No steps have been shared with Level Up yet. Verify Steps read permission in Apple Health.</p><button class="primary-btn" data-apple-health-connect>Connect Apple Health</button>';return;}
 host.innerHTML=`<div class="lu-health-metrics">${metric("Last 7 days",number(total))}${metric("Daily average",number(Math.round(total/7)))}</div>${barChart(rows,"steps")}`;
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
 else if(target.matches("[data-apple-health-open-steps]")){event.preventDefault();showSteps();}
 else if(target.matches("[data-apple-health-back]")){event.preventDefault();const page=target.dataset.appleHealthBack==="dashboard"?"dashboard":"more";document.querySelector(`.bottom-nav .nav-btn[data-page="${page}"]`)?.click();}
 else if(target.matches("[data-apple-health-connect]")){
   event.preventDefault();const status=await connectAppleHealth();
   document.querySelectorAll("[data-apple-health-message]").forEach(e=>e.textContent=status.message);
   if(document.querySelector("[data-apple-sleep]"))void refreshAppleHealth(true).then(renderSleep).catch(e=>setSleepStatus(e.message));
   if(document.querySelector("[data-apple-step-detail]"))void refreshAppleHealth(true).then(renderStepDetail);
 } else if(target.matches("[data-apple-health-refresh]")){
   event.preventDefault();try{const data=await refreshAppleHealth(true);renderSleep(data);renderStepDetail(data);reconcile();}
   catch(e){document.querySelectorAll("[data-apple-health-message]").forEach(el=>el.textContent=e.message);}
 }
},true);
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
