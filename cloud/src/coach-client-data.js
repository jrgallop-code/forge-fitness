/* Phase 1: coach-safe read model. Athlete backup remains owned by the athlete.
 * This endpoint never returns raw cloud backups, meals, photographs or passwords.
 */
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}});
const validObject=x=>x&&typeof x==="object"&&!Array.isArray(x);
const num=x=>x===null||x===undefined||x===""?null:Number.isFinite(Number(x))?Number(x):null;
const positive=x=>{const n=num(x);return n!==null&&n>0?n:null};
const round=x=>x===null?null:Math.round(x);
const dateText=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||""))?String(x):null;
const canCoach=(user,env)=>String(env.ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).includes(String(user?.email||"").toLowerCase());
const safeArray=x=>Array.isArray(x)?x:[];
async function allowed(user,clientId,env){
 if(user.id===clientId)return{training:true,nutrition:true,self:true};
 const link=await env.DB.prepare("SELECT training_permission,nutrition_permission FROM coach_training_links WHERE coach_user_id=? AND client_user_id=? AND revoked_at IS NULL").bind(user.id,clientId).first();
 return{training:link?.training_permission===1,nutrition:link?.nutrition_permission===1,self:false};
}
function profileSummary(data){
 const p=validObject(data.level_up_nutrition_profile)?data.level_up_nutrition_profile:{};
 const weighIns=safeArray(data.forge_weight_entries).filter(x=>dateText(x?.date)&&positive(x?.weight)!==null).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const last=weighIns.at(-1);
 const heightCm=positive(p.heightCm)??(positive(p.heightFeet)!==null?((Number(p.heightFeet)*12)+(num(p.heightInches)||0))*2.54:null);
 const weightLb=positive(last?.weight)??positive(p.weightLb)??(positive(p.weightKg)!==null?Number(p.weightKg)/0.45359237:null);
 const snapshots=validObject(data.level_up_weekly_tdee_estimate_v1)?data.level_up_weekly_tdee_estimate_v1:{};
 const est=validObject(snapshots.estimate)?snapshots.estimate:snapshots;
 const prior=safeArray(data.level_up_weekly_tdee_history_v1).filter(x=>positive(x?.maintenanceCalories??x?.estimate?.maintenanceCalories)!==null).sort((a,b)=>String(a.date||a.reviewedAt||"").localeCompare(String(b.date||b.reviewedAt||""))).at(-1);
 const tdee=positive(est.liveMaintenanceCalories)??positive(est.maintenanceCalories)??positive(prior?.maintenanceCalories??prior?.estimate?.maintenanceCalories);
 const rawFood=validObject(data.level_up_food_log_v1)?data.level_up_food_log_v1:{};
 const days=Object.entries(rawFood).filter(([k,v])=>dateText(k)&&Array.isArray(v)&&v.length).sort((a,b)=>a[0].localeCompare(b[0])).slice(-21);
 const calories=days.map(([date,items])=>({date,calories:Math.round(items.reduce((sum,x)=>sum+Math.max(0,num(x?.nutrition?.calories)||0),0))})).filter(x=>x.calories>0);
 const macros=validObject(data.level_up_nutrition_macro)?data.level_up_nutrition_macro:{};
 const plan=validObject(data.level_up_nutrition_plan)?data.level_up_nutrition_plan:{};
 const rate=num(est.weightRateLbPerWeek);
 return{
  profile:{age:num(p.age),sex:["male","female"].includes(p.sex)?p.sex:null,heightCm:heightCm?Math.round(heightCm*10)/10:null,weightLb:weightLb?Math.round(weightLb*10)/10:null,activity:p.activity||null},
  weight:{latest:positive(last?.weight),latestDate:dateText(last?.date),weighIns:weighIns.length,history:weighIns.slice(-90).map(x=>({date:x.date,weight:Number(x.weight)}))},
  expenditure:{calories:tdee?Math.round(tdee):null,source:tdee?(positive(est.liveMaintenanceCalories)?"live":positive(est.maintenanceCalories)?"saved":"history"):null,weightRateLbPerWeek:rate},
  nutrition:{currentTarget:positive(plan.currentCalories)??positive(plan.calculatedCalories),macroTargets:validObject(macros.manualMacros)?{protein:num(macros.manualMacros.protein),carbs:num(macros.manualMacros.carbs),fat:num(macros.manualMacros.fat)}:null,loggedDays:calories.length,averageLoggedCalories:calories.length?round(calories.reduce((s,x)=>s+x.calories,0)/calories.length):null,calorieHistory:calories}
 };
}
function trainingSummary(data){
 const sessions=safeArray(data.forge_workout_sessions).filter(x=>x?.id!=="level-up-recap-preview-session");
 const workouts=sessions.map(x=>({
   date:dateText(String(x?.completedAt||x?.endedAt||x?.date||x?.startTime||"").slice(0,10)),
   name:String(x?.trainingDayName||x?.planName||x?.name||x?.title||"Workout").slice(0,100),
   exerciseCount:safeArray(x.exercises).length
 })).filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date));
 const series=[];
 for(const session of sessions){
   const date=dateText(String(session?.completedAt||session?.endedAt||session?.date||session?.startTime||"").slice(0,10));
   if(!date)continue;
   for(const exercise of safeArray(session.exercises)){
     if(exercise?.trackingType==="notes")continue;
     const id=String(exercise?.exerciseId||exercise?.id||"").slice(0,120);if(!id)continue;
     for(const set of safeArray(exercise.sets)){
       if(set?.completed===false)continue;
       const weight=positive(set.weight),reps=positive(set.reps);
       if(weight===null||reps===null||reps>50)continue;
       series.push({date,exerciseId:id,weight:Math.round(weight*100)/100,reps:Math.round(reps),estimated1rm:Math.round(weight*(1+reps/30)*10)/10});
     }
   }
 }
 series.sort((a,b)=>a.date.localeCompare(b.date));
 const latestByExercise=new Map();
 for(const set of series)latestByExercise.set(set.exerciseId,set);
 const recordedSets=series.slice(-250);
 // Coach analytics read model: exact daily best logged estimated 1RM per lift,
 // and daily completed-set credit for muscle-volume attribution in the app.
 const exerciseHistoryMap=new Map();
 const exerciseCounts=[];
 for(const session of sessions){
   const date=dateText(String(session?.completedAt||session?.endedAt||session?.date||session?.startTime||"").slice(0,10));
   if(!date)continue;
   for(const exercise of safeArray(session.exercises)){
     const exerciseId=String(exercise?.exerciseId||exercise?.id||"").slice(0,120);
     if(!exerciseId)continue;
     const sets=safeArray(exercise.sets).filter(x=>x?.completed!==false);
     const best=sets.map(x=>{const w=positive(x?.weight),r=positive(x?.reps);return w!==null&&r!==null&&r<=50?w*(1+r/30):null}).filter(x=>x!==null);
     if(best.length){
       const key=date+"|"+exerciseId,estimate=Math.max(...best);
       if(!exerciseHistoryMap.has(key)||exerciseHistoryMap.get(key).estimated1rm<estimate){
         exerciseHistoryMap.set(key,{date,exerciseId,estimated1rm:Math.round(estimate*10)/10});
       }
     }
     const setCount=sets.length;
     if(setCount)exerciseCounts.push({date,exerciseId,sets:Math.min(30,setCount)});
   }
 }
 const exerciseHistory=[...exerciseHistoryMap.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-1600);
 const setCutoff=new Date(Date.now()-28*86400000).toISOString().slice(0,10);
 const recentExerciseSets=exerciseCounts.filter(x=>x.date>=setCutoff).slice(-1000);
 const last30=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
 return{completedCount:sessions.length,last30Days:workouts.filter(x=>x.date>=last30).length,
  lastCompletedDate:workouts.at(-1)?.date||null,recentWorkouts:workouts.slice(-30),
  recordedSetsCount:series.length,recentSets:recordedSets,
  exerciseLatest:[...latestByExercise.values()].slice(-40),
  exerciseHistory,recentExerciseSets};
}
export async function coachClientDataRoute({request,env,user,url}){
 if(request.method!=="GET")return response({error:"Method not allowed"},405);
 if(!user?.id||!canCoach(user,env))return response({error:"Coach authorization required"},403);
 const match=url.pathname.match(/^\/v1\/coach\/clients\/([^/]+)\/summary$/);
 if(!match)return response({error:"Invalid client path"},404);
 let clientId;try{clientId=decodeURIComponent(match[1])}catch{return response({error:"Malformed client ID"},400)}
 if(!clientId||clientId.length>160)return response({error:"Invalid client ID"},400);
 const permissions=await allowed(user,clientId,env);
 if(!permissions.training&&!permissions.nutrition)return response({error:"No active, athlete-approved coaching link"},403);
 const client=await env.DB.prepare("SELECT id,display_name,email FROM users WHERE id=?").bind(clientId).first();
 if(!client)return response({error:"Client account unavailable"},404);
 const row=await env.DB.prepare("SELECT version,payload,updated_at,client_exported_at FROM backups WHERE user_id=?").bind(clientId).first();
 const base={client:{id:client.id,name:client.display_name||client.email||"Athlete",isSelf:client.id===user.id},permissions,backup:{exists:!!row,version:row?.version??null,syncedAt:row?.updated_at??null,exportedAt:row?.client_exported_at??null}};
 if(!row)return response({...base,training:permissions.training?{completedCount:0,recentWorkouts:[]}:null,nutrition:null,weight:null,expenditure:null,profile:null,reason:"No synced Level Up backup yet"});
 let decoded;try{decoded=JSON.parse(row.payload)}catch{return response({...base,error:"Cloud backup could not be decoded"},503)}
 const data=validObject(decoded?.data)?decoded.data:{};
 const metrics=permissions.nutrition?profileSummary(data):null;
 return response({...base,training:permissions.training?trainingSummary(data):null,profile:metrics?.profile??null,weight:metrics?.weight??null,expenditure:metrics?.expenditure??null,nutrition:metrics?.nutrition??null});
}
