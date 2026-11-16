/* Level Up Coach client profile v1. One account, one profile. No demo records. */
(()=>{
const $=id=>document.getElementById(id),el=(tag,parent,props={})=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(props)){if(k==="text")n.textContent=v;else if(k==="className")n.className=v;else n.setAttribute(k,v)}parent?.append(n);return n};
const arr=x=>Array.isArray(x)?x:[],n=x=>Number(x).toLocaleString("en-CA",{maximumFractionDigits:1}),D=s=>new Date(s+"T12:00:00Z"),date=d=>d.toISOString().slice(0,10),plus=(s,i)=>date(new Date(D(s).getTime()+i*86400000)),monday=s=>plus(s,-(D(s).getUTCDay()+6)%7),today=()=>date(new Date()),short=s=>s?D(s.slice(0,10)).toLocaleDateString("en-CA",{month:"short",day:"numeric"}):"—";
const q=async(url,method="GET",body)=>{const r=await fetch(url,{method,credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||"HTTP "+r.status);e.code=r.status;throw e}return d};
let clients=[],id=null,summary=null,assignments=[],assignment=null,calendar=null,working=null,week=0,view=2,tab="overview",notes=null,locking=false;
const selected=()=>clients.find(c=>c.id===id),active=()=>assignments.filter(a=>a.status==="published");
const program=(act,pid,method="GET",body)=>q("/api/coach-programs?"+new URLSearchParams({action:act,assignmentId:pid||"",clientId:id||""}),method,body);
const details=act=>q("/api/coach-phase1?"+new URLSearchParams({action:act,clientId:id||""}));
const message=(s,bad=false)=>{if($("cu-status")){$("cu-status").textContent=s;$("cu-status").style.color=bad?"#b32f44":"#5a7089"}};
function button(parent,label,fn,klass=""){const b=el("button",parent,{type:"button",className:klass,text:label});b.onclick=fn;return b}
function card(parent,title,sub){const c=el("section",parent,{className:"cu-card"}),head=el("header",c);el("strong",head,{text:title});if(sub)el("small",head,{text:sub});return el("div",c,{className:"cu-card-content"})}
function line(parent,key,value){const div=el("div",parent,{className:"cu-line"});el("span",div,{text:key});el("b",div,{text:value==null?"—":String(value)})}
function muted(parent,s){el("p",parent,{className:"cu-muted",text:s})}
function input(parent,label,type,props={}){const wrap=el("label",parent,{className:"cu-control"});el("span",wrap,{text:label});return el(type,wrap,props)}
function selectBuilder(){return[...($("coach-program-client-plan")?.querySelectorAll("select")||[])].find(x=>[...x.options].some(o=>o.value==="My Account"||o.value==="Sarah Carter"))}
function setTab(name){tab=name;for(const x of ["overview","training","progress","notes"]){$("cu-tab-"+x)?.classList.toggle("cu-active",name===x);if($("cu-view-"+x))$("cu-view-"+x).hidden=x!==name}if(name==="training")renderCalendar()}
function openBuilder(){const b=[...document.querySelectorAll("aside button,.nav button")].find(x=>/program builder/i.test(x.textContent||""));if(b){b.click();message("Program Builder opened. Edit the workout there, then republish the assignment.");}else message("Select Program Builder from the sidebar to change the workout.",true)}
function overview(){
 const root=$("cu-view-overview");if(!root||!selected())return;root.replaceChildren();const grid=el("div",root,{className:"cu-columns"}),left=el("div",grid,{className:"cu-stack"}),right=el("div",grid,{className:"cu-stack"});
 let c=card(left,"Client Details","Level Up account");line(c,"Name",selected().name);line(c,"Email",selected().email||"Not supplied");
 line(c,"Height",summary?.profile?.heightCm!=null?n(summary.profile.heightCm)+" cm":"Not shared");
 line(c,"Current weight",summary?.weight?.latest!=null?n(summary.weight.latest)+" lb":"Not shared");
 line(c,"Age",summary?.profile?.age??"Not shared");line(c,"Last sync",summary?.backup?.syncedAt?new Date(summary.backup.syncedAt).toLocaleString("en-CA"):"Never synced");
 c=card(left,"Goal & Countdown","Shared with athlete");const goals=active().find(x=>x.goals?.goalWeightLb||x.goals?.stepGoal)?.goals;
 if(goals?.goalWeightLb)line(c,"Goal weight",goals.goalWeightLb+" lb");if(goals?.stepGoal)line(c,"Daily steps",n(goals.stepGoal));
 if(!goals?.goalWeightLb&&!goals?.stepGoal)muted(c,"No goal weight or step target assigned yet.");
 c=card(left,"Notes & Limitations","Private to coach");muted(c,"Store client notes and accommodations in the Notes tab.");button(c,"Open notes",()=>setTab("notes"),"cu-secondary");
 c=card(left,"Progress Photos","Consent-controlled");muted(c,"No shared progress photos are connected. This does not display demo images.");
 c=card(right,"Assigned Programs","Click a program to open its calendar");const programs=active().sort((a,b)=>String(b.publishedAt||"").localeCompare(String(a.publishedAt||"")));
 if(!programs.length)muted(c,"No published program assigned. A local draft is not a published program.");
 for(const p of programs){const item=el("div",c,{className:"cu-program"}),head=el("div",item,{className:"cu-between"});
 button(head,p.name||"Workout program",()=>openProgram(p.id),"cu-link");el("span",head,{className:"cu-pill",text:"Published · v"+p.version});
 muted(item,"Published "+short(p.publishedAt)+(p.goals?.stepGoal?" · "+n(p.goals.stepGoal)+" steps/day":""));
 const actions=el("div",item,{className:"cu-actions"});button(actions,"Open calendar",()=>openProgram(p.id));
 button(actions,"Edit schedule",()=>openProgram(p.id),"cu-secondary");button(actions,"Edit workout",openBuilder,"cu-secondary");button(actions,"Remove",()=>remove(p),"cu-danger")}
 c=card(right,"Updates","Synced account activity");muted(c,summary?.backup?.syncedAt?"Last cloud sync: "+new Date(summary.backup.syncedAt).toLocaleString("en-CA"):"No uploaded backup yet");
 line(c,"Latest workout",summary?.training?.lastCompletedDate?short(summary.training.lastCompletedDate):"No logged session");
 if(programs.length)line(c,"Current assignment",programs[0].name+" · v"+programs[0].version);
 c=card(right,"Training Summary","Recent completed workouts");line(c,"Completed workouts",summary?.training?.completedCount??"Not shared");
 line(c,"Last 30 days",summary?.training?.last30Days??"Not shared");button(c,"View training",()=>setTab("training"),"cu-secondary");
}
function graph(parent,raw){const items=arr(raw).filter(x=>x?.date&&Number.isFinite(+x.weight)).slice(-45);if(items.length<2)return muted(parent,"Weight chart requires two synced weigh-ins.");
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 600 180");svg.setAttribute("role","img");svg.setAttribute("aria-label","Synced weight history");svg.style.width="100%";
 const min=Math.floor(Math.min(...items.map(x=>x.weight))-1),max=Math.ceil(Math.max(...items.map(x=>x.weight))+1),span=max-min||1,a=D(items[0].date).getTime(),b=D(items.at(-1).date).getTime(),xx=x=>40+(D(x.date).getTime()-a)/(b-a||1)*540,yy=x=>12+(max-x.weight)/span*145;
 const draw=(tag,attrs)=>{const x=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))x.setAttribute(k,String(v));svg.append(x);return x};
 for(let i=0;i<4;i++)draw("line",{x1:40,x2:584,y1:12+i*48,y2:12+i*48,stroke:"#e1eaf5"});
 draw("path",{d:items.map((x,i)=>(i?"L":"M")+xx(x)+","+yy(x)).join(" "),fill:"none",stroke:"#2772e3","stroke-width":3});
 draw("circle",{cx:xx(items.at(-1)),cy:yy(items.at(-1)),r:5,fill:"#2772e3"});parent.append(svg);
}
function progress(){
 const root=$("cu-view-progress");if(!root)return;root.replaceChildren();const stats=el("div",root,{className:"cu-stats"});
 for(const [l,v]of [["Weight",summary?.weight?.latest!=null?n(summary.weight.latest)+" lb":"Not shared"],["Workouts",summary?.training?.completedCount??"Not shared"],["Last 30 days",summary?.training?.last30Days??"—"],["Latest workout",short(summary?.training?.lastCompletedDate)]]){const t=el("div",stats,{className:"cu-stat"});el("small",t,{text:l});el("strong",t,{text:String(v)})}
 graph(card(root,"Weight progress","Last 45 synced weigh-ins"),summary?.weight?.history);
 const columns=el("div",root,{className:"cu-columns"}),a=el("div",columns),b=el("div",columns);
 const workouts=card(a,"Recent sessions","Synced completed workouts"),recent=arr(summary?.training?.recentWorkouts).slice(-12).reverse();
 if(!recent.length)muted(workouts,"No completed workouts in the latest backup.");for(const x of recent)line(workouts,x.name||"Workout",short(x.date));
 const lifts=card(b,"Strength activity","Latest weighted sets"),sets=arr(summary?.training?.exerciseLatest).slice(-12).reverse();
 if(!sets.length)muted(lifts,"No recorded weighted sets available.");for(const s of sets)line(lifts,String(s.exerciseId).replace(/-/g," "),n(s.weight)+" lb × "+s.reps);
}
function notesTab(){
 const root=$("cu-view-notes");if(!root)return;root.replaceChildren();const body=card(root,"Coach Notes","Private notes stored under this athlete's Coach account");
 const note=input(body,"Notes","textarea",{id:"cu-note",rows:"5",maxlength:"6000",placeholder:"Follow-up and coaching observations"});
 const limitations=input(body,"Limitations / accommodations","textarea",{id:"cu-lim",rows:"4",maxlength:"6000",placeholder:"Only athlete-shared information"});
 note.value=notes?.content?.notes||"";limitations.value=notes?.content?.limitations||"";
 button(body,"Save notes",saveNotes);el("p",body,{id:"cu-notes-status",className:"cu-muted",text:notes?"Saved · v"+notes.version:"Not saved yet"});
}
async function loadNotes(){notes=null;const selected=id;try{const r=await details("drafts");if(selected!==id)return;notes=arr(r.drafts).find(x=>x.id==="coach-profile-notes-v1")||null;notesTab()}catch(e){if(id===selected){notesTab();$("cu-notes-status").textContent=e.message}}}
async function saveNotes(){
 try{const clientKey=id,content={kind:"private-coach-notes",notes:$("cu-note").value,limitations:$("cu-lim").value};
 const url="/api/coach-phase1?"+new URLSearchParams({action:"save",clientId:clientKey,draftId:"coach-profile-notes-v1"});
 const r=await q(url,"PUT",{name:"Private Coach Notes",content,expectedVersion:notes?.version??null});if(clientKey!==id)return;notes={version:r.version,content};notesTab();message("Notes saved to "+selected().name)}catch(e){message("Notes not saved: "+e.message,true)}
}
function defaultDays(days){const slots=days.length===2?[0,3]:days.length===3?[0,2,4]:days.length===4?[0,1,3,4]:[0,1,2,3,4,5,6];return Array.from({length:7},(_,weekday)=>{const idx=slots.indexOf(weekday);return idx>=0&&idx<days.length?{weekday,type:"workout",dayIndex:idx}:{weekday,type:"rest"}})}
async function openProgram(pid){
 assignment=pid;calendar=null;working=null;week=0;setTab("training");message("Loading published workout and calendar…");
 const result=await Promise.allSettled([program("detail",pid),program("calendar",pid)]);if(assignment!==pid)return;
 if(result[0].status==="rejected"){message("Cannot read published program: "+result[0].reason.message,true);renderCalendar();return}
 const p=result[0].value.assignment;
 calendar=result[1].status==="fulfilled"?result[1].value.schedule:null;
 working=calendar?{...calendar,days:structuredClone(calendar.days),overrides:{...(calendar.overrides||{})},plan:p}:{
  assignmentId:pid,startDate:monday(today()),weeks:4,version:null,days:defaultDays(arr(p.training?.days)),overrides:{},plan:p};
 if(result[1].status==="rejected")message("Calendar server unavailable: "+result[1].reason.message,true);renderCalendar();
}
function eventAt(day){
 if(!working)return null;const start=D(working.startDate).getTime(),t=D(day).getTime();
 if(t<start||t>=start+working.weeks*7*86400000)return null;
 return working.overrides[day]||working.days[(D(day).getUTCDay()+6)%7]||{type:"rest"};
}
function changeEvent(day,value,repeat){
 const kind=value==="rest"?{type:"rest"}:{type:"workout",dayIndex:Number(value)};
 if(repeat){const weekday=(D(day).getUTCDay()+6)%7;working.days[weekday]={weekday,...kind};for(const key of Object.keys(working.overrides)){if((D(key).getUTCDay()+6)%7===weekday)delete working.overrides[key]}}
 else working.overrides[day]=kind;
 renderCalendar();
}
function renderCalendar(){
 const root=$("cu-view-training");if(!root)return;root.replaceChildren();const head=el("div",root,{className:"cu-training-head"}),intro=el("div",head);
 el("h3",intro,{text:"Training Calendar"});muted(intro,"Edit workout and rest days for the selected published program.");
 const select=input(head,"Published program","select",{id:"cu-program"});const act=active();
 for(const p of act)el("option",select,{value:p.id,text:p.name+" · v"+p.version});
 select.value=assignment||act[0]?.id||"";select.onchange=()=>openProgram(select.value);
 if(!assignment||!working){muted(root,act.length?"Select a program above or click a program card from Overview.":"No published workout program assigned yet.");return}
 const controls=el("div",root,{className:"cu-controls"});
 const start=input(controls,"Start date","input",{type:"date"});start.value=working.startDate;start.onchange=()=>{working.startDate=start.value;working.overrides={};week=0;renderCalendar()};
 const total=input(controls,"Duration (weeks)","input",{type:"number",min:"1",max:"52"});total.value=working.weeks;total.onchange=()=>{const v=Number(total.value);if(v>=1&&v<=52&&Number.isInteger(v)){working.weeks=v;working.overrides={};week=0;renderCalendar()}};
 const viewSelect=input(controls,"View","select");for(const i of [1,2,4])el("option",viewSelect,{value:i,text:i+" week"+(i>1?"s":"")});viewSelect.value=String(view);viewSelect.onchange=()=>{view=Number(viewSelect.value);week=0;renderCalendar()};
 const repeat=el("label",controls,{className:"cu-repeat"}),check=el("input",repeat,{type:"checkbox"});check.checked=true;check.id="cu-repeat";el("span",repeat,{text:"Repeat weekday in every week"});
 const nav=el("div",root,{className:"cu-nav"});button(nav,"Previous",()=>{week=Math.max(0,week-view);renderCalendar()},"cu-secondary");button(nav,"Next",()=>{week=Math.min(Math.max(0,working.weeks-view),week+view);renderCalendar()},"cu-secondary");
 el("span",nav,{text:"Week "+(week+1)+" of "+working.weeks});
 const days=el("div",root,{className:"cu-week-container"});
 for(let w=0;w<Math.min(view,working.weeks-week);w++){
  const idx=week+w,grid=el("div",days,{className:"cu-week"});el("small",grid,{className:"cu-week-title",text:"WEEK "+(idx+1)});
  for(let d=0;d<7;d++){
   const day=plus(monday(working.startDate),idx*7+d),ev=eventAt(day),workout=ev?.type==="workout"?working.plan.training.days[ev.dayIndex]:null;
   const cell=el("div",grid,{className:"cu-day "+(workout?"cu-day-workout":"cu-day-rest")});
   el("small",cell,{text:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][(D(day).getUTCDay()+6)%7]+" · "+short(day)});
   el("strong",cell,{text:workout?.name||"Rest day"});
   if(workout)for(const ex of arr(workout.exercises).slice(0,4)){
    const item=el("div",cell,{className:"cu-exercise"});el("span",item,{text:String(ex.name||ex.id).replace(/-/g," ")});if(ex.sets)el("small",item,{text:ex.sets+" sets"});
   }
   const menu=el("select",cell,{"aria-label":"Workout for "+day});el("option",menu,{value:"rest",text:"Rest day"});
   for(let k=0;k<working.plan.training.days.length;k++)el("option",menu,{value:k,text:working.plan.training.days[k].name||"Day "+(k+1)});
   menu.value=workout?String(ev.dayIndex):"rest";menu.onchange=()=>changeEvent(day,menu.value,$("cu-repeat").checked);
  }
 }
 }
 const footer=el("div",root,{className:"cu-nav"});button(footer,"Save Calendar to Cloud",saveCalendar);
 muted(footer,"This changes future scheduling only; previously completed workouts are not changed.");
 if(!calendar)muted(root,"Not yet scheduled. Choose workout/rest days and save.");
}
async function saveCalendar(){
 if(!assignment||!working)return;message("Saving training calendar…");
 try{const result=await program("calendar",assignment,"PUT",{startDate:working.startDate,weeks:working.weeks,days:working.days,overrides:working.overrides,expectedVersion:calendar?.version??null});
 calendar=result.schedule;working={...calendar,plan:working.plan};message("Saved calendar for "+selected().name+" · version "+calendar.version);renderCalendar()}catch(e){message("Calendar was not saved: "+e.message,true)}
}
async function remove(p){if(!confirm("Remove “"+p.name+"” from this athlete's assigned programs? The program will be archived; existing logged workouts will be preserved."))return;
 try{await program("archive",p.id,"DELETE");if(assignment===p.id){assignment=null;calendar=null;working=null}message("Program archived.");await reload()}catch(e){message("Remove failed: "+e.message,true)}
}
function setClient(next){
 const c=clients.find(x=>x.id===next);if(!c)return;id=c.id;assignment=null;calendar=null;working=null;week=0;summary=null;assignments=[];
 $("cu-client").value=id;$("cu-name").textContent=c.name;$("cu-email").textContent=c.email||"Approved athlete";
 const w=selectBuilder(),v=c.isSelf?"My Account":c.id;if(w&&w.value!==v){let o=[...w.options].find(x=>x.value===v);if(!o)o=el("option",w,{value:v,text:c.name+" (Connected)"});w.value=v;w.dispatchEvent(new Event("change",{bubbles:true}))}
 void reload();
}
async function reload(){
 const chosen=id;if(!chosen)return;message("Loading linked athlete profile and programs…");
 const [a,b]=await Promise.allSettled([details("summary"),program("list",null)]);
 if(id!==chosen)return;summary=a.status==="fulfilled"?a.value:null;assignments=b.status==="fulfilled"?arr(b.value.assignments):[];
 overview();progress();notesTab();renderCalendar();
 if(a.status==="rejected"||b.status==="rejected")message([a.status==="rejected"?a.reason.message:"",b.status==="rejected"?b.reason.message:""].filter(Boolean).join(" · "),true);
 else message("Connected · cloud sync "+(summary?.backup?.syncedAt?new Date(summary.backup.syncedAt).toLocaleString("en-CA"):"not yet available"));
 void loadNotes();
}
async function loadClients(){
 try{const data=await q("/api/coach?action=clients");clients=arr(data.clients).filter(x=>x.id);const picker=$("cu-client");picker.replaceChildren();for(const c of clients)el("option",picker,{value:c.id,text:c.isSelf?"My Account — "+c.name:c.name});
 const w=selectBuilder()?.value,c=clients.find(x=>x.id===id)||clients.find(x=>x.id===w||x.isSelf&&w==="My Account")||clients.find(x=>x.isSelf)||clients[0];
 if(c)setClient(c.id);else message("No connected athletes. Add and invite a client first.",true)
 }catch(e){message("Account connection failed: "+e.message+". Reconnect only if your secure session expired.",true)}
}
function mount(){
 const host=$("coach-phase1-profile");if(!host||$("coach-unified-client"))return;
 const style=el("style",document.head);style.textContent="#coach-phase1-profile> :not(#coach-unified-client){display:none!important}#coach-phase1-profile{max-width:none!important}#coach-unified-client{display:block!important;background:#f6f9fe;padding:15px;color:#203e60}#coach-unified-client *{box-sizing:border-box}#coach-unified-client .cu-head,#coach-unified-client .cu-actions,#coach-unified-client .cu-between,#coach-unified-client .cu-nav,#coach-unified-client .cu-controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between}#coach-unified-client .cu-head h2{font-size:23px;margin:0}#coach-unified-client .cu-head p,#coach-unified-client .cu-muted{font-size:12px;color:#637d98;margin:6px 0}#coach-unified-client .cu-tabs{display:flex;gap:8px;flex-wrap:wrap;padding:15px 0;border-bottom:1px solid #dce6f2}#coach-unified-client .cu-tabs button{background:transparent;color:#5a728d;border:0;padding:11px 16px;font-weight:750}#coach-unified-client .cu-tabs .cu-active{color:#1768d5;border-bottom:3px solid #1768d5}#coach-unified-client .cu-columns{display:grid;grid-template-columns:minmax(255px,.9fr) minmax(320px,1.15fr);gap:14px}#coach-unified-client .cu-stack{display:grid;gap:13px;align-content:start}#coach-unified-client .cu-card{background:white;border:1px solid #d5e2f0;border-radius:11px;overflow:hidden;margin:14px 0}#coach-unified-client .cu-stack .cu-card{margin:0}#coach-unified-client .cu-card header{background:#f4f8ff;padding:12px 15px;display:flex;justify-content:space-between;gap:10px}#coach-unified-client .cu-card header small{font-size:11px;color:#71869c}#coach-unified-client .cu-card-content{padding:13px 16px}#coach-unified-client .cu-line{display:flex;justify-content:space-between;align-items:baseline;gap:15px;padding:8px 0;border-bottom:1px solid #eaf0f6;font-size:12px}#coach-unified-client .cu-line span{color:#667f99}#coach-unified-client .cu-line b{text-align:right}#coach-unified-client button{border:0;border-radius:8px;background:#276fe0;color:white;padding:9px 13px;font-weight:700;cursor:pointer}#coach-unified-client button.cu-secondary{background:#eaf0f9;color:#225489}#coach-unified-client button.cu-danger{background:#fbe9ec;color:#ad3642}#coach-unified-client button.cu-link{background:transparent;color:#2366ca;text-align:left;padding:3px 0}#coach-unified-client .cu-program{border:1px solid #d5e2f1;border-radius:9px;padding:12px;margin:10px 0}#coach-unified-client .cu-actions{justify-content:flex-start;gap:7px;margin-top:10px}#coach-unified-client .cu-pill{background:#e7f5ee;color:#227247;border-radius:30px;padding:3px 8px;font-size:11px}#coach-unified-client [hidden]{display:none!important}#coach-unified-client .cu-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:12px 0}#coach-unified-client .cu-stat{background:#eaf2ff;padding:12px;border-radius:9px;display:grid;gap:4px}#coach-unified-client .cu-stat small{color:#67809d}#coach-unified-client .cu-stat strong{font-size:18px}#coach-unified-client input,#coach-unified-client select,#coach-unified-client textarea{padding:9px;border:1px solid #bdcede;border-radius:8px;background:#fff;color:#284765;font:inherit}#coach-unified-client textarea{width:100%;resize:vertical}#coach-unified-client .cu-control{display:grid;gap:5px;font-size:12px;font-weight:700}#coach-unified-client .cu-training-head{display:flex;gap:14px;align-items:end;justify-content:space-between;flex-wrap:wrap}#coach-unified-client .cu-week-container{display:grid;gap:13px;overflow-x:auto}#coach-unified-client .cu-week{display:grid;grid-template-columns:repeat(7,minmax(125px,1fr));gap:8px;min-width:930px;position:relative;padding-top:23px}#coach-unified-client .cu-week-title{position:absolute;top:1px;left:2px;color:#7489a2;font-weight:750}#coach-unified-client .cu-day{border-radius:10px;background:#f0f2f6;min-height:180px;padding:8px;display:flex;flex-direction:column;gap:7px}#coach-unified-client .cu-day-workout{background:#f9fbff;border:1px solid #d7e4f3}#coach-unified-client .cu-day strong{font-size:12px}#coach-unified-client .cu-day small{font-size:11px;color:#7489a2}#coach-unified-client .cu-exercise{display:grid;background:#fff;border:1px solid #e1e8f2;border-radius:6px;padding:5px;font-size:11px;text-transform:capitalize}#coach-unified-client .cu-day select{margin-top:auto;width:100%;font-size:11px;padding:6px}#coach-unified-client .cu-controls,#coach-unified-client .cu-nav{justify-content:flex-start;margin:14px 0}#coach-unified-client .cu-repeat{display:flex;gap:6px;align-items:center;font-size:12px}@media(max-width:850px){#coach-unified-client .cu-columns{grid-template-columns:1fr}}";
 const app=el("section",host,{id:"coach-unified-client"});const h=el("div",app,{className:"cu-head"}),left=el("div",h);el("h2",left,{id:"cu-name",text:"Client Profile"});el("p",left,{id:"cu-email",text:"Approved Level Up account"});
 const controls=el("div",h);const picker=el("select",controls,{id:"cu-client","aria-label":"Connected athlete"});button(controls,"Refresh synced data",loadClients,"cu-secondary");
 el("p",app,{id:"cu-status",className:"cu-muted",text:"Checking secure Coach session…"});
 const tabs=el("div",app,{className:"cu-tabs"});for(const [key,name]of [["overview","Overview"],["training","Training"],["progress","Progress"],["notes","Notes"]]){const b=button(tabs,name,()=>setTab(key));b.id="cu-tab-"+key}
 for(const name of ["overview","training","progress","notes"])el("section",app,{id:"cu-view-"+name});
 picker.onchange=()=>setClient(picker.value);setTab("overview");void loadClients();
}
let queued=false;const mountSoon=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount()})};mountSoon();
new MutationObserver(m=>{if(!$("coach-unified-client")&&m.some(x=>x.addedNodes?.length))mountSoon()}).observe(document.body,{childList:true,subtree:true});
document.addEventListener("change",e=>{const w=selectBuilder();if(e.target!==w)return;const c=clients.find(x=>x.id===w.value||x.isSelf&&w.value==="My Account");if(c&&c.id!==id)setClient(c.id)},true);
document.addEventListener("levelup:coach-published",()=>{if(id)void reload()});
})();