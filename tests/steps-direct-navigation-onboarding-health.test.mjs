import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const steps = read("js/progress/steps-progress-carousel.js");
const progress = read("js/progress/progress-ui.js");
const stability = read("js/progress/progress-initial-tab-stability.js");
const insights = read("js/dashboard/dashboard-insights-analytics-v5.js");
const onboarding = read("js/onboarding/onboarding.js");
const onboardingCss = read("css/onboarding.css");

test("Dashboard Steps opens Progress with the Steps tab requested synchronously", () => {
    assert.match(insights, /closeDashboardInsights\(\); openStepsInProgress\(\)/);
    assert.match(steps, /__levelUpProgressInitialTab = "steps"/);
    assert.match(steps, /new CustomEvent\("levelup:navigate"/);
    assert.doesNotMatch(steps, /window\.setTimeout\(open,\s*60\)/);
    assert.doesNotMatch(steps, /tab\.click\(\)/);
});

test("Progress markup is rendered in Steps mode without showing Weight first", () => {
    assert.match(progress, /const initialSteps = window\.__levelUpProgressInitialTab === "steps"/);
    assert.match(progress, /id="steps-progress-tab"/);
    assert.match(progress, /id="steps-progress" \$\{initialSteps \? "" : "hidden"\}/);
    assert.match(progress, /id="weight-progress" \$\{initialSteps \? "hidden" : ""\}/);
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
