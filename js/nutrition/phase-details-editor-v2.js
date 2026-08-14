const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const GOAL_WEIGHT_KEY = "level_up_goal_weight";
const DAY_MS = 86400000;
let renderTimer = null;

function readPhases(){try{const v=JSON.parse(localStorage.getItem(PHASES_KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
function writePhases(v){localStorage.setItem(PHASES_KEY,JSON.stringify(v))}
function activeIndex(v){for(let i=v.length-1;i>=0;i-=1)if(v[i]&&!v[i].endDate&&v[i].goalId)return i;return-1}
function previousIndex(v,index){for(let i=index-1;i>=0;i-=1)if(v[i]?.startDate)return i;return-1}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function dateMs(v){return new Date(`${v}T12:00:00`).getTime()}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v))&&Number.isFinite(dateMs(v))&&v<=today()}
function previousDay(v){const d=new Date(`${v}T12:00:00`);d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function formatDate(v){const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?(v||"--"):d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
function formatRate(v){const n=Number(v);if(!Number.isFinite(n))return"--";if(Math.abs(n)<.005)return"Maintain";return `${n>0?"+":"−"}${Math.abs(n).toFixed(2).replace(/0$/,"")} lb/week`}
function phaseDay(v){return validDate(v)?Math.max(1,Math.floor((dateMs(today())-dateMs(v))/DAY_MS)+1):null}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function readWeights(){try{const v=JSON.parse(localStorage.getItem(WEIGHT_KEY)||"[]");return Array.isArray(v)?v.map(r=>({date:String(r?.date||""),weight:Number(r?.weight)})).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(r.weight)&&r.weight>0).sort((a,b)=>a.date.localeCompare(b.date)):[]}catch{return[]}}
function trendAsOf(date){const eligible=readWeights().filter(e=>e.date<=date);if(!eligible.length)return null;const latest=eligible.at(-1);const cutoff=dateMs(latest.date)-6*DAY_MS;const recent=eligible.filter(e=>dateMs(e.date)>=cutoff);const value=(recent.length?recent: [latest]).reduce((s,e)=>s+e.weight,0)/(recent.length||1);return Math.round(value*100)/100}
function goalWeight(phase){const n=Number(phase?.goalWeight??phase?.targetWeight);if(Number.isFinite(n)&&n>0)return n;const legacy=Number(localStorage.getItem(GOAL_WEIGHT_KEY));return Number.isFinite(legacy)&&legacy>0?legacy:null}
function activeState(){const phases=readPhases();const index=activeIndex(phases);return index>=0?{phases,index,phase:phases[index]}:null}

function ensureStyles(){if(document.getElementById("phase-details-editor-v2-styles"))return;const style=document.createElement("style");style.id="phase-details-editor-v2-styles";style.textContent=`
#phase-details-editor-wrap{margin-top:10px}#edit-current-phase-details{width:100%}
#phase-details-editor{margin-top:10px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.025)}
#phase-details-editor[hidden]{display:none!important}#phase-details-editor h4{margin:4px 0 6px;font-size:16px;color:#fff}
#phase-details-editor .phase-details-note{margin:0 0 12px;color:var(--muted,#a1a1aa);font-size:12px;line-height:1.45}
#phase-details-editor .phase-details-grid,#phase-details-editor .phase-details-readonly{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#phase-details-editor label{display:flex;flex-direction:column;gap:6px;color:#f4f4f5;font-size:12px;font-weight:700}#phase-details-editor input{width:100%;box-sizing:border-box}
#phase-details-editor .phase-details-readonly{margin-top:10px;gap:8px}#phase-details-editor .phase-details-readonly>div{padding:9px;border-radius:10px;background:rgba(255,255,255,.035)}
#phase-details-editor .phase-details-readonly span{display:block;color:var(--muted,#a1a1aa);font-size:9px;text-transform:uppercase;letter-spacing:.08em}
#phase-details-editor .phase-details-readonly strong{display:block;margin-top:3px;color:#fff;font-size:12px}#phase-details-editor .phase-details-actions{display:flex;gap:8px;margin-top:12px}#phase-details-editor .phase-details-actions button{flex:1}
#phase-details-editor-status{min-height:18px;margin:8px 0 0;color:var(--muted,#a1a1aa);font-size:11px;line-height:1.35}
#nutrition-phase-start-date[data-current-phase-locked="1"]{opacity:.65}
@media(max-width:390px){#phase-details-editor .phase-details-grid,#phase-details-editor .phase-details-readonly{grid-template-columns:1fr}}
`;document.head.appendChild(style)}

function lockCurrentPhaseDateField(){const state=activeState();const input=document.getElementById("nutrition-phase-start-date");const select=document.getElementById("unified-goal-select");if(!state||!input||!select)return;const same=select.value===state.phase.goalId;if(same){input.value=state.phase.startDate||today();input.disabled=true;input.dataset.currentPhaseLocked="1";input.title="Use Edit Phase Details above to change this existing phase."}else{input.disabled=false;delete input.dataset.currentPhaseLocked;input.title="Start date for the new phase."}}

function buildEditor(wrap,phase){const gw=goalWeight(phase);const calories=Number(phase.currentCalories??phase.startCalories);wrap.dataset.phaseId=String(phase.id||"");wrap.innerHTML=`
<button id="edit-current-phase-details" class="secondary-btn" type="button">Edit Phase Details</button>
<div id="phase-details-editor" hidden>
<span class="eyebrow">EDIT CURRENT PHASE</span><h4>${escapeHtml(phase.label||"Current Phase")}</h4>
<p class="phase-details-note">Save changes to this existing phase. This does not start a new phase or change its ID, calories, or target rate.</p>
<div class="phase-details-grid">
<label>Phase Start Date<input id="phase-details-start-date" type="date" max="${today()}" value="${escapeHtml(phase.startDate||today())}"></label>
<label>Goal Weight (lb)<input id="phase-details-goal-weight" type="number" min="1" step="0.1" inputmode="decimal" value="${Number.isFinite(gw)?gw:""}" placeholder="Optional"></label>
</div>
<div class="phase-details-readonly"><div><span>Target Rate</span><strong>${formatRate(phase.targetWeeklyRate)}</strong></div><div><span>Current Calories</span><strong>${Number.isFinite(calories)?`${Math.round(calories)} kcal/day`:"--"}</strong></div></div>
<div class="phase-details-actions"><button id="cancel-phase-details-edit" class="secondary-btn" type="button">Cancel</button><button id="save-phase-details-edit" class="primary-btn" type="button">Save Changes</button></div>
<p id="phase-details-editor-status" aria-live="polite"></p></div>`;
document.getElementById("edit-current-phase-details")?.addEventListener("click",()=>{const editor=document.getElementById("phase-details-editor");if(editor)editor.hidden=!editor.hidden});
document.getElementById("cancel-phase-details-edit")?.addEventListener("click",()=>{const editor=document.getElementById("phase-details-editor");if(editor)editor.hidden=true});
document.getElementById("save-phase-details-edit")?.addEventListener("click",saveChanges)}

function ensureEditor(){ensureStyles();const host=document.getElementById("nutrition-current-phase");const state=activeState();if(!host||!state){document.getElementById("phase-details-editor-wrap")?.remove();return}let wrap=document.getElementById("phase-details-editor-wrap");if(!wrap){wrap=document.createElement("div");wrap.id="phase-details-editor-wrap";host.appendChild(wrap)}if(wrap.dataset.phaseId!==String(state.phase.id||""))buildEditor(wrap,state.phase);lockCurrentPhaseDateField()}

function saveChanges(){const startDate=String(document.getElementById("phase-details-start-date")?.value||"");const rawGoal=Number(document.getElementById("phase-details-goal-weight")?.value);const newGoal=Number.isFinite(rawGoal)&&rawGoal>0?Math.round(rawGoal*10)/10:null;const status=document.getElementById("phase-details-editor-status");if(!validDate(startDate)){if(status)status.textContent="Choose a valid start date that is not in the future.";return}
const phases=readPhases();const index=activeIndex(phases);if(index<0){if(status)status.textContent="No active phase was found.";return}const active=phases[index];const prevIndex=previousIndex(phases,index);const prev=prevIndex>=0?phases[prevIndex]:null;if(prev?.startDate&&startDate<=prev.startDate){if(status)status.textContent=`The current phase must start after the previous phase began (${formatDate(prev.startDate)}).`;return}
const now=new Date().toISOString();if(prevIndex>=0){const endDate=previousDay(startDate);phases[prevIndex]={...prev,endDate,endTrendWeight:trendAsOf(endDate),status:"completed",updatedAt:now}}
phases[index]={...active,startDate,startingTrendWeight:trendAsOf(startDate),...(Number.isFinite(newGoal)?{goalWeight:newGoal}:{}),updatedAt:now};writePhases(phases);if(Number.isFinite(newGoal))localStorage.setItem(GOAL_WEIGHT_KEY,String(newGoal));
syncVisible(phases[index]);const setupDate=document.getElementById("nutrition-phase-start-date");if(setupDate)setupDate.value=startDate;const setupGoal=document.getElementById("nutrition-phase-goal-weight");if(setupGoal&&Number.isFinite(newGoal))setupGoal.value=String(newGoal);
window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"));window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));if(status)status.textContent=`Saved. This same phase now starts ${formatDate(startDate)}.`;window.setTimeout(()=>{syncVisible(phases[index]);lockCurrentPhaseDateField()},150)}

function syncVisible(phase){const grid=document.querySelector("#nutrition-current-phase .nutrition-current-phase-grid");if(!grid||!phase)return;const started=[...grid.children].find(cell=>cell.querySelector("span")?.textContent?.trim()==="Started");const strong=started?.querySelector("strong");const day=phaseDay(phase.startDate);if(strong)strong.textContent=`${formatDate(phase.startDate)}${day?` · Day ${day}`:""}`;const cell=grid.querySelector("[data-phase-goal-weight]");const gw=goalWeight(phase);const goalStrong=cell?.querySelector("strong");if(goalStrong)goalStrong.textContent=Number.isFinite(gw)?`${gw.toFixed(1)} lb`:"Not set"}

function schedule(){clearTimeout(renderTimer);renderTimer=window.setTimeout(ensureEditor,50)}
document.addEventListener("change",e=>{if(e.target?.id==="unified-goal-select")window.setTimeout(lockCurrentPhaseDateField,20)},true);
document.addEventListener("click",e=>{if(e.target?.closest?.('.nav-btn[data-page="calories"], [data-nutrition-view="goals"], [data-planner-view="goals"]')){window.setTimeout(schedule,20);window.setTimeout(schedule,160)}},true);
window.addEventListener("levelup:nutrition-phase-updated",schedule);window.addEventListener("levelup:nutrition-updated",schedule);window.addEventListener("load",schedule);schedule();
