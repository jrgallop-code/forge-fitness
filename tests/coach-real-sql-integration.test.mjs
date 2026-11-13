import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { coachAssignmentRoute } from '../cloud/src/coach-assignments.js';

const coach='11111111-1111-4111-8111-111111111111';
const athlete='22222222-2222-4222-8222-222222222222';
const unrelated='44444444-4444-4444-8444-444444444444';
const origin='https://api.leveluphypertrophy.com';
const coachUser={id:coach,email:'coach@example.test'};
const athleteUser={id:athlete,email:'athlete@example.test'};
const stranger={id:unrelated,email:'stranger@example.test'};
const training={name:'Upper / Lower',days:[{name:'Upper A',exercises:[{id:'barbell-bench-press',sets:3,reps:'6-10',setTargets:[{weight:135,reps:8}]}]}]};
const nutrition=(calorieTarget,protein,carbs,fat)=>({calorieTarget,protein,carbs,fat});
const proposal=(expectedVersion,calorieTarget,protein,carbs,fat,goalWeightLb)=>({
  clientId:athlete,sourcePlanId:'pilot',training,includeNutrition:true,
  goals:{goalWeightLb},nutrition:nutrition(calorieTarget,protein,carbs,fat),
  ...(expectedVersion===null?{}:{expectedVersion})
});

function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY);');
 for(const id of [coach,athlete,unrelated])db.prepare('INSERT INTO users(id) VALUES (?)').run(id);
 for(const file of ['20261113_coach_assignment_decisions.sql','20261113_coach_program_assignments.sql','20261113_coach_training_consent.sql','20261114_coach_assignment_versions.sql']){
  db.exec(readFileSync(new URL('../cloud/migrations/'+file,import.meta.url),'utf8'));
 }
 db.prepare("INSERT INTO coach_training_links(coach_user_id,client_user_id,training_permission,nutrition_permission,accepted_at) VALUES (?,?,1,1,?)").run(coach,athlete,new Date().toISOString());
 const api={
  prepare(sql){
   let statement,params=[];
   return {
    bind(...v){params=v;return this},
    async first(){statement=db.prepare(sql);return statement.get(...params)||null},
    async all(){statement=db.prepare(sql);return {results:statement.all(...params)}},
    async run(){statement=db.prepare(sql);const meta=statement.run(...params);return {meta:{changes:meta.changes}}}
   };
  },
  async batch(items){
   db.exec('BEGIN');
   try{const result=[];for(const item of items)result.push(await item.run());db.exec('COMMIT');return result}
   catch(error){db.exec('ROLLBACK');throw error}
  }
 };
 return {db,env:{DB:api,ADMIN_EMAILS:coachUser.email,ALLOWED_ORIGINS:''}};
}
async function call(env,user,path,method='GET',payload){
 const req=new Request(origin+path,{method,headers:payload?{'Content-Type':'application/json'}:{},...(payload?{body:JSON.stringify(payload)}:{})});
 const res=await coachAssignmentRoute({request:req,url:new URL(req.url),env,user});
 return {status:res.status,body:await res.json()};
}
test('real SQL: publish, accept, revise, sync between devices, restore, revoke and isolate',async()=>{
 const {db,env}=fixture();
 try{
  const initial=await call(env,coachUser,'/v1/coach/assignments','POST',proposal(null,3000,180,390,80,180));
  assert.equal(initial.status,201,JSON.stringify(initial.body));
  const id=initial.body.assignment.id;
  assert.equal(initial.body.assignment.version,1);
  const outsider=await call(env,stranger,'/v1/client/coach-assignments');
  assert.deepEqual(outsider.body.assignments,[]);
  const noAccess=await call(env,stranger,'/v1/coach/assignments','POST',proposal(null,3000,180,390,80,180));
  assert.equal(noAccess.status,403);
  const noAcceptance=await call(env,athleteUser,'/v1/client/coach-nutrition','POST',{enabled:true,assignmentId:id,version:1});
  assert.equal(noAcceptance.status,403);
  const inbox=await call(env,athleteUser,'/v1/client/coach-assignments');
  assert.equal(inbox.body.assignments.length,1);
  assert.equal(inbox.body.assignments[0].training.days[0].exercises[0].id,'barbell-bench-press');
  const approval=await call(env,athleteUser,'/v1/coach/assignments/'+id+'/decision','POST',{version:1,decision:'accepted'});
  assert.equal(approval.status,200,JSON.stringify(approval.body));
  const firstActivation=await call(env,athleteUser,'/v1/client/coach-nutrition','POST',{enabled:true,assignmentId:id,version:1});
  assert.equal(firstActivation.status,200);
  const deviceB=await call(env,athleteUser,'/v1/client/coach-nutrition');
  assert.equal(deviceB.body.assignment.nutrition.calorieTarget,3000);
  assert.equal(deviceB.body.assignment.goals.goalWeightLb,180);
  const revision=await call(env,coachUser,'/v1/coach/assignments','POST',proposal(1,3100,185,410,80,185));
  assert.equal(revision.status,200,JSON.stringify(revision.body));
  assert.equal(revision.body.assignment.version,2);
  const stillOld=await call(env,athleteUser,'/v1/client/coach-nutrition');
  assert.equal(stillOld.body.assignment.version,1,'New publication must not silently activate');
  const staleDecision=await call(env,athleteUser,'/v1/coach/assignments/'+id+'/decision','POST',{version:1,decision:'declined'});
  assert.equal(staleDecision.status,409);
  const stalePublish=await call(env,coachUser,'/v1/coach/assignments','POST',proposal(1,3100,185,410,80,185));
  assert.equal(stalePublish.status,409);
  const approveV2=await call(env,athleteUser,'/v1/coach/assignments/'+id+'/decision','POST',{version:2,decision:'accepted'});
  assert.equal(approveV2.status,200);
  const activateV2=await call(env,athleteUser,'/v1/client/coach-nutrition','POST',{enabled:true,assignmentId:id,version:2});
  assert.equal(activateV2.status,200);
  const otherDevice=await call(env,athleteUser,'/v1/client/coach-nutrition');
  assert.equal(otherDevice.body.assignment.nutrition.calorieTarget,3100);
  assert.equal(otherDevice.body.assignment.goals.goalWeightLb,185);
  const rows=db.prepare('SELECT version,nutrition_json FROM coach_assignment_versions WHERE assignment_id=? ORDER BY version').all(id);
  assert.deepEqual(rows.map(x=>x.version),[1,2]);
  assert.equal(JSON.parse(rows[0].nutrition_json).calorieTarget,3000);
  const restore=await call(env,athleteUser,'/v1/client/coach-nutrition','POST',{enabled:false});
  assert.equal(restore.status,200);
  assert.equal((await call(env,athleteUser,'/v1/client/coach-nutrition')).body.enabled,false);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM coach_assignment_decisions WHERE assignment_id=?').get(id).n,2);
  await call(env,athleteUser,'/v1/client/coach-nutrition','POST',{enabled:true,assignmentId:id,version:2});
  db.prepare('UPDATE coach_training_links SET revoked_at=? WHERE coach_user_id=? AND client_user_id=?').run(new Date().toISOString(),coach,athlete);
  assert.equal((await call(env,athleteUser,'/v1/client/coach-nutrition')).body.enabled,false);
  assert.equal((await call(env,athleteUser,'/v1/client/coach-assignments')).body.assignments.length,0);
 }finally{db.close()}
});
