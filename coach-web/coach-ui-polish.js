/* Everfit-inspired styling and unified client-roster enhancement.
 * Preserve all existing Coach dashboard features, athlete data and detail views.
 */
(()=>{
 "use strict";
 if(document.getElementById("levelup-coach-polish-v1"))return;
 const style=document.createElement("style");
 style.id="levelup-coach-polish-v1";
 style.textContent=`
 /* Shared Level Up Coach tokens */
 #clients,#dashboard{
  --luc-blue:#245ff1;--luc-blue-hover:#174ecf;--luc-ink:#203650;
  --luc-muted:#6e839f;--luc-border:#e3eaf4;--luc-soft:#f6f8fc;
  --luc-shadow:0 3px 14px rgba(34,58,103,.055);
 }
 /* Raise visual quality of the original dashboard without replacing content */
 #dashboard button:not([class*="nav"]):not([class*="tab"]),
 #clients button.cf-button,
 #clients .cf-tabs button,
 #clients .cf-client-sidebar button,
 #clients button.cf-directory-row {
  font-family:inherit;
  font-weight:650;
  border-radius:12px;
  letter-spacing:-.01em;
  transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease,transform .15s ease;
 }
 #dashboard button:not([class*="nav"]):not([class*="tab"]):focus-visible,
 #clients button:focus-visible,
 #clients input:focus-visible,
 #clients select:focus-visible,
 #clients textarea:focus-visible{
  outline:3px solid rgba(46,117,232,.32);
  outline-offset:2px;
 }
 #dashboard button:not([class*="nav"]):not([class*="tab"]):not(:disabled):hover,
 #clients button.cf-button:not(:disabled):hover,
 #clients button.cf-directory-row:not(:disabled):hover{
  transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(45,93,155,.12);
 }
 #clients button.cf-button.cf-primary,#clients .cf-client-sidebar button.cf-primary{
  border:1px solid #235de5;
  background:linear-gradient(135deg,#286bf4,#1d54da);
  color:#fff;
  border-radius:12px;
  padding:11px 16px;
  box-shadow:0 3px 9px rgba(40,103,224,.15);
 }
 #clients button.cf-button.cf-primary:hover,#clients .cf-client-sidebar button.cf-primary:hover{
  background:#184bbf;color:#fff;
 }
 #clients button.cf-button.subtle,
 #clients .cf-client-sidebar button.subtle,
 #clients .cf-tabs button{
  border-radius:11px;
  background:#edf3fd;
  color:#285b97;
  border:1px solid #dbe6f5;
 }
 #clients button.cf-button.danger{background:#fff1f3;color:#ae3545;border:1px solid #ffe0e6}
 #clients button.cf-button.link{border:0;background:transparent;color:var(--luc-blue);box-shadow:none}
 #clients .cf-tabs{gap:9px;border:0;flex-wrap:wrap}
 #clients .cf-tabs button{padding:11px 15px;border-radius:999px}
 #clients .cf-tabs button.active{
  background:var(--luc-blue);color:white;border-color:var(--luc-blue);
  box-shadow:0 3px 10px rgba(39,97,212,.17);
 }
 #clients #cf-directory,#clients #cf-detail{min-width:0}
 #clients .cf-directory-head{background:transparent;align-items:center}
 #clients .cf-directory-head h2{letter-spacing:-.025em;font-weight:750}
 #clients .cf-directory-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
 #clients button.cf-directory-row{
  border:1px solid var(--luc-border);
  border-radius:14px;
  padding:15px 16px;
  background:#fff;
  text-align:left;
 }
 #clients button.cf-directory-row:hover{background:#f7faff;border-color:#9fc3f1}
 #clients .cf-directory-avatar{border-radius:12px;background:#e7eeff;color:#1f5adb}
 #clients .cf-directory-status{border-radius:999px;background:#eaf8ef;color:#26724e}
 #clients .cf-card{border-radius:16px;border:1px solid var(--luc-border);box-shadow:var(--luc-shadow)}
 #clients .cf-card header{background:#fafcff}
 #clients .cf-program,#clients .cf-workout-day{border-radius:13px}
 #clients .cf-summary-grid{gap:16px}
 #clients .cf-summary-grid>.cf-card{min-height:0}
 #clients .cf-client-sidebar{border-radius:15px;box-shadow:var(--luc-shadow)}
 #clients .cf-client-sidebar button.cf-client-item{
  display:block;width:100%;text-align:left;border-radius:11px;
  background:transparent;color:#31506f;box-shadow:none;
 }
 #clients .cf-client-sidebar button.cf-client-item.current{
  background:#e8f0ff;color:#1f5ad4;border:1px solid #bcd0fa;
 }
 #clients .cf-client-sidebar button.cf-client-item small{
  display:block;margin-top:3px;color:#7489a3;font-weight:450;
  font-size:10px;overflow-wrap:anywhere;
 }
 #clients .cf-directory-identification small{overflow-wrap:anywhere}
 #clients .cf-client-sidebar input,#clients #cf-directory-search,
 #clients #cf-client,#clients .cf-detail-controls select,
 #clients .cf-field input,#clients .cf-field select,#clients .cf-field textarea{
  border-radius:11px;border:1px solid #cfdbeb;background:#fff;
 }
 #clients .cf-invite-form{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;
  padding:18px;margin:12px 0 18px;background:#fff;
  border:1px solid var(--luc-border);border-radius:16px;box-shadow:var(--luc-shadow);
 }
 #clients .cf-invite-form .cf-between,
 #clients .cf-invite-form>p,
 #clients .cf-invite-form>button{grid-column:1 / -1}
 #clients .cf-invite-form[hidden]{display:none!important}
 #clients .cf-invite-form .cf-between strong{font-size:16px}
 #clients .cf-invite-form button[type="submit"]{justify-self:start}
 /* Compact clickable metrics, softer buttons and consistent charts */
 #clients .cf-metric-section{border-radius:16px;box-shadow:var(--luc-shadow)}
 #clients button.cf-body-metric{
  border-radius:14px;border:1px solid #e1e8f1;
  background:linear-gradient(180deg,#fff 0%,#fbfcff 100%);
  padding:16px;box-shadow:0 1px 4px rgba(29,60,105,.03);
 }
 #clients button.cf-body-metric:hover{
  transform:translateY(-2px);box-shadow:0 8px 24px rgba(35,75,126,.10);
  border-color:#9fbbf2;
 }
 #clients button.cf-body-metric:focus-visible{outline:3px solid rgba(46,117,232,.32)}
 #clients .cf-highlight-tile{border-radius:13px;background:#f7faff}
 #clients .cf-body-metric-title>span{border-radius:999px;padding:5px 9px;background:#e8f0ff;font-weight:650}
 #clients .cf-detail-controls button,#clients .cf-detail-title button{
  border-radius:999px;background:#edf3ff;color:#26569b;
  padding:9px 15px;border:1px solid #dce7f7;
 }
 #clients .cf-detail-metric{border-radius:17px}
 #clients .cf-heatmap-scroll,#clients .cf-anatomy-card{border-radius:14px}
 @media(max-width:760px){
  #clients .cf-invite-form{grid-template-columns:1fr}
  #clients .cf-directory-actions{width:100%}
  #clients .cf-directory-actions button{flex:1}
  #clients .cf-body-metric-grid{grid-template-columns:1fr}
 }
 @media(prefers-reduced-motion:reduce){
  #dashboard button,#clients button{transition:none!important;transform:none!important}
 }
 `;
 document.head.append(style);
})();


