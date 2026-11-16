import test from "node:test";
import assert from "node:assert/strict";
import {coachClientDataRoute} from "../cloud/src/coach-client-data.js";
test("Coach monitoring exposes exercise histories and completed-set muscle credits from authorized athlete only",async()=>{
 const user={id:"email:coach",email:"coach@example.com"},athlete="email:test-athlete";
 const payload={data:{
  forge_weight_entries:[{date:"2026-11-12",weight:171},{date:"2026-11-16",weight:172}],
  level_up_nutrition_profile:{heightCm:184,weightLb:172},
  level_up_weekly_tdee_estimate_v1:{estimate:{maintenanceCalories:2710}},
  forge_workout_sessions:[
   {id:"valid-workout",date:"2026-11-15",exercises:[
    {exerciseId:"barbell-bench-press",sets:[{weight:160,reps:8,completed:true},{weight:170,reps:6,completed:true},{weight:0,reps:0,completed:false}]},
    {exerciseId:"dumbbell-curl",sets:[{weight:30,reps:12,completed:true}]}
   ]}
  ]
 }};
 const db={prepare:sql=>({bind:(...params)=>({first:async()=>{
  if(sql.includes("FROM coach_training_links"))return{training_permission:1,nutrition_permission:1};
  if(sql.includes("FROM users"))return{id:params[0],email:"test@example.com",display_name:"Test Athlete"};
  if(sql.includes("FROM backups"))return{version:1,updated_at:"2026-11-16T14:00:00Z",client_exported_at:null,payload:JSON.stringify(payload)};
  return null
 }})})};
 const req=new Request("https://api.leveluphypertrophy.com/v1/coach/clients/"+encodeURIComponent(athlete)+"/summary");
 const response=await coachClientDataRoute({request:req,env:{ADMIN_EMAILS:"coach@example.com",DB:db},user,url:new URL(req.url)});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.expenditure.calories,2710);
 assert.equal(result.training.exerciseHistory.length,2);
 assert.equal(result.training.exerciseHistory.find(x=>x.exerciseId==="barbell-bench-press").estimated1rm,204);
 assert.equal(result.training.recentExerciseSets.find(x=>x.exerciseId==="barbell-bench-press").sets,2);
 assert.equal(result.training.recentExerciseSets.find(x=>x.exerciseId==="dumbbell-curl").sets,1);
 assert.equal(result.client.id,athlete);
});
