import test from "node:test";
import assert from "node:assert/strict";
import {coachInviteRoute} from "../cloud/src/coach-invitations.js";

const now=new Date().toISOString();
const future="2099-01-01T00:00:00Z";
const user={id:"coach-id",email:"coach@example.com"};
function mock({links=[],invites=[]}={}){
 const calls=[],writes=[];
 const DB={prepare(sql){return{bind(...args){calls.push({sql,args});return{
  async all(){return{results:sql.includes("FROM coach_training_links")?links:invites}},
  async run(){writes.push({sql,args});return{meta:{changes:1}}},
  async first(){return null}
 }}}}};
 return{DB,calls,writes}
}
async function getRoster(db,who=user){
 const request=new Request("https://api.leveluphypertrophy.com/v1/coach/roster");
 const response=await coachInviteRoute({request,url:new URL(request.url),env:{DB:db.DB,ADMIN_EMAILS:"coach@example.com"},user:who});
 return{status:response.status,body:await response.json()};
}
test("Everfit Connected/Pending/Offline roster shows invited clients before signup",async()=>{
 const db=mock({
  links:[{id:"apple:abc123",email:"private@privaterelay.appleid.com",display_name:"Signed-in Athlete",accepted_at:now}],
  invites:[
   {id:"pending",first_name:"Jordan",last_name:"Lee",email:"jordan@example.com",coaching_type:"online",status:"pending",expires_at:future,created_at:now,emailed_at:now},
   {id:"linked",first_name:"Signed-in",last_name:"Athlete",email:"personal@example.com",coaching_type:"hybrid",status:"accepted",accepted_user_id:"apple:abc123",expires_at:future,created_at:now,emailed_at:now},
   {id:"revoked",first_name:"Morgan",last_name:"Reed",email:"morgan@example.com",coaching_type:"in_person",status:"revoked",expires_at:future,created_at:now},
   {id:"expired",first_name:"Riley",last_name:"Quinn",email:"riley@example.com",coaching_type:"online",status:"pending",expires_at:"2020-01-01",created_at:now}
  ]
 });
 const r=await getRoster(db);
 assert.equal(r.status,200);
 assert.deepEqual(r.body.counts,{all:4,connected:1,pending:1,offline:2});
 assert.equal(r.body.clients[0].name,"Jordan Lee");
 assert.equal(r.body.clients[0].status,"Pending");
 assert.equal(r.body.clients[0].canRevoke,true);
 assert.equal(r.body.clients[0].clientId,null,"Pending invitations must not impersonate signed-in users");
 assert.equal(r.body.clients[1].status,"Connected");
 assert.equal(r.body.clients[1].clientId,"apple:abc123");
 assert.equal(r.body.clients[1].email,"private@privaterelay.appleid.com");
 assert.equal(r.body.clients[1].contactEmail,"personal@example.com");
 assert.equal(r.body.clients[1].coachingType,"hybrid");
 assert.equal(r.body.clients.filter(x=>x.status==="Offline").length,2);
 assert.equal(db.writes.length,0);
});
test("roster excludes non-owner coach",async()=>{
 const db=mock();
 const r=await getRoster(db,{id:"stranger",email:"other@example.com"});
 assert.equal(r.status,403);
 assert.equal(db.calls.length,0);
});
test("revoke only affects pending invitation for authenticated coach",async()=>{
 const db=mock();
 const request=new Request("https://api.leveluphypertrophy.com/v1/coach/invitations/12345678-1234-4234-8234-123456789012/revoke",{method:"POST"});
 const response=await coachInviteRoute({request,url:new URL(request.url),env:{DB:db.DB,ADMIN_EMAILS:"coach@example.com"},user});
 assert.equal(response.status,200);
 assert.equal(db.writes.length,1);
 assert.match(db.writes[0].sql,/status='pending'/);
 assert.equal(db.writes[0].args[1],user.id);
});
