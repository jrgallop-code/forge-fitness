import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [onboarding, features, settings, more, router, styles, html, habits, insights] = await Promise.all([
    read("js/onboarding/onboarding.js"),
    read("js/core/app-feature-preferences.js"),
    read("js/more/app-feature-settings.js"),
    read("js/more/more-ui-v2.js"),
    read("js/core/router.js"),
    read("css/app-feature-settings.css"),
    read("index.html"),
    read("js/dashboard/dashboard-habit-cards.js"),
    read("js/dashboard/dashboard-insights-analytics-v5.js")
]);

test("onboarding asks whether nutrition should be tracked", () => {
    assert.match(onboarding, /Do you want to track nutrition\?/);
    assert.match(onboarding, /choice\("trackNutrition","yes"/);
    assert.match(onboarding, /Yes, track my nutrition/);
    assert.match(onboarding, /No, focus on training/);
});

test("nutrition questions only join the onboarding sequence after yes", () => {
    assert.match(onboarding, /answers\?\.trackNutrition===true\?\["nutrition-activity","nutrition-goal","nutrition-mode"\]:\[\]/);
    assert.match(onboarding, /How active is your typical week\?/);
    assert.match(onboarding, /What should your calories support right now\?/);
    assert.match(onboarding, /How should Level Up handle your calories\?/);
});

test("nutrition visibility defaults on and never deletes saved data", () => {
    assert.match(features, /nutritionEnabled !== false/);
    assert.doesNotMatch(features, /removeItem|clear\(/);
    assert.match(settings, /Turning nutrition off only hides it/);
});

test("More exposes the reversible nutrition setting", () => {
    assert.match(more, /data-more-page="app-features"/);
    assert.match(settings, /data-nutrition-feature-toggle/);
    assert.match(settings, /setNutritionEnabled\(toggle\.checked\)/);
});

test("disabled nutrition is hidden and direct nutrition routes are guarded", () => {
    assert.match(styles, /data-nutrition-enabled="false"[^}]*data-page="energy"/s);
    assert.match(styles, /#nutrition-progress-tab/);
    assert.match(styles, /\.dashboard-nutrition/);
    assert.match(router, /\["nutrition", "energy"\]\.includes\(page\) && !isNutritionEnabled\(\)/);
});

test("disabled nutrition removes dashboard check-ins and nutrition analytics", () => {
    assert.match(habits, /nutritionEnabled \? getMonthlyCheckInEvents/);
    assert.match(habits, /nutritionEnabled \? `<button[^`]*dashboard-habit-card--checkins/s);
    assert.match(habits, /levelup:app-features-updated/);
    assert.match(insights, /if \(!isNutritionEnabled\(\)\) \{\s*removeNutritionInsights\(\);/s);
    assert.match(insights, /export function openDashboardInsights\(\) \{\s*if \(!isNutritionEnabled\(\)\)/s);
    assert.match(styles, /\.dashboard-habit-card--checkins/);
    assert.match(styles, /\.dashboard-weight-see-more-action/);
    assert.match(styles, /#dashboard-insights-analytics-screen/);
});

test("published entry point loads the feature release", () => {
    assert.match(html, /css\/app-feature-settings\.css\?v=nutrition-feature-choice-1/);
    assert.match(html, /js\/onboarding\/onboarding\.js\?v=nutrition-feature-choice-1/);
    assert.match(html, /js\/app\.js\?v=nutrition-feature-choice-1/);
});
