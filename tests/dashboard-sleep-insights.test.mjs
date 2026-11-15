import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sleepSummary, formatSleepDuration } from "../js/health/sleep-summary.js";

const insights=readFileSync("js/dashboard/dashboard-insights-analytics-v5.js","utf8");
const router=readFileSync("js/core/router.js","utf8");
const app=readFileSync("js/app.js","utf8");

test("Sleep summary shows latest recorded night and last seven recorded nights",()=>{
 const records=Array.from({length:9},(_,i)=>({date:`2026-11-${String(i+1).padStart(2,"0")}`,hours:i+1}));
 const m=sleepSummary({sleep:records});
 assert.equal(m.latest.date,"2026-11-09");
 assert.equal(m.latest.hours,9);
 assert.equal(m.nights,7);
 assert.equal(m.average,6);
 assert.equal(formatSleepDuration(7.5),"7h 30m");
 assert.equal(formatSleepDuration(null),"—");
});
test("Sleep summary handles no records and filters invalid entries",()=>{
 const empty=sleepSummary({});
 assert.equal(empty.latest,null);
 assert.equal(empty.average,null);
 assert.equal(empty.nights,0);
 const m=sleepSummary({sleep:[{date:"2026-11-15",hours:7.25},{date:"2026-11-14",hours:null},{date:"bad",hours:3}]});
 assert.equal(m.nights,1);
 assert.equal(formatSleepDuration(m.latest.hours),"7h 15m");
});
test("Sleep full-width Insights card follows Steps and retains its existing design",()=>{
 assert.match(insights,/\$\{goalTimelinePreviewMarkup\(goal\)\}\$\{stepsPreviewCardMarkup\(\)\}\$\{sleepPreviewCardMarkup\(\)\}/);
 assert.match(insights,/dashboard-preview-card dashboard-preview-steps dashboard-preview-sleep/);
 assert.match(insights,/data-insights-sleep-latest/);
 assert.match(insights,/data-insights-sleep-average/);
 assert.match(insights,/data-insights-sleep-nights/);
 assert.match(insights,/hydrateSleepPreview\(screen\)/);
 assert.match(insights,/__sleepUnsubscribe\?\.\(\)/);
});
test("Sleep tap navigates directly to existing Apple Health Sleep page",()=>{
 assert.match(insights,/event\.target\.closest\?\.\("\[data-insights-sleep-open\]"\)/);
 assert.match(insights,/event\.stopImmediatePropagation\(\)/);
 assert.match(insights,/detail:\{page:"sleep"\}/);
 assert.match(router,/case "sleep":/);
 assert.match(router,/renderSleepTracker\(\)/);
 assert.match(app,/page==="sleep"\?"more":page/);
});
