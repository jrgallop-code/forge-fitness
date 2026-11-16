import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const sourceCode=readFileSync(new URL("../coach-web/coach-functional-profile.js",import.meta.url),"utf8");
function fakeDOM(){
 const nodes=new Map();
 class Element{
  constructor(tag="div"){this.tagName=tag;this.children=[];this.style={};this.value="";this.hidden=false;this.dataset={};this.classList={toggle(){},add(){}};this.options=[];this.textContent="";}
  append(child){if(child){child.parentElement=this;this.children.push(child)}}
  prepend(child){if(child){child.parentElement=this;this.children.unshift(child)}}
  replaceChildren(...children){this.children=[];for(const c of children)this.append(c)}
  setAttribute(name,value){this[name]=String(value)}
  querySelectorAll(){return []}
  get childElementCount(){return this.children.length}
 }
 const byId=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)};
 return {nodes,byId,document:{body:null,getElementById:byId,createElement:tag=>new Element(tag),querySelectorAll:()=>[]}};
}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
function setup(){
 const dom=fakeDOM(),pending=new Map(),requests=[];
 const fetch=(url)=>{
  const address=String(url),clientId=new URL("https://example.com"+address).searchParams.get("clientId");
  const label=address.includes("action=summary")?"summary":"assignment";
  const key=clientId+"-"+label,d=deferred();pending.set(key,d);requests.push(key);
  return d.promise;
 };
 const ctx={document:dom.document,window:{},fetch,URLSearchParams,console,structuredClone,
  sessionStorage:{getItem:()=>null},MutationObserver:class{},Date,Number,String,Set,Map,Promise,JSON};
 const instrumented=sourceCode.replace(/\}\)\(\);\s*$/,"globalThis.testHooks={setClients:(items)=>clients=items,choose,getState:()=>({clientId,profile,assignments,loadSequence}),getNode:$};})();");
 assert.ok(instrumented.includes("globalThis.testHooks"),"Could not instrument Coach test fixture");
 vm.runInNewContext(instrumented,ctx,{filename:"coach-functional-profile.js"});
 return{...dom,pending,requests,hooks:ctx.testHooks};
}
function reply(pending,key,data){const item=pending.get(key);assert.ok(item,key+" was not requested");item.resolve({ok:true,json:async()=>data})}
test("switching to another approved athlete clears prior data and ignores earlier responses",async()=>{
 const {byId,pending,hooks}=setup();
 const A="email:athlete-a",B="email:athlete-b";
 hooks.setClients([{id:A,name:"Same Name",email:"a@example.com"},{id:B,name:"Same Name",email:"b@example.com"}]);
 const older=hooks.choose(A);
 reply(pending,A+"-summary",{client:{id:A},weight:{latest:160},training:{completedCount:3}});
 reply(pending,A+"-assignment",{assignments:[{clientId:A,status:"published",id:"prg-a",name:"A Program"}]});
 await older;
 assert.equal(hooks.getState().profile.weight.latest,160);
 const pa=hooks.choose(A),pb=hooks.choose(B);
 assert.equal(hooks.getState().clientId,B);
 assert.equal(hooks.getState().profile,null,"old athlete profile must be cleared immediately");
 assert.equal(hooks.getState().assignments.length,0,"old assignments must be cleared immediately");
 assert.equal(byId("cf-name").textContent,"Same Name");
 assert.equal(byId("cf-email").textContent,"b@example.com");
 reply(pending,B+"-summary",{client:{id:B},weight:{latest:175},training:{completedCount:5}});
 reply(pending,B+"-assignment",{assignments:[{clientId:B,status:"published",id:"prg-b",name:"B Program"},{clientId:A,status:"published",id:"bad",name:"A leaked assignment"}]});
 await pb;
 assert.equal(hooks.getState().profile.weight.latest,175);
 assert.equal(hooks.getState().assignments.length,1,"cross-account assignment must be filtered");
 assert.equal(hooks.getState().assignments[0].clientId,B);
 reply(pending,A+"-summary",{client:{id:A},weight:{latest:161}});
 reply(pending,A+"-assignment",{assignments:[{clientId:A,status:"published",id:"prg-a"}]});
 await pa;
 assert.equal(hooks.getState().clientId,B);
 assert.equal(hooks.getState().profile.weight.latest,175);
 assert.equal(hooks.getState().assignments[0].clientId,B);
});
