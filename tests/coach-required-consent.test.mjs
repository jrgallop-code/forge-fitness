import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {coachInviteRoute} from "../cloud/src/coach-invitations.js";

const VERSION="coach-sharing-v1-2026-11-16";
const token="a".repeat(64);
const user={id:"email:existing-client",email:"athlete@example.com"};
const invite={id:"test-invite",coach_user_id:"email:solo-coach",email:user.email,status:"pending",expires_at:"2099-01-01T00:00:00.000Z"};

async function accept(payload,{existing=invite,who=user}={}){
 const writes=[];
 const db={prepare(sql){return {bind(...params){return{
  async first(){return sql.includes("FROM coach_client_invites")?existing:null},
  async run(){writes.push({sql,params});return {meta:{changes:1}}},
  async all(){return {results:[]}}
 }}}}};
 const req=new Request("https://api.leveluphypertrophy.com/v1/client/coach-invitation/accept",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({token,...payload})
 });
 const res=await coachInviteRoute({request:req,url:new URL(req.url),user:who,env:{DB:db,ADMIN_EMAILS:"solo@example.com"}});
 return {status:res.status,body:await res.json(),writes};
}
const approved={approveTraining:true,approveNutrition:true,approveDataSharing:true,consentVersion:VERSION};

test("existing account cannot share any data without explicit full consent",async()=>{
 for(const payload of [{},{...approved,approveNutrition:false},{...approved,approveDataSharing:false},
  {...approved,approveTraining:false},{...approved,consentVersion:"outdated"}]){
  const result=await accept(payload);
  assert.equal(result.status,400);
  assert.equal(result.writes.length,0,"No coach link should be written when data consent is incomplete");
 }
});
test("accepted consent stores both permission flags, disclosure version and scope",async()=>{
 const result=await accept(approved);
 assert.equal(result.status,200);
 assert.equal(result.body.accepted,true);
 assert.equal(result.body.nutritionPermission,true);
 assert.equal(result.body.consentVersion,VERSION);
 assert.equal(result.writes.length,2);
 assert.match(result.writes[0].sql,/nutrition_permission=1/);
 assert.match(result.writes[0].sql,/consent_version/);
 assert.ok(result.writes[0].params.includes(VERSION));
 assert.ok(result.writes[0].params.includes("training_progress_body_metrics_nutrition"));
 assert.match(result.writes[1].sql,/status='accepted'/);
 assert.ok(result.writes[1].params.includes(VERSION));
});
test("wrong identity, expired invite and already accepted invite cannot connect",async()=>{
 for(const x of [
  {who:{id:"email:other",email:"other@example.com"}},
  {existing:{...invite,status:"accepted"}},
  {existing:{...invite,expires_at:"2000-01-01T00:00:00.000Z"}}
 ]){
  const result=await accept(approved,x);
  assert.ok([403,404].includes(result.status));
  assert.equal(result.writes.length,0);
 }
});
test("acceptance page has unselected consent, decline and current disclosure",()=>{
 const html=readFileSync(new URL("../coach-join.html",import.meta.url),"utf8");
 assert.match(html,/id="dataConsent" type="checkbox"/);
 assert.match(html,/id="accept" disabled/);
 assert.match(html,/id="decline"/);
 assert.match(html,/consentVersion:CONSENT_VERSION/);
 assert.match(html,/approveNutrition:true,approveDataSharing:true/);
 assert.match(html,/privacy\.html/);
 assert.doesNotMatch(html,/id="nutrition" type="checkbox"/);
});
