/* Owner Coach client invitation: email-bound, explicit consent; no automatic access. */
const J=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}});
const str=(s,n=180)=>String(s??"").trim().slice(0,n);
const validEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
const canCoach=(user,env)=>String(env.ADMIN_EMAILS||"").split(",").map(s=>s.trim().toLowerCase()).includes(String(user?.email||"").toLowerCase());
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))).map(b=>b.toString(16).padStart(2,"0")).join("");
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,"0")).join("");
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function body(request){try{return await request.json()}catch{return null}}
function inviteSummary(row){return {id:row.id,firstName:row.first_name,lastName:row.last_name,email:row.email,coachingType:row.coaching_type,status:row.status,expiresAt:row.expires_at,acceptedAt:row.accepted_at,createdAt:row.created_at,emailedAt:row.emailed_at}}
export async function coachInviteRoute({request,env,user,url}){
 const path=url.pathname,method=request.method,now=new Date().toISOString(),coach=canCoach(user,env);
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
  const text="You're invited to Level Up coaching by "+(user.display_name||"your coach")+".\n\nAccept invitation: "+link+"\n\nSign in with the same Level Up account email ("+email+") to accept. This link expires in 14 days.\n\nOnce connected, get the Level Up iPhone app: https://apps.apple.com/ca/app/level-up-workout-nutrition/id6810024008";
  await env.DB.prepare("INSERT INTO coach_client_invites (id,coach_user_id,first_name,last_name,email,coaching_type,token_hash,status,expires_at,created_at) VALUES (?,?,?,?,?,? ,?,'pending',?,?)").bind(id,user.id,first,last,email,type,digest,expiresAt,now).run();
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"Level Up <support@leveluphypertrophy.com>",to:[email],subject:"Your invitation to Level Up coaching",text,html:'<div style="font-family:system-ui;max-width:560px;margin:auto"><h1>Welcome to Level Up</h1><p>'+escape(first)+', your coach has invited you to connect your Level Up account.</p><p><a href="'+escape(link)+'" style="background:#2467dc;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Accept invitation</a></p><p>Sign in using '+escape(email)+' on the next screen. Your coach will only gain access to the information you approve.</p><p>Invitation expires in 14 days.</p></div>',tags:[{name:"category",value:"coach_invitation"}]})}).catch(()=>null);
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
  const row=await env.DB.prepare("SELECT id,first_name,last_name,coaching_type,status,expires_at FROM coach_client_invites WHERE token_hash=?").bind(await hash(token)).first();
  if(!row||row.status!=="pending"||row.expires_at<=now)return J({error:"Invitation has expired or is no longer valid"},404);
  return J({firstName:row.first_name,coachingType:row.coaching_type,expiresAt:row.expires_at});
 }
 if(path==="/v1/client/coach-invitation/accept"&&method==="POST"){
  if(!user?.id)return J({error:"Sign in to Level Up to accept"},401);
  const p=await body(request),token=str(p?.token,128);
  if(!/^[a-f0-9]{64}$/.test(token))return J({error:"Invitation link invalid"},400);
  const digest=await hash(token);
  const row=await env.DB.prepare("SELECT * FROM coach_client_invites WHERE token_hash=?").bind(digest).first();
  if(!row||row.status!=="pending"||row.expires_at<=now)return J({error:"Invitation has expired or was already used"},404);
  if(String(user.email||"").trim().toLowerCase()!==row.email)return J({error:"Sign in using the invited email address to accept this coaching invitation"},403);
  if(p.approveTraining!==true)return J({error:"You must explicitly approve training access"},400);
  await env.DB.prepare("INSERT INTO coach_training_links (coach_user_id,client_user_id,training_permission,nutrition_permission,accepted_at,revoked_at) VALUES (?,?,1,?,?,NULL) ON CONFLICT(coach_user_id,client_user_id) DO UPDATE SET training_permission=1,nutrition_permission=excluded.nutrition_permission,accepted_at=excluded.accepted_at,revoked_at=NULL").bind(row.coach_user_id,user.id,p.approveNutrition===true?1:0,now).run();
  await env.DB.prepare("UPDATE coach_client_invites SET status='accepted',accepted_at=?,accepted_user_id=? WHERE id=? AND status='pending'").bind(now,user.id,row.id).run();
  return J({accepted:true,coachId:row.coach_user_id,trainingPermission:true,nutritionPermission:p.approveNutrition===true});
 }
 if(path==="/v1/client/coach-links"&&method==="GET"){
  const rows=await env.DB.prepare("SELECT l.coach_user_id,l.training_permission,l.nutrition_permission,l.accepted_at,u.display_name,u.email FROM coach_training_links l JOIN users u ON u.id=l.coach_user_id WHERE l.client_user_id=? AND l.revoked_at IS NULL").bind(user.id).all();
  return J({coaches:(rows.results||[]).map(x=>({coachId:x.coach_user_id,name:x.display_name||x.email,training:!!x.training_permission,nutrition:!!x.nutrition_permission,acceptedAt:x.accepted_at}))});
 }
 const disconnect=path.match(/^\/v1\/client\/coach-links\/([^/]+)\/revoke$/);
 if(disconnect&&method==="POST"){
  const coachId=decodeURIComponent(disconnect[1]);const r=await env.DB.prepare("UPDATE coach_training_links SET revoked_at=? WHERE coach_user_id=? AND client_user_id=? AND revoked_at IS NULL").bind(now,coachId,user.id).run();
  return J({revoked:!!r.meta?.changes},r.meta?.changes?200:404);
 }
 return J({error:"Not found"},404);
}