/* The roster supplements existing client detail views without creating client accounts
   or exposing training data for invitations that have not been accepted. */
(()=>{
 "use strict";
 if(window.__lucUnifiedRosterInstalled)return;
 window.__lucUnifiedRosterInstalled=true;
 let records=[],current="All",busy=false,lastRefresh=0,root=null,queued=false;
 const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const api=async(action,data)=>{
  const url="/api/coach-roster"+(action?"?action="+encodeURIComponent(action):"");
  const res=await fetch(url,{method:data?"POST":"GET",credentials:"same-origin",
   headers:{"Accept":"application/json",...(data?{"Content-Type":"application/json"}:{})},
   ...(data?{body:JSON.stringify(data)}:{})});
  const result=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(result.error||"Coach roster request failed");
  return result;
 };
 const className=status=>status==="Connected"?"connected":status==="Pending"?"pending":"offline";
 function renderList(){
  if(!root)return;
  const input=root.querySelector("[data-luc-roster-search]");
  const query=String(input?.value||"").trim().toLowerCase();
  const filtered=records.filter(x=>(current==="All"||x.status===current)&&
   [x.name,x.email,x.contactEmail].some(s=>String(s||"").toLowerCase().includes(query)));
  const table=root.querySelector("[data-luc-roster-table]");
  if(!table)return;
  if(!filtered.length){table.innerHTML='<p class="luc-roster-empty">No clients match this filter.</p>';return}
  table.innerHTML='<div class="luc-roster-head"><span>Client</span><span>Status</span><span>Coaching</span><span>Actions</span></div>'+
   filtered.map(x=>'<div class="luc-roster-item" data-luc-client="'+esc(x.id)+'">'+
    '<div class="luc-roster-person"><strong>'+esc(x.name)+'</strong><small>'+esc(x.contactEmail||x.email||"")+'</small></div>'+
    '<span><span class="luc-roster-state '+className(x.status)+'">'+esc(x.status)+'</span></span>'+
    '<span class="luc-roster-type">'+esc((x.coachingType||"online").replace(/_/g," ").replace(/\b\w/g,s=>s.toUpperCase()))+'</span>'+
    '<span class="luc-roster-actions">'+(x.canRevoke?
     '<button type="button" class="luc-roster-revoke" data-luc-revoke="'+esc(x.invitationId)+'">Revoke Invitation</button>':
     x.linked?'<button type="button" data-luc-open="'+esc(x.clientId)+'">Open Profile</button>':
     '<span class="luc-roster-muted">Not connected</span>')+'</span></div>').join("");
 }
 function setCounts(){
  if(!root)return;
  for(const button of root.querySelectorAll("[data-luc-status]")){
   const status=button.dataset.lucStatus;
   const count=status==="All"?records.length:records.filter(x=>x.status===status).length;
   button.textContent=status+" ("+count+")";
   button.setAttribute("aria-pressed",String(status===current));
  }
 }
 function message(value,error=false){
  const el=root?.querySelector("[data-luc-message]");
  if(el){el.textContent=value;el.classList.toggle("error",error)}
 }
 async function refresh(force=false){
  if(!root||busy)return;
  if(!force&&Date.now()-lastRefresh<12000)return;
  busy=true;
  try{
   const result=await api("",null);
   records=Array.isArray(result.clients)?result.clients:[];
   lastRefresh=Date.now();
   setCounts();renderList();message("");
  }catch(e){message(e.message,true)}
  finally{busy=false}
 }
 function openProfile(id){
  const user=records.find(r=>r.clientId===id&&r.linked);
  if(!user)return;
  const original=[...document.querySelectorAll("#cf-directory button.cf-directory-row,#clients button.cf-directory-row")];
  const found=original.find(b=>b.dataset?.clientId===id||b.dataset?.id===id)||
   original.find(b=>b.textContent?.toLowerCase().includes(String(user.name||"").toLowerCase()));
  if(found){found.click();document.querySelector("#cf-detail")?.scrollIntoView({block:"start",behavior:"smooth"})}
  else message("This athlete is connected. Select their profile in the original client details below.");
 }
 async function revoke(id,button){
  const target=records.find(x=>x.invitationId===id&&x.canRevoke);
  if(!target)return;
  if(!confirm("Revoke the pending invitation for "+target.name+"? Their invitation link will stop working. Their Level Up account and training data will not be deleted."))return;
  button.disabled=true;
  try{
   const result=await api("revoke",{invitationId:id});
   if(!result.ok)throw new Error("Invitation was already revoked or is no longer pending.");
   await refresh(true);
   message("Invitation revoked. "+target.name+" is now Offline.");
  }catch(e){message(e.message,true);button.disabled=false}
 }
 function mount(){
  const host=document.getElementById("clients");
  if(!host||!host.isConnected)return;
  if(root?.isConnected){void refresh();return}
  const directory=host.querySelector("#cf-directory")||host;
  root=document.createElement("section");
  root.id="luc-unified-roster";
  root.className="luc-unified-roster";
  root.innerHTML='<div class="luc-roster-top"><div><h2>Clients</h2><p>Connected athletes and coaching invitations in one place</p></div>'+
   '<input type="search" aria-label="Search clients" placeholder="Search clients" data-luc-roster-search></div>'+
   '<div class="luc-roster-filters" aria-label="Filter clients by connection status">'+
   ["All","Connected","Pending","Offline"].map(s=>'<button type="button" data-luc-status="'+s+'" aria-pressed="false">'+s+'</button>').join("")+'</div>'+
   '<div data-luc-roster-table><p class="luc-roster-empty">Loading your client roster…</p></div>'+
   '<p class="luc-roster-message" data-luc-message role="status" aria-live="polite"></p>';
  directory.prepend(root);
  root.addEventListener("input",event=>{if(event.target.matches("[data-luc-roster-search]"))renderList()});
  root.addEventListener("click",event=>{
   const filter=event.target.closest("[data-luc-status]");
   if(filter){current=filter.dataset.lucStatus;setCounts();renderList();return}
   const revokeBtn=event.target.closest("[data-luc-revoke]");
   if(revokeBtn){void revoke(revokeBtn.dataset.lucRevoke,revokeBtn);return}
   const open=event.target.closest("[data-luc-open]");
   if(open)openProfile(open.dataset.lucOpen);
  });
  setCounts();void refresh(true);
 }
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount()})});
 observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refresh(true)});
 window.addEventListener("focus",()=>void refresh(true));
 window.addEventListener("levelup:coach-roster-refresh",()=>void refresh(true));
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
 const style=document.createElement("style");
 style.textContent=`
 #luc-unified-roster{background:white;border:1px solid #e1e8f1;border-radius:16px;padding:18px;margin:0 0 18px;box-shadow:0 3px 14px #223a670c}
 .luc-roster-top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
 .luc-roster-top h2{margin:0;font-size:21px;font-weight:800}
 .luc-roster-top p{margin:3px 0;color:#6e839f;font-size:12px}
 .luc-roster-top input{padding:10px 12px;border:1px solid #cbd6e7;border-radius:9px;min-width:190px}
 .luc-roster-filters{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0}
 .luc-roster-filters button{background:#f4f7fc;color:#345271;border:1px solid #e1e8f1;border-radius:30px;padding:7px 11px;font-weight:650}
 .luc-roster-filters button[aria-pressed="true"]{background:#245ff1;color:white;border-color:#245ff1}
 .luc-roster-head,.luc-roster-item{display:grid;grid-template-columns:minmax(150px,2fr) minmax(95px,.8fr) minmax(95px,.8fr) minmax(130px,1fr);gap:12px;align-items:center;padding:12px;border-bottom:1px solid #eaf0f7}
 .luc-roster-head{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#7b8a9f;background:#f8fafd}
 .luc-roster-item{min-height:65px}
 .luc-roster-person strong,.luc-roster-person small{display:block}
 .luc-roster-person small{font-size:12px;color:#7889a0;overflow-wrap:anywhere}
 .luc-roster-state{display:inline-block;border-radius:30px;padding:4px 9px;font-size:12px;font-weight:750}
 .luc-roster-state.connected{background:#e4f8eb;color:#237346}
 .luc-roster-state.pending{background:#fff3d5;color:#946007}
 .luc-roster-state.offline{background:#eff2f6;color:#66758a}
 .luc-roster-type{color:#596c80;font-size:12px}
 .luc-roster-actions button{border:1px solid #d8e4f3;border-radius:8px;padding:7px 10px;background:#f6faff;color:#2455a0;font-weight:700}
 .luc-roster-actions button.luc-roster-revoke{background:#fff1f3;border-color:#ffccd4;color:#ab3447}
 .luc-roster-actions button:disabled{opacity:.5;cursor:default}
 .luc-roster-muted,.luc-roster-empty{color:#8090a4;font-size:12px}
 .luc-roster-message{font-size:12px;color:#267349;min-height:18px}.luc-roster-message.error{color:#af3447}
 @media(max-width:700px){.luc-roster-head{display:none}.luc-roster-item{grid-template-columns:1fr 1fr;gap:9px}.luc-roster-item>div:first-child{grid-column:1/-1}.luc-roster-top input{width:100%}}
 `;
 document.head.append(style);
})();
