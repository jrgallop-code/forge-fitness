import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const read = path => readFileSync(path, "utf8");
const steps=read("js/progress/steps-progress-carousel.js");
const progress=read("js/progress/progress-ui.js");
const router=read("js/core/router.js");
const insights=read("js/dashboard/dashboard-insights-analytics-v5.js");
const app=read("js/app.js");
const weightTracker=read("js/progress/weight-tracker.js");
const onboarding=read("js/onboarding/onboarding.js");
const onboardingCss=read("css/onboarding.css");

test("Dashboard Steps click takes dedicated route exactly once",()=>{
 assert.match(insights,/screen\.addEventListener\("click", event => \{/);
 assert.match(insights,/event\.stopImmediatePropagation\(\)/);
 assert.match(insights,/openStepsInProgress\(\);\s*closeDashboardInsights\(\)/);
 assert.match(steps,/detail: \{ page: "progress-steps" \}/);
 assert.match(app,/page==="progress-steps"/);
 assert.match(app,/page==="progress-photos"/);
 assert.match(app,/\?"progress":page/);
});

test("Dedicated Steps destination cannot show Progress overview or Lifting",()=>{
 const start=progress.indexOf("export function renderStepsProgressDestination()");
 const end=progress.indexOf("export function renderPhotosProgressDestination(",start);
 assert.ok(start>=0 && end>start);
 const renderer=runInNewContext(progress.slice(start,end).replace("export function","function")+"\nrenderStepsProgressDestination");
 const html=renderer();
 assert.match(html,/data-progress-destination="steps"/);
 assert.match(html,/class="progress-tab active" id="steps-progress-tab"/);
 assert.match(html,/id="steps-progress"/);
 assert.match(html,/data-levelup-steps-detail/);
 assert.doesNotMatch(html,/id="lifting-progress"|id="weight-progress"|section-description/);
 assert.match(html,/data-progress-destination-tab="lifting"/);
});

test("Router mounts only Steps destination on progress-steps and initializes Steps",()=>{
 const begin=router.indexOf('case "progress-steps":');
 const end=router.indexOf('case "progress":',begin);
 assert.ok(begin>0&&end>begin);
 const dedicated=router.slice(begin,end);
 assert.match(dedicated,/renderStepsProgressDestination\(\)/);
 assert.match(dedicated,/initializeStepsProgress\(content\)/);
 assert.match(dedicated,/routeDestination = content\.querySelector\("#steps-progress"\)/);
 assert.doesNotMatch(dedicated,/renderProgress\(/);
});

test("A manual Progress tab from Steps destination remains accessible",()=>{
 assert.match(router,/data-progress-destination-tab/);
 assert.match(router,/navigate\("progress", \{ tab: selected \}\)/);
 assert.match(weightTracker,/export function selectProgressTab\(name,/);
});

test("Steps deep-link event carries the correct dedicated destination",()=>{
 const start=steps.indexOf("export function openStepsInProgress(){");
 const end=steps.indexOf("function ensureStyles(){",start);
 assert.ok(start>0&&end>start);
 let fired=null;
 const fn=steps.slice(start,end).replace("export function","function");
 const ctx={
   document:{dispatchEvent(e){fired=e;},getElementById:id=>id==="steps-progress-tab"?{classList:{contains:()=>true}}:{hidden:false}},
   CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}},
   Event:class {constructor(type){this.type=type}},
   initializeStepsProgress(){},
   window:{dispatchEvent(){}},
   console
 };
 runInNewContext(fn+"\nopenStepsInProgress()",ctx);
 assert.equal(fired?.type,"levelup:navigate");
 assert.equal(fired?.detail?.page,"progress-steps");
});

test("Apple Health icon remains in onboarding",()=>{
 assert.match(onboarding,/onboarding-apple-health-logo/);
 assert.match(onboarding,/onboarding-health-heart/);
 assert.match(onboardingCss,/onboarding-apple-health-logo/);
});
