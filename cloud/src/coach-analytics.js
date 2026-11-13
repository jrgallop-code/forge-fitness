/* Level Up coach / athlete analytics authorization.
 *  - Every action uses the authenticated user supplied by index.js requireUser.
 *  - Only explicitly linked users may view scoped, projected analytics.
 *  - Never returns the backup object or personal content outside allowed fields.
 */
const CORS_KIND="application/json; charset=utf-8";
const INVITE_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function response(data,status,request,env){const headers=new Headers({"Content-Type":CORS_KIND,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});const origin=request.headers.get("Origin");if(origin&&new Set(String(env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim())).has(origin)){headers.set("Access-Control-Allow-Origin",origin);headers.set("Vary","Origin")}return new Response(JSON.stringify(data),{status,headers})}
const codeHash=async(value)=>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")};
function randomCode(){const arr=new Uint8Array(16);crypto.getRandomValues(arr);return [...arr].map(b=>INVITE_ALPHABET[b%INVITE_ALPHABET.length]).join("")}
const normalizeCode=v=>String(v||"").toUpperCase().replace(/[^A-Z2-9]/g,"");
async function bodyJson(request){try{const raw=await request.text();if(raw.length>20000)return null;return JSON.parse(raw||"{}")}catch{return null}}
function isCoach(user,env){return String(env.ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).includes(String(user.email||"").toLowerCase())}
const arr=v=>Array.isArray(v)?v:[];
function selectSessions(data){return arr(data.forge_workout_sessions).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x?.date)).slice(-1500).map(s=>({date:s.date,exercises:arr(s.exercises).map(ex=>({exerciseId:String(ex.exerciseId||ex.id||"").slice(0,120),sets:arr(ex.sets).map(set=>({weight:Number(set.weight)||0,reps:Number(set.reps)||0,rir:Number.isFinite(Number(set.rir))?Number(set.rir):null,completed:set.completed===true})).slice(0,50)})).filter(x=>x.exerciseId).slice(0,90)}))}
function selectWeight(data){return arr(data.forge_weight_entries).filter(e=>/^\d{4}-\d{2}-\d{2}$/.test(String(e?.date||""))&&Number.isFinite(Number(e.weight??e.value))).slice(-2500).map(e=>({date:e.date,weight:Number(e.weight??e.value)}))}
function selectFood(data){const log=data.level_up_food_log_v1;const output={};if(!log||typeof log!=="object"||Array.isArray(log))return output;const dates=Object.keys(log).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort().slice(-90);for(const date of dates)output[date]=arr(log[date]).slice(0,100).map(x=>({name:String(x.name||x.foodName||"Food").slice(0,140),meal:String(x.meal||"").slice(0,25),nutrition:{calories:Number(x.nutrition?.calories)||0,protein:Number(x.nutrition?.protein)||0,carbs:Number(x.nutrition?.carbs)||0,fat:Number(x.nutrition?.fat)||0}}));return output}
function selectExpenditure(data){return arr(data.level_up_weekly_tdee_history_v1).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||""))&&Number.isFinite(Number(x.maintenanceCalories))).slice(-260).map(x=>({date:x.date,maintenanceCalories:Math.round(Number(x.maintenanceCalories))}))}
function scopedAnalytics(backup,scopes){const data=backup?.data||{};const result={asOf:backup?.exportedAt||null,source:"athlete-cloud-backup",updatedOnNextSync:true};if(scopes.training){result.sessions=selectSessions(data);result.weightEntries=selectWeight(data);result.goalWeight=Number(data.level_up_goal_weight)||null;result.expenditure=selectExpenditure(data)}if(scopes.nutrition){result.foodLog=selectFood(data);result.nutritionPlan={calculatedCalories:Number(data.level_up_nutrition_plan?.calculatedCalories)||null,macroPreference:data.level_up_nutrition_macro||null}}return result}
const fail=(code,err,req,env)=>response({error:err},code,req,env);
export async function coachAnalyticsRoute({request,env,user,url}){
 const path=url.pathname,method=request.method,now=new Date().toISOString();
 if(path==="/v1/coach/self-connect"&&method==="POST"){
  if(!isCoach(user,env))return fail(403,"Coach authorization required.",request,env);
  const data=await bodyJson(request);if(data?.approve!==true)return fail(400,"Explicit consent required.",request,env);
  await env.DB.prepare("INSERT INTO coach_training_links (coach_user_id,client_user_id,training_permission,nutrition_permission,accepted_at,revoked_at) VALUES (?,?,1,?,?,NULL) ON CONFLICT(coach_user_id,client_user_id) DO UPDATE SET training_permission=1,nutrition_permission=excluded.nutrition_permission,accepted_at=excluded.accepted_at,revoked_at=NULL").bind(user.id,user.id,data?.nutrition===true?1:0,now).run();
  return response({connected:true,self:true,scopes:{training:true,nutrition:data?.nutrition===true}},200,request,env)
 }
 if(path==="/v1/coach/invites"&&method==="POST"){
  if(!isCoach(user,env))return fail(403,"Coach authorization required.",request,env);
  const invite=randomCode();const id=crypto.randomUUID(),expires=new Date(Date.now()+24*60*60*1000).toISOString();
  await env.DB.prepare("INSERT INTO coach_training_invitations (id,coach_user_id,code_hash,expires_at,consumed_at,created_at) VALUES (?,?,?,?,NULL,?)").bind(id,user.id,await codeHash(invite),expires,now).run();
  return response({inviteCode:invite,expiresAt:expires,scope:"training"},201,request,env)
 }
 if(path==="/v1/client/coach-links/accept"&&method==="POST"){
  const data=await bodyJson(request),code=normalizeCode(data?.code);
  if(!/^[A-Z2-9]{16}$/.test(code))return fail(400,"Invalid invitation.",request,env);
  const row=await env.DB.prepare("SELECT id,coach_user_id FROM coach_training_invitations WHERE code_hash=? AND consumed_at IS NULL AND expires_at>?").bind(await codeHash(code),now).first();
  if(!row)return fail(404,"Invitation expired or already used.",request,env);
  if(data?.consent!==true)return fail(400,"Explicit training history consent required.",request,env);
  const done=await env.DB.prepare("UPDATE coach_training_invitations SET consumed_at=? WHERE id=? AND consumed_at IS NULL").bind(now,row.id).run();
  if(Number(done?.meta?.changes)!==1)return fail(409,"Invitation already used.",request,env);
  await env.DB.prepare("INSERT INTO coach_training_links (coach_user_id,client_user_id,training_permission,nutrition_permission,accepted_at,revoked_at) VALUES (?,?,1,?,?,NULL) ON CONFLICT(coach_user_id,client_user_id) DO UPDATE SET training_permission=1,nutrition_permission=excluded.nutrition_permission,accepted_at=excluded.accepted_at,revoked_at=NULL").bind(row.coach_user_id,user.id,data?.nutrition===true?1:0,now).run();
  return response({connected:true,scopes:{training:true,nutrition:data?.nutrition===true}},200,request,env)
 }
 if(path==="/v1/client/coach-links"&&method==="GET"){
  const links=await env.DB.prepare("SELECT l.coach_user_id,coalesce(u.display_name,u.email) coach_name,l.training_permission,l.nutrition_permission,l.accepted_at FROM coach_training_links l JOIN users u ON u.id=l.coach_user_id WHERE l.client_user_id=? AND l.revoked_at IS NULL").bind(user.id).all();return response({links:links.results||[]},200,request,env)
 }
 const revoke=path.match(/^\/v1\/client\/coach-links\/([0-9a-f-]{36})$/i);
 if(revoke&&method==="DELETE"){
  await env.DB.prepare("UPDATE coach_training_links SET revoked_at=? WHERE coach_user_id=? AND client_user_id=? AND revoked_at IS NULL").bind(now,revoke[1],user.id).run();return response({revoked:true},200,request,env)
 }
 if(path==="/v1/coach/clients"&&method==="GET"){
  if(!isCoach(user,env))return fail(403,"Coach authorization required.",request,env);
  const clients=await env.DB.prepare("SELECT l.client_user_id AS id,coalesce(u.display_name,u.email) name,l.training_permission,l.nutrition_permission,l.accepted_at FROM coach_training_links l JOIN users u ON u.id=l.client_user_id WHERE l.coach_user_id=? AND l.revoked_at IS NULL AND l.training_permission=1 ORDER BY l.accepted_at DESC").bind(user.id).all();return response({clients:clients.results||[]},200,request,env)
 }
 const view=path.match(/^\/v1\/coach\/clients\/([0-9a-f-]{36})\/analytics$/i);
 if(view&&method==="GET"){
  if(!isCoach(user,env))return fail(403,"Coach authorization required.",request,env);
  const link=await env.DB.prepare("SELECT training_permission,nutrition_permission FROM coach_training_links WHERE coach_user_id=? AND client_user_id=? AND revoked_at IS NULL").bind(user.id,view[1]).first();
  if(!link?.training_permission)return fail(403,"Client has not authorized training access.",request,env);
  const row=await env.DB.prepare("SELECT payload,updated_at FROM backups WHERE user_id=?").bind(view[1]).first();
  if(!row)return fail(404,"Client has not synchronized an app backup yet.",request,env);
  let backup;try{backup=JSON.parse(row.payload)}catch{return fail(500,"Unable to read cloud snapshot.",request,env)}
  return response({clientId:view[1],cloudUpdatedAt:row.updated_at,...scopedAnalytics(backup,{training:true,nutrition:!!link.nutrition_permission})},200,request,env)
 }
 return fail(404,"Not found.",request,env)
}
