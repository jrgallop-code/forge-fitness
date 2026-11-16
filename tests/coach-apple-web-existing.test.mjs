import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {coachInviteRoute} from "../cloud/src/coach-invitations.js";

test("coach invitation email contains separate Apple and review URLs without claiming email identity matching",async()=>{
 const original=globalThis.fetch;
 const calls=[];const writes=[];
 const env={ADMIN_EMAILS:"coach@example.com",RESEND_API_KEY:"fake-resend-test-key",APPLE_WEB_CLIENT_ID:"com.leveluphypertrophy.web",APPLE_WEB_REDIRECT_URI:"https://leveluphypertrophy.com/coach-join.html",DB:{
  prepare(sql){return{bind(...params){return{
   async first(){return null},
   async run(){writes.push({sql,params});return{meta:{changes:1}}}
  }}}}
 }};
 globalThis.fetch=async (url,opts)=>{
  calls.push({url,body:JSON.parse(opts.body)});
  return new Response(JSON.stringify({id:"synthetic-email"}),{status:200,headers:{"Content-Type":"application/json"}});
 };
 try{
  const req=new Request("https://api.leveluphypertrophy.com/v1/coach/invitations",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({firstName:"Sample",lastName:"Athlete",email:"private-contact@example.com",coachingType:"online"})
  });
  const result=await coachInviteRoute({request:req,env,user:{id:"coach-id",email:"coach@example.com",display_name:"Coach"},url:new URL(req.url)});
  assert.equal(result.status,201);
  assert.equal(calls.length,1);
  const {html,text}=calls[0].body;
  assert.match(html,/>Sign in with Apple<\/a>/);
  assert.match(html,/\?invite=[a-f0-9]{64}&amp;auth=apple/);
  assert.match(text,/Sign in with Apple/);
  assert.match(html,/You will review and approve coaching data sharing/);
  assert.doesNotMatch(html,/Sign in using private-contact@example.com/);
  assert.ok(writes.some(x=>x.sql.includes("INSERT INTO coach_client_invites")));
 }finally{globalThis.fetch=original}
});
test("Apple web login is existing-account-only with verified audience and nonce, no email fallback",()=>{
 const worker=readFileSync(new URL("../cloud/src/index.js",import.meta.url),"utf8");
 const start=worker.indexOf("async function createExistingAppleWebSession(");
 const end=worker.indexOf("async function createAppleSession(",start);
 const source=worker.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(source,/verifyAppleIdentityToken\(identityToken, nonce, env, clientId\)/);
 assert.match(source,/exchangeAppleAuthorizationCode\(authorizationCode, env, clientId, redirectURI\)/);
 assert.match(source,/exchanged\.sub !== claims\.sub/);
 assert.match(source,/users WHERE id=\? LIMIT 1/);
 assert.match(source,/apple:\$\{claims\.sub\}/);
 assert.doesNotMatch(source,/INSERT INTO users/);
 assert.doesNotMatch(source,/WHERE email/);
 assert.match(source,/404, request, env/);
 assert.match(source,/issueSession\(existing\.id/);
 assert.match(worker,/\/v1\/coach\/apple-web\/config/);
});
