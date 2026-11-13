/* Versioned, authenticated coach-assigned workout programs.
 * These endpoints are additive. Never mutate the athlete's cloud backup.
 * Publishing requires coach account permission and an active athlete link;
 * owner self-test is allowed only when coachUserId === clientUserId.
 */
const json=(v,status,req,env)=>{const h=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, private, max-age=0","X-Content-Type-Options":"nosniff"});const origin=req.headers.get("Origin");if(new Set(String(env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim())).has(origin)){h.set("Access-Control-Allow-Origin",origin);h.set("Vary","Origin")}return new Response(JSON.stringify(v),{status,headers:h})};
const err=(code,reason,req,env)=>json({error:reason},code,req,env);
const clean=(v,max=120)=>String(v??"").trim().slice(0,max);
const number=(v)=>v===null||v===undefined||v===""?null:Number.isFinite(Number(v))?Number(v):null;
const permitted=(v)=>v&&typeof v==="object"&&!Array.isArray(v);
function sanitizeExercise(raw){if(!permitted(raw))return null;const id=clean(raw.id,160);if(!id)return null;const out={id};const sets=number(raw.sets);if(sets!==null)out.sets=Math.max(0,Math.min(30,Math.round(sets)));if(raw.reps!==undefined)out.reps=clean(raw.reps,80);if(raw.notes!==undefined)out.notes=clean(raw.notes,1000);for(const key of ["trackingType","machineId","groupId","groupType","equipment","equipmentId","equipmentTag"]){if(raw[key]!=null)out[key]=clean(raw[key],100)}
if(raw.restSetting&&permitted(raw.restSetting))out.restSetting={enabled:raw.restSetting.enabled===true,seconds:Math.max(0,Math.min(600,Math.round(number(raw.restSetting.seconds)||0)))};
if(Array.isArray(raw.setTargets))out.setTargets=raw.setTargets.slice(0,30).map(x=>{if(!permitted(x))return null;const target={};for(const key of ["reps","weight","rir","seconds","duration","restSeconds"]){if(x[key]!==undefined){if(key==="reps"&&typeof x[key]==="string")target[key]=clean(x[key],60);else{const n=number(x[key]);if(n!==null&&n>=0&&n<=10000)target[key]=n}}}return target}).filter(Boolean);
return out}
function sanitizePlan(plan){if(!permitted(plan)||!Array.isArray(plan.days)||!plan.days.length||plan.days.length>14)return null;
const days=plan.days.map(day=>{if(!permitted(day)||!Array.isArray(day.exercises)||day.exercises.length>60)return null;const exercises=day.exercises.map(sanitizeExercise);if(exercises.some(x=>!x))return null;return{name:clean(day.name||"Workout Day",120),exercises}});if(days.some(x=>!x))return null;return{name:clean(plan.name||"Client Coaching Plan",120),days}}
function sanitizeGoals(input){const goals={};const weight=number(input?.goalWeightLb);if(weight!==null&&weight>0&&weight<=1000)goals.goalWeightLb=Math.round(weight*10)/10;const steps=number(input?.stepGoal);if(steps!==null&&steps>=1000&&steps<=50000)goals.stepGoal=Math.round(steps);return goals}
function sanitizeNutrition(raw){if(!permitted(raw))return null;const out={};const meal=clean(raw.mealGuidance,3000);if(meal)out.mealGuidance=meal;const cal=number(raw.calorieTarget);if(cal!==null&&cal>=500&&cal<=10000)out.calorieTarget=Math.round(cal);for(const key of ["protein","carbs","fat"]){const n=number(raw[key]);if(n!==null&&n>=0&&n<=1500)out[key]=Math.round(n)}return out}
async function read(req){try{const body=await req.text();if(body.length>160000)return null;return JSON.parse(body)}catch{return null}}
const coachAllowed=(user,env)=>String(env.ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).includes(String(user?.email||"").toLowerCase());
function serialize(row,includePlan=true){const result={id:row.id,sourcePlanId:row.source_plan_id,clientId:row.client_user_id,coachId:row.coach_user_id,name:row.name,version:Number(row.version),status:row.status,publishedAt:row.published_at,updatedAt:row.updated_at,goals:JSON.parse(row.goals_json||"{}"),includeNutrition:!!row.nutrition_json};if(includePlan){result.training=JSON.parse(row.plan_json);result.nutrition=row.nutrition_json?JSON.parse(row.nutrition_json):null}return result}
export async function coachAssignmentRoute({request,env,user,url}){
const path=url.pathname,method=request.method,now=new Date().toISOString();
if(!user?.id)return err(401,"Sign in required.",request,env);
if(path==="/v1/coach/assignments"&&method==="POST"){
 if(!coachAllowed(user,env))return err(403,"Coach authorization required.",request,env);
 const input=await read(request);if(!permitted(input))return err(400,"Invalid assignment JSON.",request,env);
 const clientId=clean(input.clientId,64),sourcePlanId=clean(input.sourcePlanId,120),training=sanitizePlan(input.training);
 if(!/^[0-9a-f-]{36}$/i.test(clientId)||!sourcePlanId||!training||!training.days.some(d=>d.exercises.length))return err(400,"A valid client, source plan, and workout are required.",request,env);
 const self=user.id===clientId;
 if(!self){const link=await env.DB.prepare("SELECT training_permission FROM coach_training_links WHERE coach_user_id=? AND client_user_id=? AND revoked_at IS NULL").bind(user.id,clientId).first();if(!link?.training_permission)return err(403,"The client has not approved this coach.",request,env)}
 const found=await env.DB.prepare("SELECT id,version FROM coach_program_assignments WHERE coach_user_id=? AND client_user_id=? AND source_plan_id=?").bind(user.id,clientId,sourcePlanId).first();
 const expected=input.expectedVersion==null?null:Number(input.expectedVersion);
 if((found&&expected!==Number(found.version))||(!found&&expected!==null))return err(409,"The program has a newer version. Refresh before publishing.",request,env);
 if(input.includeNutrition===true&&!self){const permission=await env.DB.prepare("SELECT nutrition_permission FROM coach_training_links WHERE coach_user_id=? AND client_user_id=? AND revoked_at IS NULL").bind(user.id,clientId).first();if(!permission?.nutrition_permission)return err(403,"The athlete has not approved nutrition coaching access.",request,env)}
 const goals=sanitizeGoals(input.goals||{});const nutrition=input.includeNutrition===true?sanitizeNutrition(input.nutrition||{}):null;
 const planJson=JSON.stringify(training),goalJson=JSON.stringify(goals),nutritionJson=nutrition?JSON.stringify(nutrition):null;
 if(planJson.length>110000||goalJson.length>3000||(nutritionJson&&nutritionJson.length>10000))return err(413,"This plan exceeds the size limit.",request,env);
 if(found){const outcome=await env.DB.prepare("UPDATE coach_program_assignments SET name=?,plan_json=?,goals_json=?,nutrition_json=?,version=version+1,status='published',published_at=?,updated_at=? WHERE id=? AND version=?").bind(training.name,planJson,goalJson,nutritionJson,now,now,found.id,found.version).run();if(Number(outcome.meta?.changes)!==1)return err(409,"The program was updated elsewhere. Refresh first.",request,env)}
 else{try{await env.DB.prepare("INSERT INTO coach_program_assignments (id,coach_user_id,client_user_id,source_plan_id,name,plan_json,goals_json,nutrition_json,version,status,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,1,'published',?,?,?)").bind(crypto.randomUUID(),user.id,clientId,sourcePlanId,training.name,planJson,goalJson,nutritionJson,now,now,now).run()}catch{return err(409,"Program already exists. Refresh before publishing.",request,env)}}
 const row=await env.DB.prepare("SELECT * FROM coach_program_assignments WHERE coach_user_id=? AND client_user_id=? AND source_plan_id=?").bind(user.id,clientId,sourcePlanId).first();
 return json({assignment:serialize(row)},found?200:201,request,env)
}
if(path==="/v1/client/coach-assignments"&&method==="GET"){
 const rows=await env.DB.prepare("SELECT a.* FROM coach_program_assignments a WHERE a.client_user_id=? AND a.status='published' AND (a.coach_user_id=a.client_user_id OR EXISTS (SELECT 1 FROM coach_training_links l WHERE l.coach_user_id=a.coach_user_id AND l.client_user_id=a.client_user_id AND l.revoked_at IS NULL AND l.training_permission=1)) ORDER BY a.published_at DESC LIMIT 60").bind(user.id).all();
 return json({assignments:(rows.results||[]).map(row=>serialize(row))},200,request,env)
}
// Athlete acceptance is explicit, version-scoped and does not mutate any workout, food or weight data.
const decisionPath=path.match(/^\/v1\/coach\/assignments\/([0-9a-f-]{36})\/decision$/i);
if(decisionPath&&method==="POST"){
 const input=await read(request);
 const decision=clean(input?.decision,24);
 if(!["accepted","declined"].includes(decision))return err(400,"Decision must be accepted or declined.",request,env);
 const row=await env.DB.prepare("SELECT id,client_user_id,coach_user_id,version,status FROM coach_program_assignments WHERE id=? AND client_user_id=?").bind(decisionPath[1],user.id).first();
 if(!row||row.status!=="published")return err(404,"Active assignment not found.",request,env);
 if(row.coach_user_id!==user.id){
  const link=await env.DB.prepare("SELECT training_permission FROM coach_training_links WHERE coach_user_id=? AND client_user_id=? AND revoked_at IS NULL").bind(row.coach_user_id,user.id).first();
  if(!link?.training_permission)return err(403,"Coaching connection is not active.",request,env);
 }
 const requested=Number(input?.version);
 if(!Number.isSafeInteger(requested)||requested!==Number(row.version))return err(409,"This revision is out of date. Refresh your plans.",request,env);
 const existing=await env.DB.prepare("SELECT decision FROM coach_assignment_decisions WHERE assignment_id=? AND client_user_id=? AND version=?").bind(row.id,user.id,requested).first();
 if(existing&&existing.decision!==decision)return err(409,"This revision already has a different recorded decision.",request,env);
 await env.DB.prepare("INSERT OR IGNORE INTO coach_assignment_decisions (assignment_id,client_user_id,version,decision,responded_at) VALUES (?,?,?,?,?)").bind(row.id,user.id,requested,decision,now).run();
 return json({assignmentId:row.id,version:requested,decision},200,request,env);
}
const id=path.match(/^\/v1\/coach\/assignments\/([0-9a-f-]{36})$/i);
if(id&&method==="GET"){if(!coachAllowed(user,env))return err(403,"Coach authorization required.",request,env);const row=await env.DB.prepare("SELECT * FROM coach_program_assignments WHERE id=? AND coach_user_id=?").bind(id[1],user.id).first();if(!row)return err(404,"Assignment not found.",request,env);return json({assignment:serialize(row)},200,request,env)}
if(id&&method==="DELETE"){if(!coachAllowed(user,env))return err(403,"Coach authorization required.",request,env);const result=await env.DB.prepare("UPDATE coach_program_assignments SET status='archived',updated_at=? WHERE id=? AND coach_user_id=?").bind(now,id[1],user.id).run();if(!result.meta?.changes)return err(404,"Assignment not found.",request,env);return json({archived:true},200,request,env)}
return err(404,"Not found.",request,env)
}
