import test from "node:test";
import assert from "node:assert/strict";
import {coachDraftRoute} from "../cloud/src/coach-client-drafts.js";
const actor={id:"email:coach",email:"coach@example.com"},clientId="email:athlete";
function makeDB(){let draft=null;return{prepare(sql){return{bind(...args){return{
 first:async()=>{if(sql.includes("FROM coach_training_links"))return{training_permission:1};if(sql.includes("FROM coach_client_drafts"))return draft?{version:draft.version}:null;return null;},
 all:async()=>({results:draft?[{...draft}]:[]}),
 run:async()=>{
  if(sql.startsWith("INSERT")){draft={id:args[0],client_user_id:args[2],name:args[3],draft_json:args[4],version:1,created_at:args[5],updated_at:args[6]};return{meta:{changes:1}}}
  if(sql.startsWith("UPDATE")){if(!draft||draft.version!==args.at(-1))return{meta:{changes:0}};draft={...draft,name:args[0],draft_json:args[1],updated_at:args[2],version:draft.version+1};return{meta:{changes:1}}}
  if(sql.startsWith("DELETE")){const had=!!draft;draft=null;return{meta:{changes:had?1:0}}}
  throw Error(sql);
 }
}}}}}};
}
async function call(db,method,kind="",payload=null,who=actor){
 const req=new Request("https://example.com/v1/coach/clients/"+encodeURIComponent(clientId)+"/drafts"+(kind?"/"+kind:""),{method,...(payload?{body:JSON.stringify(payload)}:{})});
 const r=await coachDraftRoute({request:req,env:{ADMIN_EMAILS:"coach@example.com",DB:db},user:who,url:new URL(req.url)});
 return{status:r.status,body:await r.json()};
}
test("drafts are versioned and cannot silently overwrite each other",async()=>{
 const db=makeDB();
 const first=await call(db,"PUT","plan-a",{name:"Test",content:{name:"Test",days:[]},expectedVersion:null});
 assert.equal(first.status,201);assert.equal(first.body.version,1);
 const changed=await call(db,"PUT","plan-a",{name:"Edited",content:{name:"Edited",days:[]},expectedVersion:1});
 assert.equal(changed.status,200);assert.equal(changed.body.version,2);
 const stale=await call(db,"PUT","plan-a",{name:"Stale",content:{name:"Stale"},expectedVersion:1});
 assert.equal(stale.status,409);
 const list=await call(db,"GET");assert.equal(list.body.drafts.length,1);
 assert.equal(list.body.drafts[0].content.name,"Edited");
});
test("an unapproved coach is rejected",async()=>{
 const db=makeDB();const result=await call(db,"GET","",null,{id:"email:other",email:"not-coach@example.com"});
 assert.equal(result.status,403);
});
