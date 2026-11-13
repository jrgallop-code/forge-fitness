import test from "node:test";
import assert from "node:assert/strict";
import { coachAssignmentRoute } from "../cloud/src/coach-assignments.js";

const coachId="11111111-1111-4111-8111-111111111111";
const athleteId="22222222-2222-4222-8222-222222222222";
const assignmentId="33333333-3333-4333-8333-333333333333";
const activeRow={assignment_id:assignmentId,version:2,client_user_id:athleteId,coach_user_id:coachId,status:"published",nutrition_json:JSON.stringify({calorieTarget:3000,protein:180,carbs:390,fat:80}),goals_json:JSON.stringify({goalWeightLb:180})};

function database({approved=true,permission=true,selected=false}={}){
 const writes=[];
 const DB={
  prepare(sql){
   let params=[];
   return {
    bind(...values){params=values;return this},
    async first(){
     if(sql.includes("FROM coach_client_nutrition_selection"))return selected?{assignment_id:assignmentId,version:2,enabled:1}:null;
     if(sql.includes("FROM coach_assignment_versions v"))return approved?activeRow:null;
     if(sql.includes("FROM coach_training_links"))return permission?{nutrition_permission:1,training_permission:1}:null;
     return null;
    },
    async run(){writes.push({sql,params});return {meta:{changes:1}}}
   };
  }
 };
 return {DB,writes};
}
function call(env,method,body,path="/v1/client/coach-nutrition"){
 const request=new Request("https://api.leveluphypertrophy.com"+path,{method,headers:method==="POST"?{"content-type":"application/json"}:{},...(body?{body:JSON.stringify(body)}:{})});
 return coachAssignmentRoute({request,env:{DB:env.DB,ALLOWED_ORIGINS:""},url:new URL(request.url),user:{id:athleteId,email:"athlete@example.test"}});
}
test("nutrition activation requires athlete acceptance",async()=>{
 const env=database({approved:false});
 const response=await call(env,"POST",{enabled:true,assignmentId,version:2});
 assert.equal(response.status,403);assert.equal(env.writes.length,0);
});
test("nutrition activation requires live coaching permission",async()=>{
 const env=database({permission:false});
 const response=await call(env,"POST",{enabled:true,assignmentId,version:2});
 assert.equal(response.status,403);assert.equal(env.writes.length,0);
});
test("accepted coach nutrition syncs with immutable snapshot",async()=>{
 const env=database();
 const response=await call(env,"POST",{enabled:true,assignmentId,version:2});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.enabled,true);
 assert.equal(body.assignment.version,2);
 assert.equal(body.assignment.nutrition.calorieTarget,3000);
 assert.equal(env.writes.length,1);
 assert.match(env.writes[0].sql,/coach_client_nutrition_selection/);
});
test("athlete can disable coach nutrition without deleting past decisions",async()=>{
 const env=database();
 const response=await call(env,"POST",{enabled:false});
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{enabled:false});
 assert.equal(env.writes.length,1);
 assert.doesNotMatch(env.writes[0].sql,/DELETE FROM coach_assignment_decisions/);
});
test("revoke consent disables remote coach target retrieval",async()=>{
 const env=database({selected:true,permission:false});
 const response=await call(env,"GET");
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{enabled:false});
});
test("missing account session is rejected",async()=>{
 const env=database();
 const request=new Request("https://api.leveluphypertrophy.com/v1/client/coach-nutrition");
 const response=await coachAssignmentRoute({request,env:{DB:env.DB},url:new URL(request.url),user:null});
 assert.equal(response.status,401);
});
