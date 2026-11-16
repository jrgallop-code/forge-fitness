import test from "node:test";
import assert from "node:assert/strict";
import {coachCalendarRoute} from "../cloud/src/coach-calendar.js";
const coach={id:"email:coach",email:"coach@example.com"},client={id:"email:athlete",email:"athlete@example.com"};
function database(){
 let schedule=null;
 return{
  prepare(sql){return{bind(...args){return{
   first:async()=>sql.includes("FROM coach_program_assignments")?{id:"11111111-1111-4111-8111-111111111111",coach_user_id:coach.id,client_user_id:client.id,status:"published",plan_json:JSON.stringify({name:"Upper Lower",days:[{name:"Upper",exercises:[{id:"bench"}]},{name:"Lower",exercises:[{id:"squat"}]}]})}:sql.includes("FROM coach_assignment_schedules")?schedule:null,
   all:async()=>({results:schedule?[schedule]:[]}),
   run:async()=>{if(sql.startsWith("INSERT")){schedule={assignment_id:args[0],coach_user_id:args[1],client_user_id:args[2],start_date:args[3],weeks:args[4],week_pattern_json:args[5],overrides_json:args[6],version:1,updated_at:args[7]};return{meta:{changes:1}}}
    if(sql.startsWith("UPDATE")){if(schedule.version!==Number(args[7]))return{meta:{changes:0}};schedule={...schedule,start_date:args[0],weeks:args[1],week_pattern_json:args[2],overrides_json:args[3],updated_at:args[4],version:schedule.version+1};return{meta:{changes:1}}}
    throw Error("Unexpected SQL "+sql)}
  }}}}
 }
}
function payload(overrides={}){return{startDate:"2026-11-16",weeks:4,expectedVersion:null,days:[{type:"workout",dayIndex:0},{type:"rest"},{type:"workout",dayIndex:1},{type:"rest"},{type:"workout",dayIndex:0},{type:"rest"},{type:"rest"}],overrides}}
async function call(db,method,body=null,user=coach){
 const req=new Request("https://api.leveluphypertrophy.com/v1/coach/assignments/11111111-1111-4111-8111-111111111111/calendar",{method,...(body?{body:JSON.stringify(body)}:{})});
 const res=await coachCalendarRoute({request:req,env:{ADMIN_EMAILS:"coach@example.com",DB:db},user,url:new URL(req.url)});
 return{status:res.status,body:await res.json()}
}
test("assign calendar with workouts, rest and date override",async()=>{
 const db=database(),initial=await call(db,"PUT",payload({"2026-11-17":{type:"workout",dayIndex:1}}));
 assert.equal(initial.status,201);assert.equal(initial.body.schedule.version,1);
 const get=await call(db,"GET");assert.equal(get.body.schedule.overrides["2026-11-17"].dayIndex,1);
 const stale=await call(db,"PUT",payload());assert.equal(stale.status,409);
});
test("reject out-of-range dates and workout references",async()=>{
 const db=database();
 assert.equal((await call(db,"PUT",payload({"2027-01-01":{type:"rest"}}))).status,400);
 const x=payload();x.days[0]={type:"workout",dayIndex:99};
 assert.equal((await call(db,"PUT",x)).status,400);
});
test("only approved coach role can change schedule",async()=>{
 const db=database();
 const r=await call(db,"PUT",payload(),client);assert.equal(r.status,403);
});
