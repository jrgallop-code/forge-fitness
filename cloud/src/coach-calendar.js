/* Coach-owned workout/rest schedule for an already published assignment.
 * Does not mutate existing training sessions or workout library.
 */
const out=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}});
const allowedCoach=(user,env)=>String(env.ADMIN_EMAILS||"").toLowerCase().split(",").map(x=>x.trim()).includes(String(user?.email||"").toLowerCase());
const day=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+"T12:00:00Z"));
const serial=row=>row?{assignmentId:row.assignment_id,clientId:row.client_user_id,startDate:row.start_date,weeks:row.weeks,days:JSON.parse(row.week_pattern_json),version:Number(row.version),updatedAt:row.updated_at}:null;
async function body(request){try{const t=await request.text();return t.length<20000?JSON.parse(t):null}catch{return null}}
export async function coachCalendarRoute({request,env,user,url}){
 if(!user?.id)return out({error:"Sign in required"},401);
 const pathname=url.pathname,method=request.method;
 const match=pathname.match(/^\/v1\/coach\/assignments\/([0-9a-f-]{36})\/calendar$/i);
 if(match){
  if(!allowedCoach(user,env))return out({error:"Coach permission required"},403);
  const assignment=await env.DB.prepare("SELECT id,coach_user_id,client_user_id,status,plan_json FROM coach_program_assignments WHERE id=? AND coach_user_id=?").bind(match[1],user.id).first();
  if(!assignment)return out({error:"Program assignment not found"},404);
  const existing=await env.DB.prepare("SELECT * FROM coach_assignment_schedules WHERE assignment_id=? AND coach_user_id=?").bind(assignment.id,user.id).first();
  if(method==="GET")return out({schedule:serial(existing),assignmentId:assignment.id});
  if(method!=="PUT")return out({error:"Method not allowed"},405);
  if(assignment.status!=="published")return out({error:"Only published programs can be scheduled"},409);
  const input=await body(request),weeks=Number(input?.weeks),pattern=input?.days,expected=input?.expectedVersion;
  if(!day(input?.startDate)||!Number.isInteger(weeks)||weeks<1||weeks>52)return out({error:"Choose a valid start date and 1–52 weeks"},400);
  if(!Array.isArray(pattern)||pattern.length!==7)return out({error:"Exactly seven weekdays are required"},400);
  const clean=pattern.map((x,index)=>{
   if(!x||!["rest","workout"].includes(x.type))return null;
   if(x.type==="rest")return{weekday:index,type:"rest"};
   const dayIndex=Number(x.dayIndex);
   if(!Number.isInteger(dayIndex)||dayIndex<0||dayIndex>13)return null;
   return{weekday:index,type:"workout",dayIndex};
  });
  if(clean.some(x=>x===null))return out({error:"Each day must be a valid workout or rest day"},400);
  let training;try{training=JSON.parse(assignment.plan_json||"{}")}catch{return out({error:"Published workout plan is invalid"},503)}
  if(clean.some(x=>x.type==="workout"&&!training.days?.[x.dayIndex]))return out({error:"A scheduled workout references a missing day in the published program"},400);
  if(existing&&Number(expected)!==Number(existing.version)||!existing&&expected!==null)return out({error:"Calendar was edited in another session. Reload before saving.",currentVersion:existing?.version??null},409);
  const now=new Date().toISOString(),encoded=JSON.stringify(clean);
  if(existing){
   const updated=await env.DB.prepare("UPDATE coach_assignment_schedules SET start_date=?,weeks=?,week_pattern_json=?,version=version+1,updated_at=? WHERE assignment_id=? AND coach_user_id=? AND version=?").bind(input.startDate,weeks,encoded,now,assignment.id,user.id,Number(expected)).run();
   if(Number(updated.meta?.changes)!==1)return out({error:"Calendar version conflict"},409);
  }else{
   await env.DB.prepare("INSERT INTO coach_assignment_schedules (assignment_id,coach_user_id,client_user_id,start_date,weeks,week_pattern_json,version,updated_at,created_at) VALUES (?,?,?,?,?,?,1,?,?)").bind(assignment.id,user.id,assignment.client_user_id,input.startDate,weeks,encoded,now,now).run();
  }
  return out({schedule:{assignmentId:assignment.id,clientId:assignment.client_user_id,startDate:input.startDate,weeks,days:clean,version:existing?Number(existing.version)+1:1,updatedAt:now}},existing?200:201);
 }
 if(pathname==="/v1/client/coach-calendars"&&method==="GET"){
  const rows=await env.DB.prepare("SELECT s.* FROM coach_assignment_schedules s JOIN coach_program_assignments a ON a.id=s.assignment_id WHERE s.client_user_id=? AND a.status='published' AND (a.coach_user_id=a.client_user_id OR EXISTS(SELECT 1 FROM coach_training_links l WHERE l.coach_user_id=a.coach_user_id AND l.client_user_id=a.client_user_id AND l.training_permission=1 AND l.revoked_at IS NULL)) ORDER BY s.updated_at DESC LIMIT 80").bind(user.id).all();
  return out({schedules:(rows.results||[]).map(serial)});
 }
 return out({error:"Not found"},404);
}
