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


/* A single Everfit-inspired client directory; the original client data/detail
   panels remain mounted so connected profiles and existing features are preserved. */
(()=>{
 "use strict";
 if(window.__lucEverfitDirectoryV2)return;
 window.__lucEverfitDirectoryV2=true;
 const $=s=>document.querySelector(s);
 let root=null,clients=[],busy=false,updated=0,filter="All",category="All",sort="name",queued=false;
 const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[k]));
 const clean=s=>String(s??"").trim();
 const api=async(action="",payload)=>{
  const r=await fetch("/api/coach-roster"+(action?"?action="+encodeURIComponent(action):""),{
   method:payload?"POST":"GET",credentials:"same-origin",
   headers:{Accept:"application/json",...(payload?{"Content-Type":"application/json"}:{})},
   ...(payload?{body:JSON.stringify(payload)}:{})
  });
  const json=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(json.error||"Unable to load client directory");
  return json;
 };
 const statusCls=s=>s==="Connected"?"connected":s==="Pending"?"pending":"offline";
 const nameInitials=s=>clean(s).split(/\s+/).slice(0,2).map(x=>x.slice(0,1)).join("").toUpperCase()||"LU";
 const date=s=>{if(!s)return "—";const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"—"};
 const activity=s=>{
  if(!s)return "—";
  const delta=Date.now()-Date.parse(s);
  if(!Number.isFinite(delta)||delta<0)return date(s);
  if(delta<3600000)return Math.max(1,Math.floor(delta/60000))+"m";
  if(delta<86400000)return Math.floor(delta/3600000)+"h";
  if(delta<604800000)return Math.floor(delta/86400000)+"d";
  return date(s);
 };
 function message(s,error=false){
  const el=root?.querySelector("[data-luc-message]");
  if(el){el.textContent=s;el.classList.toggle("error",error)}
 }
 function visible(){
  const term=clean(root?.querySelector("[data-luc-search]")?.value).toLowerCase();
  const list=clients.filter(x=>(filter==="All"||x.status===filter)&&
   (category==="All"||clean(x.coachingType).toLowerCase()===category)&&
   [x.name,x.email,x.contactEmail].some(v=>String(v||"").toLowerCase().includes(term)));
  list.sort((a,b)=>sort==="recent"?
   (Date.parse(b.lastActiveAt||b.invitedAt||"")||0)-(Date.parse(a.lastActiveAt||a.invitedAt||"")||0)
   :String(a.name||"").localeCompare(String(b.name||"")));
  return list;
 }
 function counts(){
  if(!root)return;
  const title=root.querySelector("[data-luc-title]");
  if(title)title.textContent="All Clients ("+clients.length+")";
  const status=root.querySelector("[data-luc-filter-status]");
  if(status){for(const option of status.options)option.textContent=
   option.value+" ("+(option.value==="All"?clients.length:clients.filter(x=>x.status===option.value).length)+")";}
 }
 function paint(){
  if(!root)return;
  counts();
  const tbody=root.querySelector("[data-luc-rows]");
  if(!tbody)return;
  const rows=visible();
  if(!rows.length){tbody.innerHTML='<tr><td class="luc-empty" colspan="6">No clients match your filters.</td></tr>';return}
  tbody.innerHTML=rows.map(x=>{
   const pending=!!x.canRevoke;
   const linked=!!x.linked;
   const reason=x.status==="Offline"&&x.invitationStatus?
    (x.invitationStatus==="expired"?"Invitation expired":x.invitationStatus==="revoked"?"Invitation revoked":x.invitationStatus==="accepted"?"Previously connected":"Not invited"):"";
   const action=pending?'<button type="button" class="luc-revoke" data-revoke="'+escapeHTML(x.invitationId)+'">Revoke</button>':
    linked?'<button type="button" data-open="'+escapeHTML(x.clientId)+'">View profile</button>':
    '<button type="button" data-reinvite="'+escapeHTML(x.id)+'">Invite again</button>';
   const title=linked?' data-open="'+escapeHTML(x.clientId)+'"':'';
   return '<tr class="luc-client-row" data-client-key="'+escapeHTML(x.id)+'">'+
    '<td><div class="luc-person"><span class="luc-avatar">'+escapeHTML(nameInitials(x.name))+'</span>'+
    '<span class="luc-person-info"><strong'+title+'>'+escapeHTML(x.name||"Client")+'</strong><small>'+escapeHTML(x.contactEmail||x.email||"")+'</small></span></div></td>'+
    '<td><span class="luc-state '+statusCls(x.status)+'">'+escapeHTML(x.status)+'</span>'+ (reason?'<small class="luc-reason">'+escapeHTML(reason)+'</small>':"")+'</td>'+
    '<td>'+escapeHTML((x.coachingType||"online").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()))+'</td>'+
    '<td>'+escapeHTML(linked?activity(x.lastActiveAt):"—")+'</td>'+
    '<td>'+escapeHTML(date(x.invitedAt))+'</td>'+
    '<td class="luc-actions">'+action+'</td></tr>';
  }).join("");
 }
 async function refresh(force=false){
  if(!root||busy||(!force&&Date.now()-updated<9000))return;
  busy=true;
  try{
   const data=await api();
   if(!Array.isArray(data.clients))throw Error("Invalid client roster response");
   clients=data.clients;
   updated=Date.now();
   paint();
   message("");
  }catch(e){message(e.message,true)}
  finally{busy=false}
 }
 function originalProfile(clientId,name){
  const buttons=[...document.querySelectorAll("#cf-directory button.cf-directory-row,#clients button.cf-directory-row,#clients .cf-client-sidebar button.cf-client-item")];
  return buttons.find(b=>b.dataset?.clientId===clientId||b.dataset?.id===clientId)||
   buttons.find(b=>b.textContent?.toLowerCase().includes(clean(name).toLowerCase()));
 }
 function showProfile(id){
  const x=clients.find(c=>c.clientId===id&&c.linked);
  if(!x)return;
  const button=originalProfile(id,x.name);
  if(button){
   button.click();
   const panel=$("#cf-detail");
   panel?.scrollIntoView({behavior:"smooth",block:"start"});
   message("");
  }else message("Client is connected. Select their name in the client profile selector to open the full profile.",true);
 }
 function startInvite(x){
  // Reuse the original Level Up invitation form instead of duplicating
  // send-invite rules, validation or delivery logic.
  const invite=[...document.querySelectorAll("#clients button")].find(b=>/invite client/i.test(b.textContent||""));
  if(invite)invite.click();
  const form=$("#clients .cf-invite-form");
  if(!form){message("Use Add Client to send another invitation.");return}
  form.hidden=false;
  const fields=[...form.querySelectorAll("input")];
  const byName=name=>form.querySelector('input[name="'+name+'"]');
  const first=clean(x.name).split(/\s+/)[0]||"";
  const last=clean(x.name).split(/\s+/).slice(1).join(" ");
  const set=(field,value)=>{if(field&&value){field.value=value;field.dispatchEvent(new Event("input",{bubbles:true}))}};
  set(byName("firstName")||fields.find(i=>/first/i.test(i.name||i.id||i.placeholder)),first);
  set(byName("lastName")||fields.find(i=>/last/i.test(i.name||i.id||i.placeholder)),last);
  set(byName("email")||fields.find(i=>i.type==="email"),x.contactEmail||x.email);
  form.scrollIntoView({behavior:"smooth",block:"center"});
  message("Review the invitation fields and send a new invite.");
 }
 async function revoke(invitationId,button){
  const x=clients.find(c=>c.invitationId===invitationId&&c.canRevoke);
  if(!x||!confirm("Revoke "+x.name+"'s invitation? The invitation link will no longer work, but their Level Up account and history will be unaffected."))return;
  button.disabled=true;
  try{
   const result=await api("revoke",{invitationId});
   if(!result.ok)throw Error("This invitation is no longer pending.");
   await refresh(true);
   message(x.name+"'s invitation has been revoked.");
  }catch(e){message(e.message,true)}
  finally{button.disabled=false}
 }
 function mount(){
  const clientsSection=$("#clients");
  if(!clientsSection||!clientsSection.isConnected)return;
  if(root?.isConnected){void refresh();return}
  const original=$("#cf-directory");
  const host=original||clientsSection;
  root=document.createElement("section");
  root.id="luc-everfit-directory";
  root.innerHTML='<div class="luc-heading"><h2 data-luc-title>All Clients</h2>'+
   '<div class="luc-heading-actions"><button type="button" data-luc-refresh>Refresh</button>'+
   '<button type="button" class="luc-add" data-luc-add>+ Add Client</button></div></div>'+
   '<div class="luc-filters"><label>Category: <select data-luc-filter-category><option value="All">All</option><option value="online">Online</option><option value="in_person">In-person</option><option value="hybrid">Hybrid</option></select></label>'+
   '<label>Status: <select data-luc-filter-status><option value="All">All</option><option value="Connected">Connected</option><option value="Pending">Pending</option><option value="Offline">Offline</option></select></label>'+
   '<label>Sort: <select data-luc-sort><option value="name">Name A–Z</option><option value="recent">Last Activity</option></select></label>'+
   '<input type="search" data-luc-search placeholder="Search client" aria-label="Search clients"></div>'+
   '<div class="luc-table-scroll"><table class="luc-table"><thead><tr><th>Client</th><th>Status</th><th>Category</th><th>Last activity</th><th>Invited</th><th>Actions</th></tr></thead>'+
   '<tbody data-luc-rows><tr><td colspan="6" class="luc-empty">Loading client directory…</td></tr></tbody></table></div>'+
   '<p role="status" aria-live="polite" class="luc-directory-message" data-luc-message></p>';
  host.prepend(root);
  if(original)original.classList.add("luc-single-directory");
  clientsSection.classList.add("luc-single-client-view");
  root.addEventListener("input",e=>{if(e.target.matches("[data-luc-search]"))paint()});
  root.addEventListener("change",e=>{
   if(e.target.matches("[data-luc-filter-status]"))filter=e.target.value;
   if(e.target.matches("[data-luc-filter-category]"))category=e.target.value;
   if(e.target.matches("[data-luc-sort]"))sort=e.target.value;
   paint()
  });
  root.addEventListener("click",e=>{
   const target=e.target.closest("button,[data-open]");
   if(!target)return;
   if(target.matches("[data-luc-refresh]")){void refresh(true);return}
   if(target.matches("[data-luc-add]")){
    const original=[...clientsSection.querySelectorAll("button")].find(b=>b!==target&&/invite client/i.test(b.textContent||""));
    if(original)original.click();
    clientsSection.querySelector(".cf-invite-form")?.scrollIntoView({block:"center",behavior:"smooth"});
    return;
   }
   if(target.dataset.revoke){void revoke(target.dataset.revoke,target);return}
   if(target.dataset.open){showProfile(target.dataset.open);return}
   if(target.dataset.reinvite){const x=clients.find(c=>c.id===target.dataset.reinvite);if(x)startInvite(x)}
  });
  void refresh(true);
 }
 const style=document.createElement("style");
 style.id="luc-everfit-directory-styles";
 style.textContent=`
 #clients.luc-single-client-view{display:block}
 #clients.luc-single-client-view .cf-client-sidebar{display:none!important}
 #clients .luc-single-directory>:not(#luc-everfit-directory):not(#cf-detail){display:none!important}
 #luc-everfit-directory{background:white;padding:25px 24px 18px;border:1px solid #e3eaf4;border-radius:13px;margin:0 0 24px;box-shadow:0 2px 10px #293e6108}
 .luc-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:19px;flex-wrap:wrap}
 .luc-heading h2{font-size:24px;line-height:1.3;margin:0;font-weight:790;color:#162c49}
 .luc-heading-actions{display:flex;gap:8px}
 .luc-heading-actions button{border:1px solid #cddbee;border-radius:9px;padding:9px 15px;background:white;color:#315b8f;font-weight:700}
 .luc-heading-actions button.luc-add{background:#245ff1;border-color:#245ff1;color:white}
 .luc-filters{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:20px}
 .luc-filters label{border:1px solid #e3e8ef;background:#f5f6f9;border-radius:6px;padding:8px 10px;font-weight:700;color:#394b63;display:flex;gap:5px;align-items:center}
 .luc-filters select{border:0;background:transparent;color:#1d3856;font-weight:600;max-width:160px;cursor:pointer}
 .luc-filters input{padding:11px 13px;border:1px solid #e0e6ef;border-radius:8px;min-width:210px;margin-left:auto}
 .luc-table-scroll{overflow-x:auto}.luc-table{border-collapse:collapse;width:100%;text-align:left;min-width:690px}
 .luc-table th{font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.045em;color:#77869c;padding:11px 12px;background:#f7f9fc;border-bottom:1px solid #e2e8f1;white-space:nowrap}
 .luc-table td{padding:15px 12px;border-bottom:1px solid #ebeff4;vertical-align:middle;font-size:13px;color:#344763}
 .luc-client-row:hover{background:#f8faff}
 .luc-person{display:flex;align-items:center;gap:12px}
 .luc-avatar{border-radius:50%;width:39px;height:39px;display:grid;place-items:center;flex:none;background:#dce9ff;color:#2358b1;font-weight:800;font-size:12px}
 .luc-person-info strong,.luc-person-info small{display:block}
 .luc-person-info strong{font-size:14px;color:#1b2f47;cursor:pointer}
 .luc-person-info small{font-size:11px;color:#71849a;overflow-wrap:anywhere}
 .luc-state{display:inline-block;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:800}
 .luc-state.connected{background:#e3f7ed;color:#187349}
 .luc-state.pending{background:#fff3d9;color:#946100}
 .luc-state.offline{background:#eef1f5;color:#61718a}
 .luc-reason{display:block;margin-top:4px;font-size:10px;color:#8996a6}
 .luc-actions button{border:1px solid #d4e2f6;padding:7px 12px;border-radius:8px;background:#f2f7ff;color:#2256a1;font-size:12px;font-weight:750;white-space:nowrap}
 .luc-actions .luc-revoke{border-color:#ffd4d8;background:#fff1f2;color:#b33847}
 .luc-actions button:disabled{opacity:.5}
 .luc-empty{text-align:center;color:#8291a4!important;padding:35px!important}
 .luc-directory-message{min-height:16px;font-size:12px;color:#237a49;margin:11px 0 0}
 .luc-directory-message.error{color:#af3447}
 @media(max-width:800px){#luc-everfit-directory{padding:16px 12px}.luc-filters input{margin-left:0;width:100%}.luc-heading-actions{width:100%}.luc-heading-actions button{flex:1}}
 `;
 document.head.append(style);
 const mo=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount()})});
 mo.observe(document.documentElement,{subtree:true,childList:true});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refresh(true)});
 window.addEventListener("focus",()=>void refresh(true));
 window.addEventListener("levelup:coach-roster-refresh",()=>void refresh(true));
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
