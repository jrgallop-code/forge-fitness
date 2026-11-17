import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync(new URL("../coach-web/coach-ui-polish.js",import.meta.url),"utf8");
const proxy=readFileSync(new URL("../coach-web/api/coach-roster.js",import.meta.url),"utf8");
const router=readFileSync(new URL("../cloud/src/index.js",import.meta.url),"utf8");

test("single client directory is embedded in Coach Clients page and uses Everfit statuses",()=>{
 assert.match(ui,/document\.querySelector/);
 for(const status of ["All","Connected","Pending","Offline"])assert.ok(ui.includes('"'+status+'"'));
 assert.match(ui,/data-luc-search/);
 assert.match(ui,/data-revoke/);
 assert.match(ui,/Revoke/);
 assert.match(ui,/confirm\("Revoke /);
 assert.match(ui,/await refresh\(true\)/);
 assert.match(ui,/data-open/);
});
test("pending invitations have no access to client training data",()=>{
 const cloud=readFileSync(new URL("../cloud/src/coach-invitations.js",import.meta.url),"utf8");
 assert.match(cloud,/clientId:null,invitationId:inv\.id/);
 assert.match(cloud,/canRevoke:pending/);
 assert.match(cloud,/connectedIds\.has\(inv\.accepted_user_id\)/);
 assert.match(router,/\/v1\/coach\/roster/);
});
test("coach roster proxy uses encrypted coach session and enforces same origin revoke",()=>{
 assert.match(proxy,/COACH_SESSION_SECRET/);
 assert.match(proxy,/createDecipheriv\("aes-256-gcm"/);
 assert.match(proxy,/if\(hostname!==req\.headers\.host\)/);
 assert.match(proxy,/\/v1\/coach\/roster/);
 assert.match(proxy,/\/v1\/coach\/invitations\//);
 assert.match(proxy,/Authorization:"Bearer "\+token/);
 assert.doesNotMatch(proxy,/Access-Control-Allow-Origin/);
});
