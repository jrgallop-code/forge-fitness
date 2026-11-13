import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const coachId='11111111-1111-4111-8111-111111111111';
const athleteId='22222222-2222-4222-8222-222222222222';
const coachToken=process.env.COACH_TEST_TOKEN || 'coach-testing-only-fake-bearer';
const athleteToken=process.env.ATHLETE_TEST_TOKEN || 'athlete-testing-only-fake-bearer';
const base=process.env.COACH_BASE_URL || 'http://127.0.0.1:8787';
const hash=token=>createHash('sha256').update(token).digest('hex');
const time='2026-11-13T00:00:00.000Z';
const hashSql=token=>"'"+hash(token)+"'";
function seed(){
 const sql=[
  "INSERT INTO users (id,email,created_at,updated_at) VALUES ('"+coachId+"','coach@example.test','"+time+"','"+time+"');",
  "INSERT INTO users (id,email,created_at,updated_at) VALUES ('"+athleteId+"','athlete@example.test','"+time+"','"+time+"');",
  "INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES ("+hashSql(coachToken)+",'"+coachId+"','9999-12-31T23:59:59.999Z','"+time+"');",
  "INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES ("+hashSql(athleteToken)+",'"+athleteId+"','9999-12-31T23:59:59.999Z','"+time+"');",
  "INSERT INTO coach_training_links(coach_user_id,client_user_id,training_permission,nutrition_permission,accepted_at) VALUES ('"+coachId+"','"+athleteId+"',1,1,'"+time+"');"
 ].join('\n');
 writeFileSync('/tmp/coach-local-e2e-seed.sql',sql);
}
async function api(path,token,method='GET',payload){
 const response=await fetch(base+path,{
  method,headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(10000)
 });
 return {status:response.status,body:await response.json().catch(()=>null)};
}
async function waitReady(){
 for(let i=0;i<45;i++){
  try{const res=await fetch(base+'/v1/me',{signal:AbortSignal.timeout(1200)});if(res.status!==502&&res.status!==503)return}
  catch{}
  await new Promise(r=>setTimeout(r,1000));
 }
 throw Error('Local Worker did not start');
}
async function run(){
 await waitReady();
 const training={name:'Test Plan',days:[{name:'A',exercises:[{id:'barbell-bench-press',sets:3,reps:'6-10'}]}]};
 const input=(expectedVersion,calorieTarget,protein,carbs,fat)=>({
  clientId:athleteId,sourcePlanId:'local-http-test',training,includeNutrition:true,goals:{goalWeightLb:180},
  nutrition:{calorieTarget,protein,carbs,fat},
  ...(expectedVersion==null?{}:{expectedVersion})
 });
 const me=await api('/v1/me',athleteToken);
 assert.equal(me.status,200,JSON.stringify(me));
 const unauthorized=await api('/v1/client/coach-assignments','invalid-token');
 assert.equal(unauthorized.status,401);
 const published=await api('/v1/coach/assignments',coachToken,'POST',input(null,3000,180,390,80));
 assert.equal(published.status,201,JSON.stringify(published));
 const id=published.body.assignment.id;
 assert.equal((await api('/v1/client/coach-nutrition',athleteToken)).body.enabled,false);
 assert.equal((await api('/v1/client/coach-assignments',athleteToken)).body.assignments[0].version,1);
 assert.equal((await api('/v1/coach/assignments/'+id+'/decision',athleteToken,'POST',{decision:'accepted',version:1})).status,200);
 const active=await api('/v1/client/coach-nutrition',athleteToken,'POST',{enabled:true,assignmentId:id,version:1});
 assert.equal(active.status,200,JSON.stringify(active));
 const newPlan=await api('/v1/coach/assignments',coachToken,'POST',input(1,3100,185,410,80));
 assert.equal(newPlan.status,200,JSON.stringify(newPlan));
 assert.equal((await api('/v1/client/coach-nutrition',athleteToken)).body.assignment.version,1);
 assert.equal((await api('/v1/coach/assignments/'+id+'/decision',athleteToken,'POST',{decision:'accepted',version:2})).status,200);
 assert.equal((await api('/v1/client/coach-nutrition',athleteToken,'POST',{enabled:true,assignmentId:id,version:2})).status,200);
 const sync=await api('/v1/client/coach-nutrition',athleteToken);
 assert.equal(sync.body.assignment.nutrition.calorieTarget,3100);
 assert.equal((await api('/v1/client/coach-nutrition',athleteToken,'POST',{enabled:false})).status,200);
 assert.equal((await api('/v1/client/coach-nutrition',athleteToken)).body.enabled,false);
 process.stdout.write('Local authenticated Worker E2E: PASSED\n');
}
if(process.argv[2]==='seed')seed();
else if(process.argv[2]==='run')await run();
else throw Error('Expected seed or run');
