import test from "node:test";
import assert from "node:assert/strict";
import {coachClientDataRoute} from "../cloud/src/coach-client-data.js";

const coach={id:"email:coach",email:"coach@example.com"};
const athlete={id:"email:athlete",email:"athlete@example.com"};
const backup={data:{
 level_up_nutrition_profile:{age:33,heightCm:181,sex:"male",activity:"moderate"},
 forge_weight_entries:[{date:"2026-11-10",weight:170},{date:"2026-11-16",weight:172}],
 level_up_weekly_tdee_estimate_v1:{estimate:{maintenanceCalories:2520,foodDays:17,weighIns:12}},
 level_up_food_log_v1:{"2026-11-15":[{nutrition:{calories:820}},{nutrition:{calories:1550}}]},
 forge_workout_sessions:[{date:"2026-11-15",name:"Upper"}],
 sensitive_token:"must-never-be-returned"
}};
function database({link={training_permission:1,nutrition_permission:1},hasBackup=true}={}){
 return{prepare:sql=>({bind:(...args)=>({
  first:async()=>{
   if(sql.includes("FROM coach_training_links"))return link;
   if(sql.includes("FROM users"))return{id:args[0],email:athlete.email,display_name:"Test Athlete"};
   if(sql.includes("FROM backups"))return hasBackup?{version:7,updated_at:"2026-11-16T11:00:00Z",client_exported_at:"2026-11-16T10:00:00Z",payload:JSON.stringify(backup)}:null;
   throw Error("Unrecognized query: "+sql);
  }})})};
}
const invoke=async({who=coach,clientId=athlete.id,link,hasBackup=true,admin=true}={})=>{
 const request=new Request("https://api.leveluphypertrophy.com/v1/coach/clients/"+encodeURIComponent(clientId)+"/summary");
 const env={ADMIN_EMAILS:admin?"coach@example.com":"nobody@example.com",DB:database({link,hasBackup})};
 const response=await coachClientDataRoute({request,env,user:who,url:new URL(request.url)});
 return {status:response.status,body:await response.json()};
};
test("returns safe, account-specific fields and backup version",async()=>{
 const r=await invoke();assert.equal(r.status,200);assert.equal(r.body.client.id,athlete.id);
 assert.equal(r.body.weight.latest,172);assert.equal(r.body.expenditure.calories,2520);
 assert.equal(r.body.nutrition.averageLoggedCalories,2370);
 assert.equal(r.body.training.completedCount,1);
 assert.equal(r.body.backup.version,7);
 assert.equal(JSON.stringify(r.body).includes("must-never-be-returned"),false);
 assert.equal(JSON.stringify(r.body).includes("sensitive_token"),false);
});
test("training-only permission does not expose weight, calories or profile",async()=>{
 const r=await invoke({link:{training_permission:1,nutrition_permission:0}});
 assert.equal(r.status,200);assert.equal(r.body.training.completedCount,1);
 assert.equal(r.body.profile,null);assert.equal(r.body.weight,null);
 assert.equal(r.body.expenditure,null);assert.equal(r.body.nutrition,null);
});
test("revoke or absent permissions block the client",async()=>{
 const r=await invoke({link:null});assert.equal(r.status,403);
});
test("coach must have authorized role",async()=>{
 const r=await invoke({admin:false});assert.equal(r.status,403);
});
test("missing backup reports empty rather than invented data",async()=>{
 const r=await invoke({hasBackup:false});assert.equal(r.status,200);
 assert.equal(r.body.backup.exists,false);assert.equal(r.body.nutrition,null);
});
test("owner self-test is allowed without a link",async()=>{
 const r=await invoke({who:coach,clientId:coach.id,link:null});
 assert.equal(r.status,200);assert.equal(r.body.permissions.self,true);
});
