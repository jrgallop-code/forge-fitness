import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {coachInviteRoute} from "../cloud/src/coach-invitations.js";
const VERSION="coach-sharing-v1-2026-11-16";
const token="a".repeat(64);
const invite={id:"invitation-id",coach_user_id:"coach-id",email:"contact@example.com",status:"pending",expires_at:"2099-01-01T00:00:00Z"};
const relay={id:"apple-identity-123",email:"random@privaterelay.appleid.com"};
const approved={approveTraining:true,approveNutrition:true,approveDataSharing:true,consentVersion:VERSION};
async function accept(payload,who=relay,existing=invite){
 const writes=[];
 const db={prepare(sql){return{bind(...params){return{
  async first(){return sql.includes("FROM coach_client_invites")?existing:null},
  async run(){writes.push({sql,params});return {meta:{changes:1}}},
  async all(){return{results:[]}}
 }}}}};
 const req=new Request("https://api.leveluphypertrophy.com/v1/client/coach-invitation/accept",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,...payload})});
 const response=await coachInviteRoute({request:req,url:new URL(req.url),user:who,env:{DB:db,ADMIN_EMAILS:"coach@example.com"}});
 return{status:response.status,body:await response.json(),writes};
}
test("Different contact and Apple relay email is rejected by default and on incomplete confirmation",async()=>{
 for(const payload of [
  approved,
  {...approved,acceptVia:"existing_account",confirmContactEmailMismatch:false,confirmAccountId:relay.id},
  {...approved,acceptVia:"existing_account",confirmContactEmailMismatch:true,confirmAccountId:"other-account"},
  {...approved,acceptVia:"existing_account",confirmContactEmailMismatch:true},
  {...approved,acceptVia:"existing_account",confirmContactEmailMismatch:true,confirmAccountId:relay.id,approveNutrition:false}
 ]){
  const r=await accept(payload);
  assert.ok([400,403].includes(r.status),JSON.stringify(r));
  assert.equal(r.writes.length,0);
 }
});
test("Valid invitation possession + signed-in relay account + reviewed mismatch + full consent links same account ID",async()=>{
 const r=await accept({...approved,acceptVia:"existing_account",confirmContactEmailMismatch:true,confirmAccountId:relay.id});
 assert.equal(r.status,200);
 assert.equal(r.body.accepted,true);
 assert.equal(r.writes.length,2);
 assert.equal(r.writes[0].params[1],relay.id,"Use existing account ID, not contact email");
 assert.equal(r.writes[1].params[1],relay.id);
});
test("Existing account route does not bypass expired, revoked or consumed invitation",async()=>{
 const payload={...approved,acceptVia:"existing_account",confirmContactEmailMismatch:true,confirmAccountId:relay.id};
 for(const row of [{...invite,status:"revoked"},{...invite,status:"accepted"},{...invite,expires_at:"2000-01-01T00:00:00Z"}]){
  const r=await accept(payload,relay,row);
  assert.equal(r.status,404);assert.equal(r.writes.length,0);
 }
});
test("Invitation page old email-matching path remains strict",async()=>{
 const other={id:"google-other",email:"other@gmail.com"};
 const r=await accept(approved,other);
 assert.equal(r.status,403);
});
test("PWA More route requires signed-in cloud identity and full consent; never copies account data",()=>{
 const ui=readFileSync(new URL("../js/more/coach-invite-pwa.js",import.meta.url),"utf8");
 const more=readFileSync(new URL("../js/more/more-ui-v2.js",import.meta.url),"utf8");
 assert.match(more,/data-more-page="coach-invite"/);
 assert.match(ui,/\/v1\/me/);
 assert.match(ui,/\/v1\/client\/coach-invitation\/accept/);
 assert.match(ui,/confirmAccountId:signedIn\.id/);
 assert.match(ui,/confirmContactEmailMismatch:contactMismatch/);
 assert.match(ui,/dataConsent|coach-invite-data-consent/);
 assert.match(ui,/coach-invite-mismatch/);
 assert.match(ui,/\/v1\/client\/coach-links/);
 assert.doesNotMatch(ui,/setItem\(ACCOUNT_KEY/);
 assert.doesNotMatch(ui,/importSharedWorkoutPackage/);
});

test("PWA removes invitation token before checking sign-in state",()=>{
 const code=readFileSync(new URL("../js/more/coach-invite-pwa.js",import.meta.url),"utf8");
 const init=code.indexOf("const init=async()=>");
 const clean=code.indexOf('clean.searchParams.delete("invite")',init);
 const auth=code.indexOf('if(!sessionToken)',init);
 assert.ok(init>=0&&clean>init&&auth>clean);
});
