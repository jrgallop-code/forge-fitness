/* Single-account Level Up Coach test bridge.
 * Runs ONLY as a Vercel Function behind preview SSO.
 * Authenticates the account owner through existing Level Up Cloud endpoints.
 * Never permits selecting another user ID or fetching any other user's backup.
 * Does not store account passwords, tokens, or backups.
 */
const CLOUD="https://api.leveluphypertrophy.com";
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""));
const list=x=>Array.isArray(x)?x:[];
const num=x=>{if(x===null||x===undefined||x==="")return null;const n=Number(x);return Number.isFinite(n)?n:null};
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const short=(x,size=140)=>String(x??"").slice(0,size);
const headers={"Cache-Control":"no-store, private, max-age=0","X-Content-Type-Options":"nosniff","Content-Type":"application/json; charset=utf-8"};
function finish(res,status,payload){for(const [k,v] of Object.entries(headers))res.setHeader(k,v);res.status(status).json(payload)}
async function fromCloud(path,method,body,bearer){const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),12000);try{const r=await fetch(CLOUD+path,{method,headers:{"Accept":"application/json",...(body?{"Content-Type":"application/json"}:{}),...(bearer?{"Authorization":"Bearer "+bearer}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:abort.signal});let result;try{result=await r.json()}catch{result={error:"The Level Up service returned an invalid response."}}return {status:r.status,data:result}}finally{clearTimeout(timeout)}}
function normalizeWeight(row){if(!isDate(row?.date))return null;const w=num(row.weight??row.value);if(w===null||w<=0||w>1000)return null;return {date:row.date,weight:w,unit:short(row.unit||"lb",4)}}
function session(row){if(!isDate(row?.date))return null;return{date:row.date,id:short(row.id,100),name:short(row.name||row.title,120),exercises:list(row.exercises).slice(0,100).map(x=>({exerciseId:short(x.exerciseId||x.id,100),sets:list(x.sets).slice(0,80).map(s=>({weight:num(s.weight)??0,reps:num(s.reps)??0,rir:num(s.rir),completed:s.completed===true}))})).filter(x=>x.exerciseId)}}
function totalFoodItem(item){const n=item?.nutrition||item||{};return {name:short(item.name||item.foodName||"Food"),meal:short(item.meal,35),nutrition:{calories:num(n.calories)||0,protein:num(n.protein)||0,carbs:num(n.carbs)||0,fat:num(n.fat)||0}}}
function foodInfo(data){const logs=data.level_up_food_log_v1||{},cache=data.level_up_calorie_daily_totals_cache_v1||{},complete=data.level_up_food_log_complete_days_v1||{},foodDays={},foodLog={};if(!logs||typeof logs!=="object"||Array.isArray(logs))return{foodDays,foodLog};
const dates=[...new Set([...Object.keys(logs),...Object.keys(cache),...Object.keys(complete)].filter(isDate))].sort().slice(-365);
for(const date of dates){const entries=list(logs[date]).slice(0,150).map(totalFoodItem),stored=cache[date]?.totals,calories=num(stored?.calories),sum=entries.reduce((n,v)=>n+Math.max(0,v.nutrition.calories),0);
foodDays[date]={logged:entries.length>0,complete:complete[date]===true,calories:calories!==null&&calories>=0?calories:sum,protein:num(stored?.protein)??entries.reduce((n,v)=>n+v.nutrition.protein,0),carbs:num(stored?.carbs)??entries.reduce((n,v)=>n+v.nutrition.carbs,0),fat:num(stored?.fat)??entries.reduce((n,v)=>n+v.nutrition.fat,0)};foodLog[date]=entries}
return{foodDays,foodLog}}
function expenditure(data){return list(data.level_up_weekly_tdee_history_v1).filter(x=>isDate(x.date)&&num(x.maintenanceCalories)!==null).slice(-365).map(x=>({date:x.date,maintenanceCalories:Math.round(Number(x.maintenanceCalories))}))}
function project(backup,{nutrition=false}={}){const data=backup?.data||{},weightEntries=list(data.forge_weight_entries).map(normalizeWeight).filter(Boolean).slice(-2500),sessions=list(data.forge_workout_sessions).map(session).filter(Boolean).slice(-1500),goal=num(data.level_up_goal_weight),result={source:"own-level-up-cloud-backup",asOf:backup.exportedAt||null,sessions,weightEntries,goalWeight:goal,sharedScopes:{training:true,nutrition:!!nutrition}};
if(nutrition){const details=foodInfo(data);result.foodLog=details.foodLog;result.foodDays=details.foodDays;result.expenditure=expenditure(data);const plan=data.level_up_nutrition_plan||{},cal=num(plan.calculatedCalories)||num(data.level_up_active_calorie_target_snapshot?.calories);result.nutritionPlan={calculatedCalories:cal,macroPreference:data.level_up_nutrition_macro||null}}return result}
export default async function handler(req,res){
if(req.method!=="POST"){res.setHeader("Allow","POST");return finish(res,405,{error:"Method not allowed"})}
const input=typeof req.body==="object"&&req.body&&!Array.isArray(req.body)?req.body:{};
if(JSON.stringify(input).length>10000)return finish(res,413,{error:"Request too large"});
try{
if(input.action==="login"){
 const mode=input.mode==="transfer"?"transfer":"email";
 const payload=mode==="transfer"?{code:short(input.code,40),platform:"pwa"}:{email:short(input.email,254).trim().toLowerCase(),password:String(input.password||"").slice(0,300),platform:"pwa"};
 if(mode==="transfer"&&!/^[A-Z2-9-]{8,9}$/.test(payload.code))return finish(res,400,{error:"Enter the one-time Level Up code."});
 if(mode==="email"&&(!payload.email.includes("@")||!payload.password))return finish(res,400,{error:"Enter your Level Up email and password."});
 const response=await fromCloud(mode==="transfer"?"/v1/session/transfer":"/v1/session/email","POST",payload);
 if(response.status>=400)return finish(res,response.status,{error:response.data.error||"Unable to sign in."});
 const user=response.data.user||{};
 return finish(res,200,{token:response.data.token,expiresAt:response.data.expiresAt,user:{id:user.id,name:user.name||user.displayName||null,email:user.email||null}})
}
const auth=String(req.headers.authorization||""),match=auth.match(/^Bearer\s+([A-Za-z0-9._~-]{20,512})$/);
if(!match)return finish(res,401,{error:"Sign in to your Level Up account first."});
const bearer=match[1];
if(input.action==="me"){
 const response=await fromCloud("/v1/me","GET",null,bearer);
 if(response.status>=400)return finish(res,response.status,{error:response.data.error||"Session expired."});
 return finish(res,200,{user:response.data.user||null});
}
if(input.action==="snapshot"){
 if(input.approved!==true)return finish(res,400,{error:"You must approve reading your own cloud backup."});
 const response=await fromCloud("/v1/backup","GET",null,bearer);
 if(response.status>=400)return finish(res,response.status,{error:response.data.error||"No cloud backup available. In Level Up choose Back Up Now."});
 const backup=response.data.backup;
 if(backup?.app!=="level-up"||!backup?.data)return finish(res,422,{error:"The cloud snapshot is not a valid Level Up backup."});
 return finish(res,200,{...project(backup,{nutrition:input.nutrition===true}),cloudUpdatedAt:response.data.updatedAt||null,version:response.data.version||null});
}
return finish(res,404,{error:"Unknown action."})
}catch(e){return finish(res,503,{error:e?.name==="AbortError"?"Level Up cloud request timed out.":"Couldn't contact Level Up cloud. Try again."})}
}
