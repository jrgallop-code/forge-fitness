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
