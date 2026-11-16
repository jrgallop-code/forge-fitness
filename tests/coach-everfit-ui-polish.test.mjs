import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const profile=readFileSync(new URL("../coach-web/coach-functional-profile.js",import.meta.url),"utf8");
const metrics=readFileSync(new URL("../coach-web/coach-metrics.js",import.meta.url),"utf8");
const shared=readFileSync(new URL("../coach-web/coach-shared-weight-progress.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("../coach-web/coach-ui-polish.js",import.meta.url),"utf8");
const bootstrap=readFileSync(new URL("../coach-web/coach-builder-layout.js",import.meta.url),"utf8");
test("working Coach dashboard is never replaced or hidden by Everfit polish",()=>{
 assert.doesNotMatch(styles,/#dashboard>.*display:\s*none|#dashboard\s*>\s*:/);
 assert.doesNotMatch(bootstrap,/coach-solo-dashboard\.js/);
 assert.match(bootstrap,/coach-functional-profile\.js/);
 assert.match(styles,/#clients button\.cf-body-metric/);
});
test("invitation uses original Level Up coach API with an explicit confirmation and selected coaching type",()=>{
 assert.match(profile,/accountApi\("invite",\{firstName,lastName,email,coachingType\}\)/);
 assert.match(profile,/confirm\("Send a Level Up Coach invitation to "/);
 assert.match(profile,/cf-invite-form/);
});
test("Coach Weight drilldown imports original athlete chart renderer and trend computation",()=>{
 assert.match(metrics,/renderCoachSharedWeightProgress\(wrap,profile\)/);
 assert.match(shared,/import \{drawSharedWeightTrendChart\} from "\.\/js\/progress\/weight-trend-chart\.js"/);
 assert.match(shared,/import \{normalizeWeightEntries,calculateTrendWeightSeries,calculateVisibleWeightTrend/);
 for(const range of ["1w","1m","3m","6m","1y","all"])assert.ok(shared.includes('["'+range+'",'));
 assert.match(shared,/\["phase","PHASE",null\]/);
 assert.match(shared,/calculateVisibleWeightTrend\(entries,\{endDate:latest\}\)/);
 assert.doesNotMatch(shared,/rateInterval|rateUnit/);
 assert.doesNotMatch(shared,/localStorage\.setItem/);
});
test("client summary remains scoped to selected ID and guards inflight responses",()=>{
 assert.match(profile,/if\(clientId!==id\|\|seq!==loadSequence\)return/);
 assert.match(profile,/filter\(x=>x\.clientId===id\)/);
});
