import test from "node:test";
import assert from "node:assert/strict";
import {coachClientDataRoute} from "../cloud/src/coach-client-data.js";
test("real workout summary includes recent sets and filters test preview sessions",async()=>{
 const user={id:"email:self",email:"coach@example.com"};
 const backup={data:{forge_workout_sessions:[
  {id:"genuine-1",completedAt:"2026-11-15T10:00:00.000Z",planName:"Upper Day",exercises:[{exerciseId:"dumbbell-bench-press",sets:[{weight:70,reps:10,completed:true},{weight:0,reps:0,completed:false}]}]},
  {id:"level-up-recap-preview-session",completedAt:"2026-11-16T10:00:00.000Z",exercises:[]}
 ],forge_weight_entries:[{date:"2026-11-10",weight:171.2},{date:"2026-11-15",weight:172.3}],level_up_nutrition_profile:{heightCm:185,weightLb:172.3}}};
 const db={prepare:q=>({bind:()=>({first:async()=>q.includes("FROM users")?{id:user.id,display_name:"Test Athlete",email:user.email}:q.includes("FROM backups")?{version:3,updated_at:"2026-11-16T11:00:00Z",client_exported_at:null,payload:JSON.stringify(backup)}:null})})};
 const req=new Request("https://api.leveluphypertrophy.com/v1/coach/clients/email%3Aself/summary");
 const res=await coachClientDataRoute({request:req,env:{ADMIN_EMAILS:"coach@example.com",DB:db},user,url:new URL(req.url)});
 assert.equal(res.status,200);const body=await res.json();
 assert.equal(body.training.completedCount,1);
 assert.equal(body.training.recentWorkouts[0].name,"Upper Day");
 assert.equal(body.training.recordedSetsCount,1);
 assert.equal(body.training.exerciseLatest[0].estimated1rm,93.3);
 assert.equal(body.profile.heightCm,185);
 assert.equal(body.weight.latest,172.3);
 assert.equal(body.backup.version,3);
});
