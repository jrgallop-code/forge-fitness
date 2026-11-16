import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const p=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const profile=p("coach-web/coach-functional-profile.js"),metrics=p("coach-web/coach-metrics.js"),weight=p("coach-web/coach-shared-weight-progress.js"),worker=p("cloud/src/coach-client-data.js");
test("every summary metric navigates to Body Metrics, not Weightlifting Progress",()=>{
 assert.match(profile,/switchTab\("bodymetrics"\);renderBodyMetrics\(\)/);
 assert.match(profile,/\["bodymetrics","Body Metrics"\]/);
 assert.match(profile,/\["progress","Weightlifting Progress"\]/);
 assert.match(profile,/function renderBodyMetrics\(/);
 assert.doesNotMatch(profile,/selectedMetric&&metricUI\)\{\s*metricUI\.renderCoachMetricDetail\(root/);
});
test("invites offer existing authorized coaching types",()=>{
 for(const [id,label]of [["online","Online"],["in_person","In-person"],["hybrid","Hybrid"]])assert.match(profile,new RegExp('\\["'+id+'","'+label+'"\\]'));
 assert.match(profile,/accountApi\("invite",\{firstName,lastName,email,coachingType\}\)/);
});
test("weight chart reuses native timeframes and fixed native 21-day trend rate",()=>{
 assert.match(metrics,/calculateVisibleWeightTrend\(raw,\{endDate:raw\.at\(-1\)\?\.date\}\)/);
 assert.doesNotMatch(metrics,/const rate=toNum\(profile\?\.expenditure\?\.weightRateLbPerWeek\)/);
 assert.match(weight,/\["phase","PHASE",null\]/);
 assert.match(weight,/\["3m","3M",90\]/);
 assert.match(weight,/let selectedRange="3m"/);
 assert.match(weight,/calculateVisibleWeightTrend\(entries,\{endDate:latest\}\)/);
 assert.doesNotMatch(weight,/rateInterval|rateUnit|Per day|Per month/);
 assert.match(weight,/calculateTrendWeightSeries\(entries\.filter/);
 assert.match(worker,/weighIns\.slice\(-730\)/);
});
test("steps are never manufactured and show unavailable sync state",()=>{
 assert.match(worker,/no_step_history_in_cloud/);
 assert.match(worker,/stepSourceKeys/);
 assert.match(metrics,/No dated step counts synced/);
 assert.doesNotMatch(worker,/value:\s*10000/);
});
