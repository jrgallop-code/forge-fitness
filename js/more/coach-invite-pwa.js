/* PWA-first: accept a coach invitation into the signed-in Level Up cloud account.
 * The invitation contact email may differ from an Apple private-relay account email.
 * Never create an account, transfer local data, or enable coach sharing implicitly.
 */
const API="https://api.leveluphypertrophy.com";
const VERSION="coach-sharing-v1-2026-11-16";
const SESSION_KEY="level_up_cloud_session";
const ACCOUNT_KEY="level_up_cloud_account";
const tokenPattern=/^[a-f0-9]{64}$/i;
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const getStored=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}};
const tokenFrom=s=>{
 const value=String(s||"").trim();
 if(tokenPattern.test(value))return value.toLowerCase();
 try{const u=new URL(value);const code=u.searchParams.get("invite");return tokenPattern.test(code||"")?code.toLowerCase():""}catch{return""}
};
async function call(path,session,body){
 const response=await fetch(API+path,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+session,"Accept":"application/json",...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Could not complete request");
 return data;
}
export function renderCoachInvitePwa(){
 return `<section class="dashboard-welcome"><div><button type="button" class="nutrition-planner-back" id="coach-invite-back">← More</button><span class="eyebrow">LEVEL UP COACH</span><h2>Connect to your coach</h2><p>Link your existing Level Up account. Your training, food logs, and history stay in the same account.</p></div></section>
 <section class="section-card" id="coach-invite-account"><span class="eyebrow">YOUR LEVEL UP ACCOUNT</span><h3 id="coach-invite-account-name">Checking sign-in…</h3><p id="coach-invite-account-email"></p><p id="coach-invite-signin-help" hidden>Sign in from More → Account &amp; Cloud first. Do not create a second account just to join a coach.</p></section>
 <section class="section-card"><span class="eyebrow">STEP 1 · INVITATION</span><h3>Enter invitation link or code</h3><p>Paste the full invitation link from your coach's email or its 64-character invitation code. The email your coach used can be different from your Level Up account email.</p><label for="coach-invite-token">Invitation link or code</label><input id="coach-invite-token" type="text" inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Paste invitation link or code" style="display:block;width:100%;max-width:100%;box-sizing:border-box;margin:8px 0 12px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text)"><button class="secondary-btn" type="button" id="coach-invite-preview">Review invitation</button><p id="coach-invite-status" role="status" aria-live="polite"></p></section>
 <section class="section-card" id="coach-invite-consent" hidden><span class="eyebrow">STEP 2 · REVIEW &amp; APPROVE</span><h3>Review coaching access</h3><div id="coach-invite-summary"></div><p><strong>Your coach will be able to view synced:</strong> training sessions, workout plans and progress; body weight, measurements, goals and available steps/sleep data; and food logs, calories, macros and expenditure. Your coach may assign training plans.</p><p>Your coach cannot read your password or data you have not uploaded to Level Up Cloud. You can revoke access later. Data already viewed, downloaded, or recorded by the coach may not be retractable.</p><p>All three categories are required for this coaching relationship. You may decline instead of connecting. Review the <a href="https://leveluphypertrophy.com/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</p><label style="display:flex;align-items:flex-start;gap:10px"><input type="checkbox" id="coach-invite-data-consent"><span>I explicitly agree to share my synced training, body metrics, and nutrition data with this coach, and to receive assigned plans.</span></label><label id="coach-invite-mismatch-wrap" style="display:none;align-items:flex-start;gap:10px;margin-top:12px"><input type="checkbox" id="coach-invite-mismatch"><span id="coach-invite-mismatch-text"></span></label><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:15px"><button type="button" class="primary-btn" id="coach-invite-accept" disabled>Agree and connect</button><button type="button" class="secondary-btn" id="coach-invite-decline">Decline</button></div></section>
 <section class="section-card"><span class="eyebrow">CONNECTED COACHES</span><div id="coach-invite-links"><p>Checking connections…</p></div></section>`;
}
export function initializeCoachInvitePwa({onBack}={}){
 const $=id=>document.getElementById(id);
 $("coach-invite-back")?.addEventListener("click",()=>onBack?.());
 const status=(message,isError=false)=>{const el=$("coach-invite-status");if(el){el.textContent=message;el.style.color=isError?"var(--danger,#d94d57)":"var(--muted)" }};
 let verified=null,activeToken="",user=null,sessionToken="",pending=false;
 const consent=$("coach-invite-data-consent"),mismatch=$("coach-invite-mismatch"),accept=$("coach-invite-accept");
 const ready=()=>{accept.disabled=pending||!verified||!user||!consent.checked||(verified.mismatch&&!mismatch.checked)};
 const clearPreview=()=>{verified=null;activeToken="";$("coach-invite-consent").hidden=true;consent.checked=false;mismatch.checked=false;ready()};
 const init=async()=>{
  const stored=getStored(SESSION_KEY),account=getStored(ACCOUNT_KEY);
  sessionToken=stored?.token||"";
  if(!sessionToken){$("coach-invite-account-name").textContent="Not signed in";$("coach-invite-signin-help").hidden=false;status("Sign in to Level Up first, then return here.",true);$("coach-invite-links").textContent="Sign in to see connected coaches.";return}
  try{
   const response=await call("/v1/me",sessionToken);
   user=response.user;
   if(!user?.id)throw new Error("Account identity unavailable");
   $("coach-invite-account-name").textContent=user.display_name||user.name||account?.name||"Level Up member";
   $("coach-invite-account-email").textContent=user.email||"Signed-in account";
   const candidate=new URLSearchParams(location.search).get("invite");
   if(tokenPattern.test(candidate||"")){
    $("coach-invite-token").value=candidate;
    // Remove invitation credentials from browser history/address bar immediately.
    const clean=new URL(location.href);
    clean.searchParams.delete("invite");
    history.replaceState(history.state,"",clean.pathname+clean.search+clean.hash);
    void preview();
   }
   await refreshLinks();
  }catch(e){user=null;$("coach-invite-account-name").textContent="Sign in required";$("coach-invite-signin-help").hidden=false;status("Please sign in to your existing Level Up account first.",true);$("coach-invite-links").textContent="Sign in to view coaches."}
 };
 const refreshLinks=async()=>{
  const parent=$("coach-invite-links");if(!parent||!user)return;
  try{
   const response=await call("/v1/client/coach-links",sessionToken);
   parent.replaceChildren();
   if(!response.coaches?.length){parent.textContent="No coach connected yet.";return}
   for(const item of response.coaches){
    const line=document.createElement("div");line.style.cssText="padding:12px 0;border-bottom:1px solid var(--line)";
    const title=document.createElement("strong");title.textContent=item.name||"Coach";line.append(title);
    const detail=document.createElement("p");detail.textContent="Training and nutrition sharing active";line.append(detail);
    const button=document.createElement("button");button.className="secondary-btn";button.type="button";button.textContent="Disconnect coach";
    button.addEventListener("click",async()=>{
     if(!confirm("Disconnect this coach? New data sharing will stop, but information already viewed or downloaded cannot be recalled."))return;
     button.disabled=true;
     try{await call("/v1/client/coach-links/"+encodeURIComponent(item.coachId)+"/revoke",sessionToken,{});status("Coach disconnected. Sharing stopped.");await refreshLinks()}catch(e){status(e.message,true);button.disabled=false}
    });
    line.append(button);parent.append(line);
   }
  }catch(e){parent.textContent="Unable to load coaches: "+e.message}
 };
 const preview=async()=>{
  clearPreview();
  if(!user){status("Sign in to your existing Level Up account first.",true);return}
  const token=tokenFrom($("coach-invite-token").value);
  if(!token){status("Enter a valid invitation link or 64-character code.",true);return}
  pending=true;$("coach-invite-preview").disabled=true;
  try{
   const data=await call("/v1/coach/invitation/preview",sessionToken,{token});
   const invited=String(data.contactEmail||"").toLowerCase(),actual=String(user.email||"").toLowerCase();
   verified={...data,mismatch:invited!==actual};
   activeToken=token;
   const summary=$("coach-invite-summary");summary.replaceChildren();
   for(const [label,value] of [["Coach",data.coachName||"Level Up coach"],["Invitation for",data.firstName||"Athlete"],["Contact email",data.contactEmail||"—"],["Signed-in Level Up account",user.email||"—"],["Coaching",String(data.coachingType||"online").replaceAll("_"," ")]]){
    const line=document.createElement("p"),strong=document.createElement("strong");strong.textContent=label+": ";line.append(strong,document.createTextNode(value));summary.append(line)
   }
   const warning=$("coach-invite-mismatch-wrap");warning.style.display=verified.mismatch?"flex":"none";
   $("coach-invite-mismatch-text").textContent="I confirm that "+(data.contactEmail||"the invitation contact email")+" is my invitation address, and that I want to link it to this signed-in Level Up account ("+(user.email||"current account")+").";
   $("coach-invite-consent").hidden=false;
   status("Review the coach, invited address, account, and data-sharing consent.");
  }catch(e){status(e.message,true)}
  finally{pending=false;$("coach-invite-preview").disabled=false;ready()}
 };
 $("coach-invite-preview").addEventListener("click",()=>void preview());
 $("coach-invite-token").addEventListener("input",()=>{clearPreview();status("Review the invitation again before connecting.")});
 for(const control of [consent,mismatch])control.addEventListener("change",ready);
 $("coach-invite-decline").addEventListener("click",()=>{clearPreview();$("coach-invite-token").value="";status("Invitation declined. No coach connection was created.")});
 accept.addEventListener("click",async()=>{
  if(!verified||!user||pending||!consent.checked||(verified.mismatch&&!mismatch.checked))return;
  const signedIn=user,contactMismatch=verified.mismatch;
  pending=true;ready();
  try{
   // Reconfirm account identity in case the athlete signed out in another tab.
   const current=await call("/v1/me",sessionToken);
   if(current.user?.id!==signedIn.id)throw Error("Your account changed. Reopen this screen before connecting.");
   await call("/v1/client/coach-invitation/accept",sessionToken,{
    token:activeToken,approveTraining:true,approveNutrition:true,approveDataSharing:true,
    consentVersion:VERSION,acceptVia:"existing_account",
    confirmContactEmailMismatch:contactMismatch,
    confirmAccountId:signedIn.id
   });
   clearPreview();$("coach-invite-token").value="";
   status("Coach connected to your existing Level Up account. Your history has not been moved.");
   await refreshLinks();
  }catch(e){status(e.message,true)}
  finally{pending=false;ready()}
 });
 void init();
}
