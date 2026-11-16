/* Level Up Coach: single functional client dashboard, no demo fixtures or duplicate dashboards. */
(()=>{
"use strict";
const $=id=>document.getElementById(id), el=(tag,parent,attributes={})=>{const x=document.createElement(tag);for(const [k,v] of Object.entries(attributes)){if(k==="text")x.textContent=v;else if(k==="className")x.className=v;else x.setAttribute(k,v)}if(parent)parent.append(x);return x};
const fetchJson=async(url,method="GET",body)=>{const response=await fetch(url,{method,credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(data.error||"HTTP "+response.status);error.status=response.status;throw error}return data};
const accountApi=(action,body)=>fetchJson("/api/coach?action="+action,body?"POST":"GET",body);
const programsApi=(action,assignmentId,method="GET",body)=>fetchJson("/api/coach-programs?"+new URLSearchParams({action,assignmentId:assignmentId||"",clientId:clientId||""}),method,body);
const arr=x=>Array.isArray(x)?x:[], today=()=>new Date().toISOString().slice(0,10);
let clients=[],clientId=null,profile=null,assignments=[],editor=null,exerciseList=[],catalogue=new Map(),section="overview",clientView="list",trainingMode="editor",analytics=null,muscleMaps=null,metricUI=null,selectedMetric=null,metricViewMode="graph",calendar=null,calendarDraft=null,calendarLoadError=null,week=0,viewWeeks=2,loadSequence=0,busy=false;
const person=()=>clients.find(x=>x.id===clientId)||null;
const active=()=>assignments.filter(x=>x.status==="published");
function metricProfile(){
 const stepGoal=active().find(x=>Number(x.goals?.stepGoal)>0)?.goals?.stepGoal;
 if(!profile||!stepGoal||Number(profile.dailyMetrics?.steps?.goal)>0)return profile;
 return{...profile,dailyMetrics:{...(profile.dailyMetrics||{}),steps:{...(profile.dailyMetrics?.steps||{}),history:profile.dailyMetrics?.steps?.history||[],goal:Number(stepGoal)}}};
}
const panel=(parent,title,description)=>{const wrapper=el("section",parent,{className:"cf-card"}),h=el("header",wrapper);el("strong",h,{text:title});if(description)el("small",h,{text:description});return el("div",wrapper,{className:"cf-body"})};
const info=(parent,label,value)=>{const line=el("div",parent,{className:"cf-info"});el("span",line,{text:label});el("b",line,{text:value==null?"—":String(value)})};
const note=(parent,s)=>el("p",parent,{className:"cf-muted",text:s});
const btn=(parent,name,action,variant="")=>{const button=el("button",parent,{type:"button",className:"cf-button "+variant,text:name});button.onclick=action;return button};
const field=(parent,title,type="input",props={})=>{const label=el("label",parent,{className:"cf-field"});el("span",label,{text:title});return el(type,label,props)};
const displayDate=s=>{if(!s)return"—";const d=new Date(s.length===10?s+"T12:00:00":s);return Number.isFinite(d.getTime())?d.toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"}):"—"};
const status=(s,error=false)=>{const out=$("cf-status");if(out){out.textContent=s;out.style.color=error?"#ac3142":"#506a83"}};
function switchTab(name){section=name;for(const tab of ["overview","training","progress","notes"]){$("cf-tab-"+tab)?.classList.toggle("active",tab===name);if($("cf-view-"+tab))$("cf-view-"+tab).hidden=tab!==name}if(name==="training")drawTraining()}
function workoutSelection(){const header=$("coach-program-client-plan");return[...(header?.querySelectorAll("select")||[])].find(s=>[...s.options].some(o=>o.value==="My Account"||o.value==="Sarah Carter"))}
function connectBuilder(c){const selection=workoutSelection();if(!selection)return;const value=c.isSelf?"My Account":c.id;if(![...selection.options].some(o=>o.value===value))el("option",selection,{value,text:c.name+" (Connected)"});if(selection.value!==value){selection.value=value;selection.dispatchEvent(new Event("change",{bubbles:true}))}}

function showClientList(){
 clientView="list";
 const listPage=$("cf-directory"),detail=$("cf-detail");
 if(listPage)listPage.hidden=false;
 if(detail)detail.hidden=true;
 renderClientDirectory();
}
function showClientDetail(){
 clientView="detail";
 const listPage=$("cf-directory"),detail=$("cf-detail");
 if(listPage)listPage.hidden=true;
 if(detail)detail.hidden=false;
 switchTab("overview");
}
function renderClientDirectory(){
 const host=$("cf-directory-rows");if(!host)return;host.replaceChildren();
 const term=($("cf-directory-search")?.value||"").trim().toLowerCase();
 const filtered=clients.filter(c=>!term||(c.name+" "+(c.email||"")).toLowerCase().includes(term));
 $("cf-directory-count").textContent=filtered.length+" connected client"+(filtered.length===1?"":"s");
 if(!filtered.length)return note(host,"No matching connected athletes. Demo profiles are not displayed.");
 for(const c of filtered){
  const item=el("button",host,{type:"button",className:"cf-directory-row"});
  const avatar=el("span",item,{className:"cf-directory-avatar",text:c.name?.trim()?.slice(0,1)?.toUpperCase()||"?"});
  const identification=el("span",item,{className:"cf-directory-identification"});el("strong",identification,{text:c.isSelf?"My Account — "+c.name:c.name});
  el("small",identification,{text:c.email||"Connected Level Up athlete"});
  el("span",item,{className:"cf-directory-status",text:"Connected"});
  el("span",item,{className:"cf-directory-open",text:"View profile ›"});
  item.onclick=async()=>{showClientDetail();await choose(c.id)};
 }
}

function renderSidebar(){const area=$("cf-client-list");if(!area)return;area.replaceChildren();
 const search=($("cf-client-search")?.value||"").trim().toLowerCase();
 for(const c of clients.filter(x=>!search||(x.name+" "+(x.email||"")).toLowerCase().includes(search))){
  const button=btn(area,(c.isSelf?"● ":"")+c.name,()=>{showClientDetail();void choose(c.id)},"cf-client-item"+(c.id===clientId?" current":""));
  button.title=c.email||c.name;
 }
 if(!area.childElementCount)note(area,clients.length?"No matching clients.":"No connected athletes.");
}
async function roster(){try{
 let result;
 try{result=await accountApi("clients")}catch(error){
  if(error.status!==401)throw error;
  let legacy=null;try{legacy=JSON.parse(sessionStorage.getItem("levelup_coach_self_session_v1")||"null")}catch{}
  if(!legacy?.token)throw error;
  await accountApi("connect",{token:legacy.token});
  result=await accountApi("clients");
 }
 $("cf-login").hidden=true;
 clients=arr(result.clients).filter(c=>c.id);const select=$("cf-client");select.replaceChildren();for(const c of clients)el("option",select,{value:c.id,text:c.isSelf?"My Account — "+c.name:c.name});const chosen=clients.find(x=>x.id===clientId)||clients.find(x=>x.isSelf)||clients[0];if(chosen)await choose(chosen.id);else status("No linked Level Up athlete. Add and invite a client to connect one.",true);renderSidebar();renderClientDirectory()}catch(e){status("Cannot load connected athletes: "+e.message+". Your saved programs and account links have not been erased.",true);if(e.status===401)$("cf-login").hidden=false}}
async function choose(id){const c=clients.find(x=>x.id===id);if(!c)return;clientId=c.id;editor=null;selectedMetric=null;trainingMode="editor";calendar=null;calendarDraft=null;calendarLoadError=null;$("cf-client").value=c.id;$("cf-name").textContent=c.name;$("cf-email").textContent=c.email||"Connected Level Up athlete";connectBuilder(c);renderSidebar();await refresh()}
async function refresh(){const id=clientId,seq=++loadSequence;status("Loading published programs and "+person()?.name+"'s profile…");const [a,b]=await Promise.allSettled([fetchJson("/api/coach-phase1?"+new URLSearchParams({action:"summary",clientId:id})),programsApi("list")]);if(clientId!==id||seq!==loadSequence)return;profile=a.status==="fulfilled"?a.value:null;assignments=b.status==="fulfilled"?arr(b.value.assignments):[];renderOverview();renderProgress();if(section==="training")drawTraining();if(a.status==="rejected"||b.status==="rejected")status([a.status==="rejected"?"Profile: "+a.reason.message:"",b.status==="rejected"?"Programs: "+b.reason.message:""].filter(Boolean).join(" · "),true);else status("Connected as "+person().name+" · last data sync "+(profile?.backup?.syncedAt?new Date(profile.backup.syncedAt).toLocaleString("en-CA"):"not yet available"))}
function renderOverview(){
 const root=$("cf-view-overview");if(!root||!person())return;
 root.replaceChildren();
 if(metricUI)metricUI.renderCoachMetricOverview(root,metricProfile(),metricId=>{
  selectedMetric=metricId;metricViewMode="graph";switchTab("progress");renderProgress();
 });
 const grid=el("div",root,{className:"cf-summary-grid"});
 // First row: matching profile and published-plan cards.
 let c=panel(grid,"Client Profile","Linked Level Up account");
 info(c,"Name",person().name);info(c,"Email",person().email||"—");
 info(c,"Height",profile?.profile?.heightCm?profile.profile.heightCm+" cm":"Not shared");
 info(c,"Current weight",profile?.weight?.latest?profile.weight.latest+" lb":"Not shared");
 info(c,"Last cloud sync",profile?.backup?.syncedAt?new Date(profile.backup.syncedAt).toLocaleString("en-CA"):"Not synced");
 c=panel(grid,"Assigned Workout Programs","Published to this athlete's Level Up account");
 if(!active().length)note(c,"No published workout assigned. Create and publish one to display it here.");
 for(const p of active()){
  const item=el("div",c,{className:"cf-program"}),top=el("div",item,{className:"cf-between"});
  btn(top,p.name||"Workout program",()=>open(p.id),"link");
  el("span",top,{className:"cf-pill",text:"Published · v"+p.version});
  note(item,"Assigned "+displayDate(p.publishedAt));
  const actions=el("div",item,{className:"cf-actions"});
  btn(actions,"Open calendar",()=>open(p.id));
  btn(actions,"Edit workout",()=>edit(p.id),"subtle");
  btn(actions,"Remove",()=>archive(p),"danger");
 }
 btn(c,"+ Create a workout program",create,"subtle");
 // Second row: goals and actual training totals.
 c=panel(grid,"Goals & Notes","Coach information");
 const p=active().find(x=>x.goals?.stepGoal||x.goals?.goalWeightLb);
 if(p?.goals?.stepGoal)info(c,"Daily steps",Number(p.goals.stepGoal).toLocaleString("en-CA"));
 if(p?.goals?.goalWeightLb)info(c,"Goal weight",p.goals.goalWeightLb+" lb");
 if(!p)note(c,"No goal targets assigned.");
 btn(c,"Open private notes",()=>switchTab("notes"),"subtle");
 c=panel(grid,"Training Activity","Actual synced history");
 info(c,"Completed workouts",profile?.training?.completedCount??"Not shared");
 info(c,"Last 30 days",profile?.training?.last30Days??"Not shared");
 info(c,"Latest workout",displayDate(profile?.training?.lastCompletedDate));
 btn(c,"View progress",()=>switchTab("progress"),"subtle");
 // Final row: updates occupies the width without creating an uneven short column.
 c=panel(grid,"Updates & Synchronization","Latest client activity");
 note(c,"Profile sync: "+(profile?.backup?.syncedAt?new Date(profile.backup.syncedAt).toLocaleString("en-CA"):"No cloud backup yet"));
 note(c,"Published workout programs: "+active().length);
 c.parentElement.classList.add("cf-summary-wide");
}
function renderProgress(){
 const root=$("cf-view-progress");if(!root)return;root.replaceChildren();
 if(selectedMetric&&metricUI){
   metricUI.renderCoachMetricDetail(root,metricProfile(),selectedMetric,()=>{
     selectedMetric=null;metricViewMode="graph";renderProgress();
   },metricViewMode);
   return;
 }
 const tools=el("div",root,{className:"cf-actions"});
 btn(tools,"Metric Calendar",()=>{
   selectedMetric="weight";metricViewMode="calendar";renderProgress();
 },"subtle");
 const top=el("div",root,{className:"cf-metrics"});for(const [k,v]of [["Weight",profile?.weight?.latest?profile.weight.latest+" lb":"Not shared"],["Sessions",profile?.training?.completedCount??"—"],["Last 30 days",profile?.training?.last30Days??"—"]]){const m=el("div",top,{className:"cf-metric"});el("small",m,{text:k});el("strong",m,{text:String(v)})}
 const two=el("div",root,{className:"cf-columns"}),left=el("div",two),right=el("div",two);
 let c=panel(left,"Weight entries","Latest synced weigh-ins");const weights=arr(profile?.weight?.history).slice(-15).reverse();if(!weights.length)note(c,"No weigh-ins synced.");for(const x of weights)info(c,displayDate(x.date),x.weight+" lb");
 c=panel(right,"Recent sessions","Completed workouts");const workouts=arr(profile?.training?.recentWorkouts).slice(-12).reverse();if(!workouts.length)note(c,"No completed workouts in cloud.");for(const x of workouts)info(c,x.name||"Workout",displayDate(x.date));if(analytics)analytics.renderCoachProgressAnalytics(root,profile);
 if(muscleMaps)muscleMaps.renderCoachMuscleMaps(root,profile);
}
async function notes(){const root=$("cf-view-notes");root.replaceChildren();const c=panel(root,"Coach notes","Athlete-linked, private to the coach");const inp=field(c,"Notes","textarea",{rows:"5",maxlength:"6000"});const limitations=field(c,"Limitations / accommodations","textarea",{rows:"4",maxlength:"6000"});let saved=null;
 try{const res=await fetchJson("/api/coach-phase1?"+new URLSearchParams({action:"drafts",clientId}));saved=arr(res.drafts).find(d=>d.id==="coach-profile-notes-v1")||null;inp.value=saved?.content?.notes||"";limitations.value=saved?.content?.limitations||""}catch(e){note(c,"Notes not available: "+e.message)}
 btn(c,"Save notes",async()=>{try{const result=await fetchJson("/api/coach-phase1?"+new URLSearchParams({action:"save",clientId,draftId:"coach-profile-notes-v1"}),"PUT",{name:"Private Coach Notes",content:{kind:"private-coach-notes",notes:inp.value,limitations:limitations.value},expectedVersion:saved?.version??null});saved={version:result.version};status("Notes saved to the athlete-linked Coach workspace.")}catch(e){status("Notes not saved: "+e.message,true)}});
}
const defaultProgram=()=>({id:null,sourcePlanId:"coach-program-"+cryptoSafe(),version:null,name:"New Workout Program",days:[{name:"Workout A",exercises:[]}],goals:{},includeNutrition:false});
function cryptoSafe(){return String(Date.now())+"-"+Math.random().toString(36).slice(2,8)}
function create(){editor=defaultProgram();trainingMode="editor";calendar=null;calendarDraft=null;switchTab("training");drawTraining()}
async function edit(pid){trainingMode="editor";switchTab("training");status("Opening published workout…");try{const d=await programsApi("detail",pid);const p=d.assignment;if(!p?.training?.days)throw Error("Published training days are missing");editor={id:p.id,sourcePlanId:p.sourcePlanId,version:p.version,name:p.name,days:structuredClone(p.training.days),goals:p.goals||{},includeNutrition:p.includeNutrition};calendar=null;calendarDraft=null;drawTraining();status("Editing "+p.name+" · version "+p.version)}catch(e){status("Cannot open workout: "+e.message,true)}}
async function open(pid){await edit(pid);if(!editor)return;trainingMode="calendar";const title=editor.name;try{const result=await programsApi("calendar",pid);calendar=result.schedule||null;calendarDraft=calendar?structuredClone(calendar):null;status("Opened "+title+". The program can be edited even if no calendar is saved.")}catch(e){calendar=null;calendarDraft=null;status("Workout opened. Calendar unavailable: "+e.message,true)}drawTraining()}
async function archive(program){if(!confirm("Archive "+program.name+"? This removes the assignment but preserves completed workouts."))return;try{await programsApi("archive",program.id,"DELETE");if(editor?.id===program.id){editor=null;calendar=null;calendarDraft=null}status("Program archived; completed history preserved.");await refresh()}catch(e){status("Could not archive: "+e.message,true)}}
function exerciseEditor(root,day,dayIndex){
 const heading=el("div",root,{className:"cf-between"});const name=field(heading,"Workout day name","input",{value:day.name});name.value=day.name;name.oninput=()=>{day.name=name.value};
 btn(heading,"Remove day",()=>{if(editor.days.length<=1)return status("At least one day is required.",true);editor.days.splice(dayIndex,1);drawTraining()},"danger");
 for(let i=0;i<day.exercises.length;i++){
  const ex=day.exercises[i],line=el("div",root,{className:"cf-exercise"});el("strong",line,{text:catalogue.get(ex.id)||ex.id});
  const fields=el("div",line,{className:"cf-inline"});const sets=field(fields,"Sets","input",{type:"number",min:"1",max:"30"});sets.value=ex.sets||3;sets.oninput=()=>{ex.sets=Number(sets.value)};
  const reps=field(fields,"Reps","input",{placeholder:"8-12"});reps.value=ex.reps||"8-12";reps.oninput=()=>{ex.reps=reps.value};
  btn(fields,"Remove exercise",()=>{day.exercises.splice(i,1);drawTraining()},"danger");
 }
 const addRow=el("div",root,{className:"cf-inline"});const search=field(addRow,"Add exercise","input",{placeholder:"Search the Level Up exercise library…"});
 const match=el("select",addRow,{"aria-label":"Matching exercises"});const populate=()=>{match.replaceChildren();const term=search.value.toLowerCase().trim();const found=exerciseList.filter(x=>!term||x.name.toLowerCase().includes(term)||x.id.toLowerCase().includes(term)).slice(0,35);for(const x of found)el("option",match,{value:x.id,text:x.name})};search.oninput=populate;populate();
 btn(addRow,"Add",()=>{if(!match.value)return status("Choose an exercise first.",true);day.exercises.push({id:match.value,sets:3,reps:"8-12"});drawTraining()});
}
function workoutForm(parent){
 const root=panel(parent,editor.id?"Edit assigned workout":"Create workout program","Changes are saved to this connected athlete account.");
 const title=field(root,"Program name","input");title.value=editor.name;title.oninput=()=>editor.name=title.value;
 for(let i=0;i<editor.days.length;i++){const card=el("div",root,{className:"cf-workout-day"});exerciseEditor(card,editor.days[i],i)}
 const buttons=el("div",root,{className:"cf-actions"});btn(buttons,"+ Add workout day",()=>{if(editor.days.length>=14)return status("Maximum 14 workout days per program.",true);editor.days.push({name:"Workout "+String.fromCharCode(65+editor.days.length),exercises:[]});drawTraining()},"subtle");
 btn(buttons,editor.id?"Save & update assigned program":"Assign program to athlete",publish);
 btn(buttons,"Close editor",()=>{editor=null;drawTraining()},"subtle");
}
async function publish(){if(busy||!editor)return;const c=person();if(!c)return;const title=editor.name.trim(),days=editor.days;if(!title||days.length<1||days.some(d=>!d.name.trim()||!d.exercises.length))return status("Each workout day needs a name and at least one exercise.",true);
 if(days.some(d=>d.exercises.some(x=>!x.id||!(Number(x.sets)>=1&&Number(x.sets)<=30))))return status("Check exercises and set counts before saving.",true);
 busy=true;status("Publishing "+title+" to "+c.name+"…");
 const payload={clientId:c.id,sourcePlanId:editor.sourcePlanId,expectedVersion:editor.version,training:{name:title,days:days.map(d=>({name:d.name,exercises:d.exercises.map(e=>({id:e.id,sets:Number(e.sets),reps:String(e.reps||"8-12")}))})),settings:{daysPerWeek:Math.min(6,Math.max(2,days.length))}},goals:editor.goals||{},includeNutrition:false};
 try{const result=await accountApi("publish",payload);const p=result.assignment;editor={id:p.id,sourcePlanId:p.sourcePlanId,version:p.version,name:p.name,days:structuredClone(p.training.days),goals:p.goals||{},includeNutrition:p.includeNutrition};status("Published "+p.name+" · version "+p.version+" to "+c.name+".");await refresh();switchTab("training")}
 catch(e){status("Program was not published: "+e.message,true)}finally{busy=false}
}
function weekdayPattern(days){const slots=days.length===2?[0,3]:days.length===3?[0,2,4]:days.length===4?[0,1,3,4]:[0,1,2,3,4,5,6];return Array.from({length:7},(_,weekday)=>{const k=slots.indexOf(weekday);return k>=0&&k<days.length?{weekday,type:"workout",dayIndex:k}:{weekday,type:"rest"}})}
const addDate=(s,days)=>new Date(new Date(s+"T12:00:00Z").getTime()+days*86400000).toISOString().slice(0,10);
function calendarUI(parent){
 if(!editor?.id)return note(parent,"Assign this workout to the athlete first. Then schedule workout and rest days.");
 if(!calendarDraft)calendarDraft={startDate:today(),weeks:4,version:null,days:weekdayPattern(editor.days),overrides:{}};
 const box=panel(parent,"Workout & Rest Day Calendar","Per-program schedule · athlete sees their assigned weekly pattern");
 const controls=el("div",box,{className:"cf-inline"}),start=field(controls,"Start date","input",{type:"date"});start.value=calendarDraft.startDate;start.onchange=()=>{calendarDraft.startDate=start.value;calendarDraft.overrides={};drawTraining()};
 const weeks=field(controls,"Weeks","input",{type:"number",min:"1",max:"52"});weeks.value=calendarDraft.weeks;weeks.onchange=()=>{const v=Number(weeks.value);if(v>=1&&v<=52){calendarDraft.weeks=v;drawTraining()}};
 const view=field(controls,"View","select");for(const v of [1,2,4])el("option",view,{value:v,text:v+" week"+(v>1?"s":"")});view.value=String(viewWeeks);view.onchange=()=>{viewWeeks=Number(view.value);week=0;drawTraining()};
 const nav=el("div",box,{className:"cf-actions"});btn(nav,"← Previous",()=>{week=Math.max(0,week-viewWeeks);drawTraining()},"subtle");btn(nav,"Next →",()=>{week=Math.min(calendarDraft.weeks-1,week+viewWeeks);drawTraining()},"subtle");note(nav,"Week "+(week+1)+" of "+calendarDraft.weeks);
 const wrap=el("div",box,{className:"cf-calendar-scroll"});for(let w=week;w<Math.min(calendarDraft.weeks,week+viewWeeks);w++){const row=el("div",wrap,{className:"cf-calendar-grid"});for(let k=0;k<7;k++){const day=addDate(calendarDraft.startDate,w*7+k),weekday=(new Date(day+"T12:00:00Z").getUTCDay()+6)%7,ev=calendarDraft.overrides?.[day]||calendarDraft.days[weekday],exercise=ev?.type==="workout"?editor.days[ev.dayIndex]:null;
 const col=el("div",row,{className:"cf-calendar-day "+(exercise?"training":"rest")});el("small",col,{text:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][weekday]+" · "+day.slice(5)});el("strong",col,{text:exercise?.name||"Rest"});if(exercise)for(const x of exercise.exercises.slice(0,3))note(col,catalogue.get(x.id)||x.id);
 const menu=el("select",col,{"aria-label":"Workout for "+day});el("option",menu,{value:"rest",text:"Rest"});editor.days.forEach((d,i)=>el("option",menu,{value:i,text:d.name}));menu.value=exercise?String(ev.dayIndex):"rest";menu.onchange=()=>{calendarDraft.overrides[day]=menu.value==="rest"?{type:"rest"}:{type:"workout",dayIndex:Number(menu.value)};drawTraining()}}}
 const footer=el("div",box,{className:"cf-actions"});btn(footer,"Save workout/rest calendar",saveCalendar);btn(footer,"Apply first week to every week",()=>{for(let d=0;d<7;d++){const date=addDate(calendarDraft.startDate,d);const wk=(new Date(date+"T12:00:00Z").getUTCDay()+6)%7;calendarDraft.days[wk]=calendarDraft.overrides[date]||calendarDraft.days[wk]}calendarDraft.overrides={};drawTraining()},"subtle");
 note(box,"Calendar changes are separate from workout history. If cloud calendar storage isn't enabled yet, the workout plan still opens and can be edited.");
}
async function saveCalendar(){if(!calendarDraft||!editor?.id)return;try{const result=await programsApi("calendar",editor.id,"PUT",{startDate:calendarDraft.startDate,weeks:calendarDraft.weeks,days:calendarDraft.days,overrides:calendarDraft.overrides,expectedVersion:calendar?.version??null});calendar=result.schedule;calendarDraft=structuredClone(calendar);status("Workout/rest calendar saved · version "+calendar.version)}catch(e){status("Workout saved, but calendar could not save: "+e.message,true)}}
function drawTraining(){const root=$("cf-view-training");if(!root||section!=="training")return;root.replaceChildren();
 const toolbar=el("div",root,{className:"cf-actions"});
 btn(toolbar,"+ New workout program",create);
 for(const p of active()){
  btn(toolbar,p.name+" · Schedule",()=>open(p.id),"subtle");
  btn(toolbar,"Edit",()=>edit(p.id),"subtle");
 }
 if(!editor){
  const empty=panel(root,"Workout programs","Choose a published program or create one.");
  note(empty,"Click Schedule for workout/rest days, or Edit to change exercises, sets and repetitions.");
  return;
 }
 if(trainingMode==="calendar"){
  const nav=el("div",root,{className:"cf-actions"});
  btn(nav,"Edit workout exercises",()=>{trainingMode="editor";drawTraining()},"subtle");
  calendarUI(root);
 }else{
  workoutForm(root);
  if(editor.id)btn(root,"View this program's schedule",()=>{trainingMode="calendar";drawTraining()},"subtle");
 }
}
function mount(){const host=$("clients");if(!host||$("coach-functional-profile"))return;const style=el("style",document.head,{id:"cf-style"});style.textContent="#clients> :not(#coach-functional-profile){display:none!important}#coach-functional-profile{display:block!important;visibility:visible!important;padding:12px;background:#f6f8fc;color:#213a59}#coach-functional-profile *{box-sizing:border-box}#coach-functional-profile .cf-head,#coach-functional-profile .cf-actions,#coach-functional-profile .cf-between{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between}#coach-functional-profile .cf-head h2{margin:0;font-size:24px}#coach-functional-profile .cf-head p,#coach-functional-profile .cf-muted{color:#647e9a;font-size:12px}#coach-functional-profile .cf-tabs{display:flex;gap:8px;border-bottom:1px solid #dbe4ef;margin:12px 0 17px}#coach-functional-profile .cf-tabs button{background:transparent;color:#647c98;border:0;border-radius:0}#coach-functional-profile .cf-tabs button.active{color:#1b67da;border-bottom:3px solid #1b67da}#coach-functional-profile .cf-card{background:#fff;border:1px solid #d7e2ee;border-radius:12px;margin:0 0 14px;overflow:hidden}#coach-functional-profile .cf-card header{background:#f3f7fc;padding:13px 16px;display:flex;justify-content:space-between}#coach-functional-profile .cf-card header small{color:#70869c}#coach-functional-profile .cf-body{padding:14px 16px}#coach-functional-profile .cf-columns{display:grid;grid-template-columns:minmax(250px,.85fr) minmax(330px,1.15fr);gap:14px}#coach-functional-profile .cf-info{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #eef1f6;padding:8px 0;font-size:12px}#coach-functional-profile .cf-info span{color:#69809a}#coach-functional-profile .cf-program,#coach-functional-profile .cf-workout-day{border:1px solid #dbe5ef;border-radius:9px;padding:12px;margin:10px 0}#coach-functional-profile .cf-button{background:#266fe2;color:white;border:0;border-radius:8px;padding:9px 13px;cursor:pointer;font-weight:700}#coach-functional-profile .cf-button.subtle{background:#eaf0fb;color:#28548a}#coach-functional-profile .cf-button.danger{background:#fcebed;color:#ac3444}#coach-functional-profile .cf-button.link{background:transparent;color:#1b68d8;padding:3px 0}#coach-functional-profile .cf-pill{background:#e4f7ec;color:#207649;padding:4px 8px;border-radius:40px;font-size:11px}#coach-functional-profile .cf-actions{justify-content:flex-start;margin:10px 0}#coach-functional-profile .cf-field{display:grid;gap:4px;font-size:12px;font-weight:650;margin:7px 0}#coach-functional-profile input,#coach-functional-profile select,#coach-functional-profile textarea{padding:9px;border:1px solid #c7d4e3;border-radius:7px;background:#fff;color:#203b5a;font:inherit}#coach-functional-profile .cf-inline{display:flex;gap:12px;align-items:end;flex-wrap:wrap}#coach-functional-profile .cf-exercise{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e7edf6;flex-wrap:wrap}#coach-functional-profile .cf-metrics{display:grid;grid-template-columns:repeat(3,minmax(110px,1fr));gap:10px;margin:12px 0}#coach-functional-profile .cf-metric{display:grid;gap:5px;background:#ecf3ff;padding:12px;border-radius:8px}#coach-functional-profile .cf-calendar-scroll{overflow-x:auto}#coach-functional-profile .cf-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(135px,1fr));gap:8px;min-width:950px;margin:12px 0}#coach-functional-profile .cf-calendar-day{padding:10px;background:#edf1f7;border-radius:9px;display:grid;gap:8px;align-content:start;min-height:160px}#coach-functional-profile .cf-calendar-day.training{background:#f7faff;border:1px solid #cbdff8}#coach-functional-profile .cf-calendar-day strong{font-size:12px}#coach-functional-profile .cf-calendar-day select{width:100%;font-size:11px}#coach-functional-profile [hidden]{display:none!important}.cf-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;align-items:stretch;margin-bottom:15px}.cf-summary-grid>.cf-card{margin:0;min-width:0;display:flex;flex-direction:column;height:100%}.cf-summary-grid>.cf-card .cf-body{flex:1;min-width:0}.cf-summary-grid>.cf-summary-wide{grid-column:1 / -1}.cf-summary-grid>.cf-card header{min-height:45px;align-items:center}.cf-summary-grid>.cf-card .cf-program{margin-top:4px}@media(max-width:800px){.cf-summary-grid{grid-template-columns:1fr}.cf-summary-grid>.cf-summary-wide{grid-column:auto}}#coach-functional-profile .cf-directory-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 20px}#coach-functional-profile .cf-directory-head h2{font-size:24px;margin:0}#coach-functional-profile .cf-directory-search-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0 16px}#coach-functional-profile #cf-directory-search{min-width:220px;width:100%;max-width:420px}#coach-functional-profile .cf-directory-rows{display:grid;gap:9px}#coach-functional-profile button.cf-directory-row{display:flex;width:100%;align-items:center;gap:13px;text-align:left;padding:15px;background:#fff;border:1px solid #d6e2ef;border-radius:12px;color:#243d5a;cursor:pointer}#coach-functional-profile .cf-directory-row:hover{background:#f0f6ff;border-color:#91b6e9}#coach-functional-profile .cf-directory-avatar{display:grid;place-items:center;flex:0 0 41px;width:41px;height:41px;border-radius:50%;background:#e6efff;color:#2566bc;font-size:18px;font-weight:800}#coach-functional-profile .cf-directory-identification{display:grid;gap:4px;flex:1;min-width:0}#coach-functional-profile .cf-directory-identification strong{font-size:14px}#coach-functional-profile .cf-directory-identification small{font-size:12px;color:#7b8b9f}#coach-functional-profile .cf-directory-status{font-size:11px;color:#287249;background:#e5f5eb;padding:5px 9px;border-radius:30px}#coach-functional-profile .cf-directory-open{font-size:12px;color:#2e68bd;font-weight:750}#coach-functional-profile .cf-back-to-clients{margin-bottom:14px}#coach-functional-profile #cf-detail[hidden],#coach-functional-profile #cf-directory[hidden]{display:none!important}@media(max-width:650px){#coach-functional-profile .cf-directory-open{display:none}}#coach-functional-profile .cf-structure{display:grid;grid-template-columns:205px minmax(0,1fr);gap:17px;align-items:start}#coach-functional-profile .cf-client-sidebar{position:sticky;top:80px;max-height:calc(100vh - 95px);overflow-y:auto;min-width:0;padding:15px;border:1px solid #d3dfed;border-radius:12px;background:white}#coach-functional-profile .cf-client-sidebar h3{margin:0 0 12px;font-size:16px}#coach-functional-profile .cf-client-sidebar input{width:100%;font-size:12px;margin-bottom:10px}#coach-functional-profile .cf-client-list{display:grid;gap:5px;margin:10px 0}#coach-functional-profile .cf-client-list .cf-client-item{width:100%;text-align:left;background:#f4f7fc;color:#33506f;padding:10px 9px;font-size:12px;overflow-wrap:anywhere}#coach-functional-profile .cf-client-list .cf-client-item.current{background:#e5f0ff;color:#1759b6;border:1px solid #a9c8ee}#coach-functional-profile .cf-client-main{min-width:0}#coach-functional-profile .cf-analytics-stat{background:#eef5ff}@media(max-width:950px){#coach-functional-profile .cf-structure{grid-template-columns:1fr}#coach-functional-profile .cf-client-sidebar{position:static;max-height:none}#coach-functional-profile .cf-client-list{display:flex;flex-wrap:wrap}}@media(max-width:850px){#coach-functional-profile .cf-columns{grid-template-columns:1fr}#coach-functional-profile .cf-metrics{grid-template-columns:1fr 1fr}}";
 const app=el("section",host,{id:"coach-functional-profile"});
 const structure=el("div",app,{className:"cf-structure"}),sidebar=el("aside",structure,{className:"cf-client-sidebar"});
 el("h3",sidebar,{text:"My Clients"});
 const search=el("input",sidebar,{id:"cf-client-search",type:"search",placeholder:"Search clients…","aria-label":"Search connected clients"});
 search.oninput=renderSidebar;
 el("div",sidebar,{id:"cf-client-list",className:"cf-client-list"});
 btn(sidebar,"Refresh clients",roster,"subtle");
 const main=el("main",structure,{className:"cf-client-main"});
 const directory=el("section",main,{id:"cf-directory"});
 const directoryHead=el("div",directory,{className:"cf-directory-head"});const dirTitle=el("div",directoryHead);
 el("h2",dirTitle,{text:"Clients"});el("p",dirTitle,{className:"cf-muted",text:"Select a connected client to view their overview, training calendar, progress and notes."});
 btn(directoryHead,"Refresh clients",roster,"subtle");
 const searchRow=el("div",directory,{className:"cf-directory-search-row"});const dirSearch=el("input",searchRow,{id:"cf-directory-search",type:"search",placeholder:"Search by client name or email…","aria-label":"Search clients"});
 dirSearch.oninput=renderClientDirectory;el("span",searchRow,{id:"cf-directory-count",className:"cf-muted",text:"Loading client roster…"});
 el("div",directory,{id:"cf-directory-rows",className:"cf-directory-rows"});
 const detail=el("section",main,{id:"cf-detail"});detail.hidden=true;
 const back=btn(detail,"← All clients",showClientList,"subtle");back.classList.add("cf-back-to-clients");
 const head=el("div",detail,{className:"cf-head"}),title=el("div",head);el("h2",title,{id:"cf-name",text:"Client profile"});el("p",title,{id:"cf-email",text:"Connected Level Up account"});
 const controls=el("div",head);const client=el("select",controls,{id:"cf-client","aria-label":"Select athlete"});btn(controls,"Refresh data",roster,"subtle");
 const login=el("section",app,{id:"cf-login",className:"cf-card"});login.hidden=true;
 const loginCard=el("div",login,{className:"cf-body"});el("strong",loginCard,{text:"Coach session expired — reconnect once"});
 const email=field(loginCard,"Your Level Up email","input",{type:"email",autocomplete:"username"});
 const password=field(loginCard,"Password","input",{type:"password",autocomplete:"current-password"});
 btn(loginCard,"Sign in to Level Up Coach",async()=>{try{await accountApi("login",{email:email.value.trim(),password:password.value});password.value="";login.hidden=true;await roster()}catch(e){status("Sign in failed: "+e.message,true)}});
 el("p",detail,{id:"cf-status",className:"cf-muted",text:"Loading connected athlete…"});const tabs=el("div",detail,{className:"cf-tabs"});for(const [key,label]of [["overview","Overview"],["training","Training"],["progress","Weightlifting Progress"],["notes","Notes"]]){const b=btn(tabs,label,()=>{switchTab(key);if(key==="notes")notes()},"");b.id="cf-tab-"+key}
 for(const key of ["overview","training","progress","notes"])el("div",detail,{id:"cf-view-"+key});
 client.onchange=()=>{showClientDetail();void choose(client.value)};switchTab("overview");showClientList();void roster();void loadExercises();
 void import("./coach-analytics.js").then(module=>{
   analytics=module;analytics.injectCoachAnalyticsStyles();
   if(person()){renderOverview();renderProgress()}
 }).catch(e=>status("Expenditure and weight charts unavailable: "+e.message,true));
 void import("./coach-muscle-maps.js").then(module=>{
   muscleMaps=module;muscleMaps.injectCoachMuscleStyles();
   if(person())renderProgress();
 }).catch(e=>status("Muscle heat maps unavailable: "+e.message,true));
 void import("./coach-metrics.js").then(module=>{
   metricUI=module;metricUI.injectCoachMetricStyles();
   if(person()){renderOverview();renderProgress()}
 }).catch(e=>status("Workout and body metric cards unavailable: "+e.message,true));
}
async function loadExercises(){try{const m=await import("./js/workouts/exercise-library.js");await import("./js/workouts/exercise-library-expansion.js");exerciseList=arr(m.getAllExercises()).filter(x=>x.id).map(x=>({id:String(x.id),name:String(x.name||x.id)}));catalogue=new Map(exerciseList.map(x=>[x.id,x.name]))}catch(e){status("Exercise library unavailable: "+e.message,true)}}
if(document.body){mount();new MutationObserver(m=>{if(!$("coach-functional-profile")&&m.some(x=>x.addedNodes?.length))mount()}).observe(document.body,{childList:true,subtree:true})}
})();
