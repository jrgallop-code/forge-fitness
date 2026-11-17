/* Owner Coach client invitation: email-bound, explicit consent; no automatic access. */
const J=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}});
const str=(s,n=180)=>String(s??"").trim().slice(0,n);
const COACH_CONSENT_VERSION="coach-sharing-v1-2026-11-16";
const COACH_CONSENT_SCOPE="training_progress_body_metrics_nutrition";
const validEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
const canCoach=(user,env)=>String(env.ADMIN_EMAILS||"").split(",").map(s=>s.trim().toLowerCase()).includes(String(user?.email||"").toLowerCase());
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))).map(b=>b.toString(16).padStart(2,"0")).join("");
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,"0")).join("");
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function body(request){try{return await request.json()}catch{return null}}
function inviteSummary(row){return {id:row.id,firstName:row.first_name,lastName:row.last_name,email:row.email,coachingType:row.coaching_type,status:row.status,expiresAt:row.expires_at,acceptedAt:row.accepted_at,createdAt:row.created_at,emailedAt:row.emailed_at,consentVersion:row.consent_version||null,consentScope:row.consent_scope||null}}
export async function coachInviteRoute({request,env,user,url}){
 const path=url.pathname,method=request.method,now=new Date().toISOString(),coach=canCoach(user,env);
 if(path==="/v1/coach/roster"&&method==="GET"){
  if(!coach)return J({error:"Coach permission required"},403);
  // Single Everfit-style roster. Pending invitations are people on the roster,
  // not permissioned clients. Never use an invitation ID as an athlete user ID.
  const [links,inviteRows]=await Promise.all([
   env.DB.prepare("SELECT u.id,u.display_name,u.email,u.avatar_url,l.accepted_at FROM coach_training_links l JOIN users u ON u.id=l.client_user_id WHERE l.coach_user_id=? AND l.training_permission=1 AND l.revoked_at IS NULL ORDER BY LOWER(COALESCE(NULLIF(u.display_name,''),u.email)) LIMIT 250").bind(user.id).all(),
   env.DB.prepare("SELECT id,first_name,last_name,email,coaching_type,status,expires_at,accepted_user_id,created_at,emailed_at FROM coach_client_invites WHERE coach_user_id=? ORDER BY created_at DESC LIMIT 500").bind(user.id).all()
  ]);
  const joined=(links.results||[]).filter(row=>row.id!==user.id);
  const invitations=inviteRows.results||[];
  const latestByUser=new Map();
  for(const inv of invitations)if(inv.accepted_user_id&&!latestByUser.has(inv.accepted_user_id))latestByUser.set(inv.accepted_user_id,inv);
  const records=joined.map(row=>{
   const inv=latestByUser.get(row.id);
   return {id:"client:"+row.id,clientId:row.id,invitationId:inv?.id||null,
    name:str(row.display_name||[inv?.first_name,inv?.last_name].filter(Boolean).join(" ")||row.email||"Client",160),
    email:row.email||null,contactEmail:inv?.email||null,
    coachingType:inv?.coaching_type||"online",status:"Connected",linked:true,
    canRevoke:false,connectedAt:row.accepted_at||null,invitedAt:inv?.emailed_at||null};
  });
  const connectedIds=new Set(joined.map(row=>row.id));
  const connectedEmails=new Set(joined.map(row=>String(row.email||"").toLowerCase()));
  const seen=new Set();
  for(const inv of invitations){
   if(inv.accepted_user_id&&connectedIds.has(inv.accepted_user_id))continue;
   const email=String(inv.email||"").trim().toLowerCase();
   if(connectedEmails.has(email)||seen.has(email))continue;
   seen.add(email);
   const pending=inv.status==="pending"&&inv.expires_at>now;
   records.push({id:"invitation:"+inv.id,clientId:null,invitationId:inv.id,
    name:str([inv.first_name,inv.last_name].filter(Boolean).join(" ")||email||"Client",160),
    email:email||null,contactEmail:email||null,coachingType:inv.coaching_type||"online",
    status:pending?"Pending":"Offline",linked:false,canRevoke:pending,
    invitationStatus:pending?"pending":inv.status==="pending"?"expired":inv.status,
    invitedAt:inv.emailed_at||inv.created_at||null,expiresAt:inv.expires_at||null});
  }
  const order={Pending:0,Connected:1,Offline:2};
  records.sort((a,b)=>(order[a.status]-order[b.status])||a.name.localeCompare(b.name));
  return J({clients:records,counts:{
   all:records.length,connected:records.filter(x=>x.status==="Connected").length,
   pending:records.filter(x=>x.status==="Pending").length,
   offline:records.filter(x=>x.status==="Offline").length
  }});
 }
 if(path==="/v1/coach/invitations"&&method==="GET"){
  if(!coach)return J({error:"Coach permission required"},403);
  const rows=await env.DB.prepare("SELECT * FROM coach_client_invites WHERE coach_user_id=? ORDER BY created_at DESC LIMIT 200").bind(user.id).all();
  return J({invitations:(rows.results||[]).map(inviteSummary)});
 }
 if(path==="/v1/coach/invitations"&&method==="POST"){
  if(!coach)return J({error:"Coach permission required"},403);
  const p=await body(request);if(!p)return J({error:"Invalid invite"},400);
  const first=str(p.firstName,80),last=str(p.lastName,80),email=str(p.email,254).toLowerCase();
  const type=["online","in_person","hybrid"].includes(p.coachingType)?p.coachingType:"online";
  if(!first||!last||!validEmail(email))return J({error:"Enter first name, last name and valid email"},400);
  if(!env.RESEND_API_KEY)return J({error:"Email invitations unavailable: Resend is not configured"},503);
  const existing=await env.DB.prepare("SELECT id FROM coach_client_invites WHERE coach_user_id=? AND email=? AND status='pending' AND expires_at>? LIMIT 1").bind(user.id,email,now).first();
  if(existing)return J({error:"An invitation is already pending for this email. Revoke it before creating a new one."},409);
  const token=random(),digest=await hash(token),id=crypto.randomUUID(),expiresAt=new Date(Date.now()+14*86400000).toISOString();
  const inviteBase="https://leveluphypertrophy.com/coach-join.html";
  const link=inviteBase+"?invite="+encodeURIComponent(token);
  const appleLink=link+"&auth=apple";
  const appleAvailable=!!String(env.APPLE_WEB_CLIENT_ID||"").trim() &&
    String(env.APPLE_WEB_REDIRECT_URI||"").trim()==="https://leveluphypertrophy.com/coach-join.html";
  const text="You are invited to Level Up coaching by "+(user.display_name||"your coach")+
    ".\\n\\nReview invitation: "+link+
    (appleAvailable?"\\n\\nSign in with Apple: "+appleLink:"")+
    "\\n\\nUse your existing Level Up account. If you previously used Apple Hide My Email, use the SAME Apple account once web Apple sign-in is enabled. You must explicitly approve coaching data sharing. Invitation expires in 14 days.";
  const appleAction=appleAvailable?
    '<p><a href="'+escape(appleLink)+'" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Sign in with Apple</a></p>':"";
  const inviteHtml='<div style="font-family:system-ui;max-width:560px;margin:auto"><h1>Welcome to Level Up</h1><p>'+escape(first)+', your coach invited you to connect your existing Level Up account.</p>'+
    '<p><a href="'+escape(link)+'" style="display:inline-block;background:#2467dc;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Review invitation</a></p>'+appleAction+
    '<p>If you use Apple Hide My Email, sign in with the same Apple account used in Level Up. You must review and approve the coaching connection before sharing.</p>'+
    '<p>Or sign in using your existing Google/email account. Invitation expires in 14 days.</p></div>';
  await env.DB.prepare("INSERT INTO coach_client_invites (id,coach_user_id,first_name,last_name,email,coaching_type,token_hash,status,expires_at,created_at) VALUES (?,?,?,?,?,? ,?,'pending',?,?)").bind(id,user.id,first,last,email,type,digest,expiresAt,now).run();
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"Level Up <support@leveluphypertrophy.com>",to:[email],subject:"Your invitation to Level Up coaching",text,html:inviteHtml,tags:[{name:"category",value:"coach_invitation"}]})}).catch(()=>null);
  const details=await response?.json().catch(()=>({}));
  if(!response?.ok){await env.DB.prepare("DELETE FROM coach_client_invites WHERE id=? AND status='pending'").bind(id).run();return J({error:"Email service rejected the invitation. Nothing was added to the roster."},502);}
  await env.DB.prepare("UPDATE coach_client_invites SET emailed_at=? WHERE id=?").bind(now,id).run();
  return J({invitation:{id,firstName:first,lastName:last,email,coachingType:type,status:"pending",expiresAt,emailedAt:now},emailQueued:true},201);
 }
 const revoke=path.match(/^\/v1\/coach\/invitations\/([0-9a-f-]{36})\/revoke$/i);
 if(revoke&&method==="POST"){
  if(!coach)return J({error:"Coach permission required"},403);
  const result=await env.DB.prepare("UPDATE coach_client_invites SET status='revoked' WHERE id=? AND coach_user_id=? AND status='pending'").bind(revoke[1],user.id).run();
  return J({ok:!!result.meta?.changes},result.meta?.changes?200:404);
 }
 if(path==="/v1/coach/invitation/preview"&&method==="POST"){
  const p=await body(request),token=str(p?.token,128);
  if(!/^[a-f0-9]{64}$/.test(token))return J({error:"Invitation link invalid"},400);
  const row=await env.DB.prepare("SELECT i.id,i.first_name,i.last_name,i.email,i.coaching_type,i.status,i.expires_at,COALESCE(NULLIF(u.display_name,\'\'),\'Your Level Up coach\') AS coach_name FROM coach_client_invites i LEFT JOIN users u ON u.id=i.coach_user_id WHERE i.token_hash=?").bind(await hash(token)).first();
  if(!row||row.status!=="pending"||row.expires_at<=now)return J({error:"Invitation has expired or is no longer valid"},404);
  return J({firstName:row.first_name,coachName:row.coach_name,contactEmail:row.email,coachingType:row.coaching_type,expiresAt:row.expires_at});
 }
 if(path==="/v1/client/coach-invitation/accept"&&method==="POST"){
  if(!user?.id)return J({error:"Sign in to Level Up to accept"},401);
  const p=await body(request),token=str(p?.token,128);
  if(!/^[a-f0-9]{64}$/.test(token))return J({error:"Invitation link invalid"},400);
  const digest=await hash(token);
  const row=await env.DB.prepare("SELECT * FROM coach_client_invites WHERE token_hash=?").bind(digest).first();
  if(!row||row.status!=="pending"||row.expires_at<=now)return J({error:"Invitation has expired or was already used"},404);
  const emailMatches=String(user.email||"").trim().toLowerCase()===row.email;
  // Email can differ for Apple Hide My Email. Require the original invitation
  // secret, an authenticated Level Up account, a review of both addresses,
  // and an affirmative existing-account identity confirmation.
  if(!emailMatches && !(p.acceptVia==="existing_account" && p.confirmContactEmailMismatch===true && p.confirmAccountId===user.id))
   return J({error:"The invitation contact email differs from your Level Up account. Open More → Level Up Coach in your signed-in app and confirm both addresses before linking."},403);
  if(p.approveTraining!==true||p.approveNutrition!==true||p.approveDataSharing!==true)
   return J({error:"Coaching requires explicit approval to share training, body metrics and nutrition data. You may decline the invitation instead."},400);
  if(p.consentVersion!==COACH_CONSENT_VERSION)
   return J({error:"Please review the current coaching data-sharing disclosure before accepting."},400);
  await env.DB.prepare("INSERT INTO coach_training_links (coach_user_id,client_user_id,training_permission,nutrition_permission,accepted_at,revoked_at,consent_version,consent_scope) VALUES (?,?,1,1,?,NULL,?,?) ON CONFLICT(coach_user_id,client_user_id) DO UPDATE SET training_permission=1,nutrition_permission=1,accepted_at=excluded.accepted_at,revoked_at=NULL,consent_version=excluded.consent_version,consent_scope=excluded.consent_scope").bind(row.coach_user_id,user.id,now,COACH_CONSENT_VERSION,COACH_CONSENT_SCOPE).run();
  await env.DB.prepare("UPDATE coach_client_invites SET status='accepted',accepted_at=?,accepted_user_id=?,consent_version=?,consent_scope=? WHERE id=? AND status='pending'").bind(now,user.id,COACH_CONSENT_VERSION,COACH_CONSENT_SCOPE,row.id).run();
  return J({accepted:true,coachId:row.coach_user_id,trainingPermission:true,nutritionPermission:true,consentVersion:COACH_CONSENT_VERSION});
 }
 if(path==="/v1/client/coach-links"&&method==="GET"){
  const rows=await env.DB.prepare("SELECT l.coach_user_id,l.training_permission,l.nutrition_permission,l.accepted_at,l.consent_version,u.display_name,u.email FROM coach_training_links l JOIN users u ON u.id=l.coach_user_id WHERE l.client_user_id=? AND l.revoked_at IS NULL").bind(user.id).all();
  return J({coaches:(rows.results||[]).map(x=>({coachId:x.coach_user_id,name:x.display_name||x.email,training:!!x.training_permission,nutrition:!!x.nutrition_permission,acceptedAt:x.accepted_at,consentVersion:x.consent_version||null}))});
 }
 const disconnect=path.match(/^\/v1\/client\/coach-links\/([^/]+)\/revoke$/);
 if(disconnect&&method==="POST"){
  const coachId=decodeURIComponent(disconnect[1]);const r=await env.DB.prepare("UPDATE coach_training_links SET revoked_at=? WHERE coach_user_id=? AND client_user_id=? AND revoked_at IS NULL").bind(now,coachId,user.id).run();
  return J({revoked:!!r.meta?.changes},r.meta?.changes?200:404);
 }
 return J({error:"Not found"},404);
}
