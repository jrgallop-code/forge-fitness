/* Phase 1: versioned Coach drafts, owned by coach and attached to athlete ID.
 * Never overwrite athlete cloud backup or already-published assignments.
 */
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}});
const clean=(x,n)=>String(x??"").trim().slice(0,n);
const coachAllowed=(user,env)=>String(env.ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).includes(String(user?.email||"").toLowerCase());
const clientAccess=async(user,id,env)=>{
 if(user.id===id)return true;
 const row=await env.DB.prepare("SELECT training_permission FROM coach_training_links WHERE coach_user_id=? AND client_user_id=? AND revoked_at IS NULL").bind(user.id,id).first();
 return Number(row?.training_permission)===1;
};
const safeRead=async request=>{try{const t=await request.text();return t.length<=120000?JSON.parse(t):null}catch{return null}};
function asDraft(row){return{id:row.id,clientId:row.client_user_id,name:row.name,version:Number(row.version),content:JSON.parse(row.draft_json),updatedAt:row.updated_at,createdAt:row.created_at}}
export async function coachDraftRoute({request,env,user,url}){
 if(!user?.id||!coachAllowed(user,env))return json({error:"Coach access required"},403);
 const match=url.pathname.match(/^\/v1\/coach\/clients\/([^/]+)\/drafts(?:\/([^/]+))?$/);
 if(!match)return json({error:"Invalid draft path"},404);
 let clientId,draftId;
 try{clientId=decodeURIComponent(match[1]);draftId=match[2]?decodeURIComponent(match[2]):null}catch{return json({error:"Malformed client ID"},400)}
 if(!clientId||clientId.length>160||draftId&&draftId.length>120)return json({error:"Invalid client or draft ID"},400);
 if(!await clientAccess(user,clientId,env))return json({error:"No athlete-approved training access"},403);
 const method=request.method,now=new Date().toISOString();
 if(method==="GET"&&!draftId){
  const rows=await env.DB.prepare("SELECT id,client_user_id,name,draft_json,version,created_at,updated_at FROM coach_client_drafts WHERE coach_user_id=? AND client_user_id=? ORDER BY updated_at DESC LIMIT 100").bind(user.id,clientId).all();
  return json({clientId,drafts:(rows.results||[]).map(asDraft)});
 }
 if(method==="PUT"&&draftId){
  if(!/^[a-zA-Z0-9._:-]{1,120}$/.test(draftId))return json({error:"Draft ID contains unsupported characters"},400);
  const input=await safeRead(request);const content=input?.content;
  if(!content||typeof content!=="object"||Array.isArray(content))return json({error:"A valid draft object is required"},400);
  const encoded=JSON.stringify(content);if(encoded.length>105000)return json({error:"Draft is too large"},413);
  const expected=input.expectedVersion===null?null:Number(input.expectedVersion);
  if(expected!==null&&(!Number.isInteger(expected)||expected<1))return json({error:"Invalid expected version"},400);
  const found=await env.DB.prepare("SELECT version FROM coach_client_drafts WHERE coach_user_id=? AND client_user_id=? AND id=?").bind(user.id,clientId,draftId).first();
  const name=clean(input.name||content.name||"New Coaching Program",120)||"New Coaching Program";
  if(found&&Number(found.version)!==expected||!found&&expected!==null)return json({error:"Draft changed in another session. Refresh before saving.",currentVersion:found?Number(found.version):null},409);
  if(found){
   const r=await env.DB.prepare("UPDATE coach_client_drafts SET name=?,draft_json=?,version=version+1,updated_at=? WHERE coach_user_id=? AND client_user_id=? AND id=? AND version=?").bind(name,encoded,now,user.id,clientId,draftId,expected).run();
   if(Number(r.meta?.changes)!==1)return json({error:"Draft version conflict"},409);
  }else{
   await env.DB.prepare("INSERT INTO coach_client_drafts (id,coach_user_id,client_user_id,name,draft_json,version,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)").bind(draftId,user.id,clientId,name,encoded,now,now).run();
  }
  return json({id:draftId,clientId,name,version:found?expected+1:1,updatedAt:now},found?200:201);
 }
 if(method==="DELETE"&&draftId){
  const found=await env.DB.prepare("DELETE FROM coach_client_drafts WHERE id=? AND coach_user_id=? AND client_user_id=?").bind(draftId,user.id,clientId).run();
  return json({deleted:Number(found.meta?.changes)===1},found.meta?.changes?200:404);
 }
 return json({error:"Method not allowed"},405);
}
