import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync(new URL("../coach-web/coach-ui-polish.js",import.meta.url),"utf8");
const roster=readFileSync(new URL("../cloud/src/coach-invitations.js",import.meta.url),"utf8");
test("one Everfit-inspired client list replaces duplicated original panels",()=>{
 assert.match(ui,/id="luc-everfit-directory"/);
 assert.match(ui,/All Clients/);
 assert.match(ui,/luc-single-directory>:not\(#luc-everfit-directory\)/);
 assert.match(ui,/cf-client-sidebar\{display:none!important\}/);
 assert.doesNotMatch(ui,/id="luc-unified-roster"/);
 assert.match(ui,/data-luc-filter-status/);
 assert.match(ui,/data-luc-filter-category/);
 assert.match(ui,/data-luc-search/);
 assert.match(ui,/data-luc-sort/);
 assert.match(ui,/data-revoke/);
 assert.match(ui,/data-reinvite/);
 assert.match(ui,/data-open/);
});
test("existing connected profile and invite action remain wired",()=>{
 assert.match(ui,/originalProfile\(clientId,name\)/);
 assert.match(ui,/button\.click\(\)/);
 assert.match(ui,/invite client/i);
 assert.match(ui,/startInvite/);
});
test("real last activity is sourced from users, no invented activity or training percentages",()=>{
 assert.match(roster,/u\.last_active_at/);
 assert.match(roster,/lastActiveAt:row\.last_active_at\|\|null/);
 assert.doesNotMatch(ui,/Last 7d Training/);
});
