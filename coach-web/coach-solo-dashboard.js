/* Level Up Coach: solo-coach attention dashboard.
 * Reads approved client IDs, published assignments and pending invitations.
 * No demo records, no multi-coach concepts and no writes to athlete histories.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const el=(tag,parent,props={})=>{const e=document.createElement(tag);for(const[k,v]of Object.entries(props)){if(k==="text")e.textContent=v;else if(k==="className")e.className=v;else e.setAttribute(k,v)}parent?.append(e);return e};
const list=x=>Array.isArray(x)?x:[];
const api=async(path,method="GET",body)=>{
 const response=await fetch(path,{method,credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||"Request failed ("+response.status+")");return result;
};
const actor=(name)=>el("span",null,{text:name});
const shortId=id=>String(id||"").slice(-12);
let clients=[],programCounts=new Map(),invitations=null,fetching=false;
function navigateToClients(clientId=null,tab="overview"){
 const buttons=[...document.querySelectorAll("aside button, nav button, .sidebar button, [data-view], [data-section]")];
 const trigger=buttons.find(b=>/^(clients(?:\s*&\s*analytics)?|client management)$/i.test((b.textContent||"").trim()));
 if(trigger)trigger.click();
 else{
  const source=$("dashboard"),target=$("clients");
  if(source)source.hidden=true;if(target)target.hidden=false;
 }
 const panel=window.LevelUpCoachClientUI;
 if(clientId){if(panel?.openAthlete(clientId,tab))return;const status=$("solo-dashboard-status");if(status)status.textContent="Open Clients & Analytics from the sidebar and select the athlete."}
 else if(panel?.showClientList)panel.showClientList();
}
function card(parent,title,description){const section=el("section",parent,{className:"solo-card"}),header=el("div",section,{className:"solo-card-header"});el("strong",header,{text:title});if(description)el("small",header,{text:description});return el("div",section,{className:"solo-card-body"})}
function action(parent,label,onClick,klass=""){const b=el("button",parent,{type:"button",className:"solo-button "+klass,text:label});b.onclick=onClick;return b}
function label(c){return c.isSelf?"My Account — "+c.name:c.name}
function secondary(c){return c.email||"Account ID · "+shortId(c.id)}
function render(){
 const host=$("solo-dashboard-content");if(!host)return;host.replaceChildren();
 const pending=invitations===null?null:invitations.filter(i=>i.status==="pending"&&(!i.expiresAt||i.expiresAt>new Date().toISOString()));
 const needs=clients.filter(c=>programCounts.get(c.id)?.state==="known"&&programCounts.get(c.id).count===0);
 const linked=clients.filter(c=>programCounts.get(c.id)?.state==="known");
 const stats=el("div",host,{className:"solo-stats"});
 for(const [title,value,detail]of [
  ["Connected athletes",clients.length,"Includes My Account"],
  ["Awaiting connection",pending===null?"Unavailable":pending.length,"Pending invited athletes"],
  ["Need programming",needs.length,linked.length+" profiles checked"],
  ["Due check-ins","Not available","No reliable due-check-in feed yet"]
 ]){
  const section=el("div",stats,{className:"solo-stat"});el("small",section,{text:title});el("strong",section,{text:String(value)});el("span",section,{text:detail});
 }
 const layout=el("div",host,{className:"solo-columns"});
 let container=card(layout,"Needs programming","Connected athletes with no published training program");
 if(!needs.length)el("p",container,{className:"solo-muted",text:linked.length?"No unprogrammed athletes found among checked accounts.":"Programming states are loading or unavailable."});
 for(const c of needs){const item=el("div",container,{className:"solo-action-row"}),id=el("div",item);el("strong",id,{text:label(c)});el("small",id,{text:secondary(c)});action(item,"Create program",()=>navigateToClients(c.id,"training"))}
 container=card(layout,"Pending athlete links","Invitations are not counted as connected athletes");
 if(pending===null)el("p",container,{className:"solo-muted",text:"Pending invitation status is unavailable from the Coach API."});
 else if(!pending.length)el("p",container,{className:"solo-muted",text:"No pending invitations in Coach."});
 else for(const invite of pending.slice(0,15)){
  const row=el("div",container,{className:"solo-action-row"}),identity=el("div",row);
  el("strong",identity,{text:[invite.firstName,invite.lastName].filter(Boolean).join(" ")||invite.email||"Pending athlete"});
  el("small",identity,{text:(invite.email||"")+" · Expires "+(invite.expiresAt?.slice(0,10)||"unknown")});
 }
 const utilities=card(layout,"Coach actions","One coach account · all athlete histories stay in Level Up Cloud");
 action(utilities,"View all clients",()=>navigateToClients(), "primary");
 action(utilities,"Invite an athlete",()=>{const x=$("solo-invite-form");x.hidden=!x.hidden});
 const checkin=card(layout,"Check-ins needing attention","Show only confirmed due dates");
 el("p",checkin,{className:"solo-muted",text:"The current Coach API does not expose a verified due-check-in feed. No fabricated reminders or overdue counts are shown."});
 if(clients.length){const directory=card(host,"Recent connected athletes","Select a profile to review its actual program and metrics");for(const c of clients.slice(0,12)){
  const row=el("div",directory,{className:"solo-action-row"}),identity=el("div",row);
  el("strong",identity,{text:label(c)});el("small",identity,{text:secondary(c)});
  const count=programCounts.get(c.id);el("span",row,{className:"solo-chip",text:count?.state==="known"?(count.count?count.count+" program"+(count.count===1?"":"s"):"Needs programming"):"Program status unavailable"});
  action(row,"Open profile",()=>navigateToClients(c.id));
 }}
}
async function refresh(){
 if(fetching)return;fetching=true;const status=$("solo-dashboard-status");status.textContent="Loading connected athletes and attention items…";
 try{
  const roster=await api("/api/coach?action=clients");clients=list(roster.clients).filter(c=>c?.id);
  render();
  const inviteResult=api("/api/coach?action=invitations").then(r=>list(r.invitations)).catch(()=>null);
  let next=0;
  async function worker(){while(next<clients.length){const c=clients[next++];try{
   const result=await api("/api/coach-programs?"+new URLSearchParams({action:"list",clientId:c.id}));
   const count=list(result.assignments).filter(p=>p.clientId===c.id&&p.status==="published").length;programCounts.set(c.id,{state:"known",count});
  }catch{programCounts.set(c.id,{state:"error",count:0})}render()}}
  await Promise.all([inviteResult.then(r=>{invitations=r;render()}),...Array.from({length:Math.min(clients.length,4)},()=>worker())]);
  status.textContent="Connected data refreshed. Program counts reflect published assignments only.";
 }catch(e){status.textContent="Unable to load approved athletes: "+e.message;status.style.color="#a43842"}
 finally{fetching=false}
}
async function sendInvite(event){
 event.preventDefault();const form=$("solo-invite-form"),status=$("solo-dashboard-status");const data={
  firstName:form.querySelector('[name="firstName"]').value.trim(),
  lastName:form.querySelector('[name="lastName"]').value.trim(),
  email:form.querySelector('[name="email"]').value.trim(),coachingType:"online"};
 if(!data.firstName||!data.lastName||!data.email)return;
 if(!confirm("Send a Level Up coaching invitation to "+data.email+"?"))return;
 status.textContent="Sending invitation…";
 try{await api("/api/coach?action=invite","POST",data);form.reset();form.hidden=true;status.textContent="Invitation request accepted; refresh to see delivery status.";await refresh()}catch(e){status.textContent="Invitation was not sent: "+e.message;status.style.color="#a43842"}
}
function openInvite(){
 const form=$("solo-invite-form");if(!form)return;
 const buttons=[...document.querySelectorAll("aside button, nav button, .sidebar button")];
 const dashboardButton=buttons.find(b=>/^dashboard$/i.test((b.textContent||"").trim()));
 if(dashboardButton)dashboardButton.click();
 else if($("dashboard"))$("dashboard").hidden=false;
 form.hidden=false;
 form.querySelector('[name="firstName"]')?.focus();
}
function mount(){
 const dashboard=$("dashboard");if(!dashboard||$("solo-coach-dashboard"))return;
 const style=el("style",document.head,{id:"solo-dashboard-style"});
 style.textContent="#dashboard>#solo-coach-dashboard~*{display:none!important}#solo-coach-dashboard{padding:16px;background:#f6f9fe;color:#243c5b}#solo-coach-dashboard .solo-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px}#solo-coach-dashboard h2{font-size:23px;margin:0}#solo-coach-dashboard .solo-muted{color:#71839b;font-size:12px}#solo-coach-dashboard .solo-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:15px}#solo-coach-dashboard .solo-stat{background:white;border:1px solid #d9e4f2;border-radius:11px;padding:14px;display:grid;gap:8px}#solo-coach-dashboard .solo-stat strong{font-size:21px}#solo-coach-dashboard .solo-stat small,#solo-coach-dashboard .solo-stat span{font-size:11px;color:#6e83a0}#solo-coach-dashboard .solo-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}#solo-coach-dashboard .solo-card{background:#fff;border:1px solid #dae4f1;border-radius:11px;overflow:hidden;margin-bottom:14px}#solo-coach-dashboard .solo-card-header{display:grid;gap:4px;background:#f2f7fd;padding:13px 15px;border-bottom:1px solid #e3eaf3}#solo-coach-dashboard .solo-card-header small{color:#73879e}#solo-coach-dashboard .solo-card-body{padding:13px 15px;display:grid;gap:9px}#solo-coach-dashboard .solo-action-row{display:flex;align-items:center;gap:12px;justify-content:space-between;padding:10px 0;border-bottom:1px solid #edf2f8;flex-wrap:wrap}#solo-coach-dashboard .solo-action-row div{display:grid;gap:4px;min-width:160px;flex:1}#solo-coach-dashboard .solo-action-row small{color:#7588a0;font-size:11px;overflow-wrap:anywhere}#solo-coach-dashboard .solo-chip{background:#eef4fb;padding:5px 8px;border-radius:15px;font-size:11px}#solo-coach-dashboard .solo-button{border:1px solid #cbdaf0;color:#245b99;background:#edf4ff;border-radius:8px;padding:9px 12px;font-weight:700;cursor:pointer}#solo-coach-dashboard .solo-button.primary{background:#266cdd;color:white}#solo-coach-dashboard .solo-invite{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:16px;background:white;border:1px solid #dae4ef;border-radius:10px;margin-bottom:14px}#solo-coach-dashboard .solo-invite label{display:grid;gap:4px;font-size:11px;color:#586e89}#solo-coach-dashboard .solo-invite input{min-width:0;padding:9px;border:1px solid #bed0e7;border-radius:7px}#solo-coach-dashboard [hidden]{display:none!important}@media(max-width:880px){#solo-coach-dashboard .solo-stats{grid-template-columns:repeat(2,minmax(0,1fr))}#solo-coach-dashboard .solo-columns{grid-template-columns:1fr}}@media(max-width:620px){#solo-coach-dashboard .solo-invite{grid-template-columns:1fr}}";
 const root=el("section",dashboard,{id:"solo-coach-dashboard"});dashboard.prepend(root);
 const heading=el("div",root,{className:"solo-heading"}),left=el("div",heading);el("h2",left,{text:"Solo Coach Dashboard"});el("p",left,{className:"solo-muted",text:"Athlete attention and published programs · Level Up"});
 action(heading,"Refresh",refresh);el("p",root,{id:"solo-dashboard-status",className:"solo-muted",role:"status",text:"Checking Coach connection…"});
 const invite=el("form",root,{id:"solo-invite-form",className:"solo-invite"});invite.hidden=true;
 for(const [field,label,type]of [["firstName","First name","text"],["lastName","Last name","text"],["email","Email address","email"]]){
  const wrap=el("label",invite);el("span",wrap,{text:label});el("input",wrap,{name:field,type,required:"required",maxlength:"254"})}
 const submit=el("button",invite,{type:"submit",className:"solo-button primary",text:"Send invitation"});invite.onsubmit=sendInvite;
 window.LevelUpCoachSoloDashboard={openInvite,refresh};
 el("div",root,{id:"solo-dashboard-content"});void refresh();
}
if(document.body)mount();
})();
