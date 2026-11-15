import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const health = read("js/health/apple-health.js");
const insights = read("js/dashboard/dashboard-insights-analytics-v5.js");
const steps = read("js/progress/steps-progress-carousel.js");
const progress = read("js/progress/progress-ui.js");
const tabs = read("js/progress/weight-tracker.js");
const initial = read("js/progress/progress-initial-tab-stability.js");
const weight = read("js/progress/weight-chart-carousel-v3.js");

test("Steps never inserts a standalone dashboard metric card", () => {
 assert.doesNotMatch(health, /host\.insertBefore\(card,\s*host\.querySelector/);
 assert.match(health, /host\.querySelectorAll\("\[data-levelup-steps-card\]"\)\.forEach\(card => card\.remove\(\)\)/);
});
test("Steps follows Goal Timeline at matching full-card width and height", () => {
 assert.match(insights, /\.dashboard-preview-steps\{grid-column:1\/-1/);
 assert.match(insights, /\.dashboard-preview-goal,\.dashboard-preview-steps\{min-height:200px\}/);
 const markup = insights.slice(insights.indexOf("function screenMarkup()"), insights.indexOf("function cleanupOldDashboardActions()"));
 const expenditure = markup.indexOf('data-dashboard-open-progress="expenditure"');
 const comparison = markup.indexOf('data-dashboard-open-progress="comparison"');
 const goal = markup.indexOf("${goalTimelinePreviewMarkup(goal)}");
 const stepCard = markup.indexOf("${stepsPreviewCardMarkup()}");
 assert.ok(expenditure>=0 && comparison>expenditure);
 assert.ok(goal>comparison && stepCard>goal, "Steps must be directly after the full-width Goal Timeline");
 assert.equal((markup.match(/\$\{stepsPreviewCardMarkup\(\)\}/g)||[]).length,1);
 assert.match(insights, /data-insights-step-average/);
 assert.match(insights, /data-insights-step-total/);
});
test("Steps is its own Progress tab immediately after Cardio and before Photos", () => {
 const cardio = progress.indexOf('id="cardio-progress-tab"');
 const stepsTab = progress.indexOf('id="steps-progress-tab"');
 const photos = progress.indexOf('id="photo-log-tab"');
 assert.ok(cardio>=0 && stepsTab>cardio && photos>stepsTab);
 assert.match(progress, /id="steps-progress" hidden/);
 assert.match(progress, /data-levelup-steps-detail/);
 assert.match(tabs, /steps: document\.getElementById\("steps-progress-tab"\)/);
 assert.match(tabs, /steps: document\.getElementById\("steps-progress"\)/);
 assert.match(tabs, /buttons\.steps\.addEventListener\("click", \(\) => show\("steps"\)\)/);
 assert.match(initial, /if \(steps\) steps\.hidden = true/);
});
test("Dashboard click opens only the Steps Progress tab, not Weight charts", () => {
 assert.match(insights, /openStepsInProgress\(\)/);
 assert.match(steps, /document\.getElementById\("steps-progress-tab"\)/);
 assert.match(steps, /tab\.click\(\)/);
 assert.doesNotMatch(steps, /document\.getElementById\("weight-tab"\)/);
 assert.doesNotMatch(steps, /weight-graph-carousel-slide-v2/);
 assert.doesNotMatch(weight, /addStepsSlide/);
});
test("Steps chart includes numeric Y-axis, averages and five ranges", () => {
 for(const name of ["1W","1M","3M","6M","1Y"])assert.ok(steps.includes('"'+name+'"'));
 assert.match(steps, /aria-label="Step chart range"/);
 assert.match(steps, /class="lu-sp-axis"/);
 assert.match(steps, /tick\(value\)/);
 assert.match(steps, /data-lu-sp-average/);
 assert.match(steps, /data-lu-sp-total/);
 assert.match(steps, /Missing days are not counted as zero/);
});
test("Existing Apple Health history screen remains intact", () => {
 assert.match(health, /Garmin history must first be written into Apple Health/);
 assert.match(health, /getStepRange\(data,days\)/);
});

test("iOS Progress tabs remain horizontally scrollable with Cardio and Steps adjacent",()=>{
 const css=read("css/native-ios-polish.css");
 assert.match(css,/\.progress-page > \.progress-tabs\{[\s\S]*?overflow-x:auto/);
 assert.match(css,/\.progress-page > \.progress-tabs > \.progress-tab\{[\s\S]*?white-space:nowrap/);
});
