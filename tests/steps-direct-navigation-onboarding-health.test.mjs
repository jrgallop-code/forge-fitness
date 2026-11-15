import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const read = path => readFileSync(path, "utf8");
const steps = read("js/progress/steps-progress-carousel.js");
const progress = read("js/progress/progress-ui.js");
const stability = read("js/progress/progress-initial-tab-stability.js");
const insights = read("js/dashboard/dashboard-insights-analytics-v5.js");
const router = read("js/core/router.js");
const weightTracker = read("js/progress/weight-tracker.js");
const onboarding = read("js/onboarding/onboarding.js");
const onboardingCss = read("css/onboarding.css");

test("Dashboard Steps opens Progress with the Steps tab requested synchronously", () => {
    assert.match(insights, /closeDashboardInsights\(\); openStepsInProgress\(\)/);
    assert.match(steps, /__levelUpProgressInitialTab = "steps"/);
    assert.match(steps, /new CustomEvent\("levelup:navigate"/);
    assert.doesNotMatch(steps, /window\.setTimeout\(open,\s*60\)/);
    assert.match(steps, /const stepsTab = document\.getElementById\("steps-progress-tab"\)/);
    assert.doesNotMatch(steps, /stepsTab\.click\(\)/);
    assert.match(steps, /stepsTab\?\.classList\.contains\("active"\)/);

});

test("Progress markup is rendered in Steps mode without showing Weight first", () => {
    assert.match(progress, /const initialSteps = window\.__levelUpProgressInitialTab === "steps"/);
    assert.match(progress, /id="steps-progress-tab"/);
    assert.match(progress, /id="steps-progress" \$\{initialSteps \? "" : "hidden"\}/);
    assert.match(progress, /id="weight-progress" \$\{initialSteps \? "hidden" : ""\}/);
    assert.match(progress, /data-initial-tab="\$\{initialSteps \? "steps" : "lifting"\}"/);
    assert.match(stability, /tabs\.dataset\.initialTab === "steps"/);
    assert.match(stability, /openStepsInitially/);
    assert.match(stability, /steps\.hidden = !openStepsInitially/);
});

test("Apple Health onboarding uses a recognizable, accessible Health icon", () => {
    assert.match(onboarding, /onboarding-apple-health-logo/);
    assert.match(onboarding, /onboarding-health-heart/);
    assert.match(onboarding, /data-apple-health-connect/);
    assert.match(onboardingCss, /onboarding-apple-health-logo/);
    assert.match(onboardingCss, /background:#fff/);
});

test("route and real tab controller both select Steps after all initializers", () => {
    assert.match(router, /selectProgressTab\("steps", \{ center: false \}\)/);
    assert.match(weightTracker, /export function selectProgressTab\(name,/);
    assert.match(weightTracker, /selectProgressTab\("steps", \{ center: false \}\)/);
    assert.match(weightTracker, /panel\.hidden = key !== name/);
    assert.match(weightTracker, /tab\.classList\.toggle\("active", key === name\)/);
});

test("real tab selector changes visible panel from Lifting to Steps", () => {
    const start=weightTracker.indexOf("export function selectProgressTab(");
    const end=weightTracker.indexOf("\nfunction initializeProgressTabs()",start);
    assert.ok(start>=0 && end>start);
    const tabIds={
        weight:["weight-tab","weight-progress"],
        lifting:["lifting-tab","lifting-progress"],
        nutrition:["nutrition-progress-tab","calorie-progress"],
        cardio:["cardio-progress-tab","cardio-progress"],
        steps:["steps-progress-tab","steps-progress"],
        photo:["photo-log-tab","photo-log-progress"]
    };
    const nodes=new Map();
    const classList=initial=>{
        const values=new Set(initial);
        return {
            toggle(key,on){if(on)values.add(key);else values.delete(key);},
            contains(key){return values.has(key);}
        };
    };
    for(const [key,[tab,panel]] of Object.entries(tabIds)){
        nodes.set(tab,{classList:classList(key==="lifting"?["active"]:[]),setAttribute(k,v){this[k]=v},scrollIntoView(){}});
        nodes.set(panel,{hidden:key!=="lifting"});
    }
    const strip={dataset:{}};
    const events=[];
    const scope={
        document:{getElementById:id=>nodes.get(id),querySelector:q=>q===".progress-tabs"?strip:null},
        window:{dispatchEvent:e=>events.push(e.type)},
        Event,CustomEvent:class {constructor(type){this.type=type}},
        requestAnimationFrame:fn=>fn(),
        updateWeightDisplay(){}
    };
    const fn=weightTracker.slice(start,end).replace("export function","function");
    const select=runInNewContext(fn+"\nselectProgressTab",scope);
    assert.equal(select("steps",{center:false}),true);
    assert.equal(nodes.get("steps-progress").hidden,false);
    assert.equal(nodes.get("lifting-progress").hidden,true);
    assert.equal(nodes.get("steps-progress-tab").classList.contains("active"),true);
    assert.equal(nodes.get("lifting-tab").classList.contains("active"),false);
    assert.equal(strip.dataset.currentTab,"steps");
    assert.ok(events.includes("levelup:steps-progress-opened"));
});
