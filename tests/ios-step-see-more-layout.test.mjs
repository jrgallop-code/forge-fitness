import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const health=readFileSync("js/health/apple-health.js","utf8");
const insights=readFileSync("js/dashboard/dashboard-insights-analytics-v5.js","utf8");

test("Steps no longer inserts a standalone metric card in the dashboard grid",()=>{
 assert.doesNotMatch(health,/host\.insertBefore\(card,\s*host\.querySelector/);
 assert.match(health,/host\.querySelectorAll\("\[data-levelup-steps-card\]"\)\.forEach\(card => card\.remove\(\)\)/);
});
test("Steps is a compact See More card next to expenditure, without spanning columns",()=>{
 assert.match(insights,/\.dashboard-preview-steps\{grid-column:auto/);
 const markup=insights.slice(insights.indexOf('function screenMarkup()'),insights.indexOf('function cleanupOldDashboardActions()'));
 assert.ok(markup.indexOf('data-dashboard-open-progress="expenditure"')>=0);
 assert.ok(markup.indexOf('${stepsPreviewCardMarkup()}')>markup.indexOf('data-dashboard-open-progress="expenditure"'));
 assert.ok(markup.indexOf('${stepsPreviewCardMarkup()}')<markup.indexOf('data-dashboard-open-progress="comparison"'));
 assert.match(insights,/data-insights-step-average/);
 assert.match(insights,/data-insights-step-total/);
});
test("Steps detail keeps all ranges and explicitly labels available history",()=>{
 for(const range of ["1W","1M","3M","6M","1Y"]) assert.ok(health.includes('"'+range+'"'));
 assert.match(health,/recorded day/);
 assert.match(health,/Garmin history must first be written into Apple Health/);
 assert.match(health,/getStepRange\(data,days\)/);
});

test("Dashboard Steps tile opens Progress carousel instead of separate overlay",()=>{
 assert.match(insights,/openStepsInProgress\(\)/);
 assert.doesNotMatch(insights,/\{ openStepsDetail\(\); return;/);
});
test("Progress includes a Steps slide and a labeled numerical Y axis",()=>{
 const carousel=readFileSync("js/progress/steps-progress-carousel.js","utf8");
 const weight=readFileSync("js/progress/weight-chart-carousel-v3.js","utf8");
 const page=readFileSync("js/progress/weight-carousel-pages.js","utf8");
 assert.match(weight,/addStepsSlide\(card, track, pager\)/);
 assert.match(page,/'Steps':'steps'/);
 assert.match(carousel,/\[data-weight-graph-slide-v2="steps"\]/);
 assert.match(carousel,/aria-label="Step chart range"/);
 for(const name of ["1W","1M","3M","6M","1Y"])assert.ok(carousel.includes('"'+name+'"'));
 assert.match(carousel,/class="lu-sp-axis"/);
 assert.match(carousel,/tick\(value\)/);
 assert.match(carousel,/draw\(model\)/);
 assert.match(carousel,/data-lu-sp-average/);
 assert.match(carousel,/data-lu-sp-total/);
 assert.match(carousel,/Missing days are not counted as zero/);
});
