import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const onboarding = readFileSync(new URL("../js/onboarding/onboarding.js", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../js/dashboard/dashboard-command-center.js", import.meta.url), "utf8");
const dashboardStyles = readFileSync(new URL("../css/dashboard-command-center.css", import.meta.url), "utf8");
const moreProfile = readFileSync(new URL("../js/more/profile-appearance.js", import.meta.url), "utf8");
const moreMenu = readFileSync(new URL("../js/more/more-ui-v2.js", import.meta.url), "utf8");
const moreProfileStyles = readFileSync(new URL("../css/profile-appearance.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

test("onboarding asks for an optional name or username and saves it with the profile", () => {
  assert.match(onboarding, /What should we call you\?/);
  assert.match(onboarding, /data-answer="displayName"/);
  assert.match(onboarding, /maxlength="40"/);
  assert.match(onboarding, /displayName:String\(answers\.displayName\|\|""\)\.trim\(\)\.slice\(0,40\)/);
});

test("the dashboard greets named users and keeps the standard heading when skipped", () => {
  assert.match(dashboard, /level_up_nutrition_profile/);
  assert.match(dashboard, /if \(!name\) return "DASHBOARD"/);
  assert.match(dashboard, /Good morning/);
  assert.match(dashboard, /Good afternoon/);
  assert.match(dashboard, /Good evening/);
  assert.match(dashboard, /<h2>\$\{dashboardHeading\(\)\}<\/h2>/);
  assert.match(dashboard, /escapeHtml\(name\)/);
  assert.match(dashboardStyles, /\.dashboard-command-header h2\s*\{[^}]*overflow-wrap: anywhere/);
});

test("More Body Profile edits the onboarding name used by the dashboard", () => {
  assert.match(moreMenu, /<strong>Body Profile<\/strong><small>Update your name/);
  assert.match(moreProfile, /Name or username/);
  assert.match(moreProfile, /name="displayName"/);
  assert.match(moreProfile, /maxlength="40"/);
  assert.match(moreProfile, /displayName: String\(form\.get\("displayName"\) \|\| ""\)\.trim\(\)\.replace\(\/\\s\+\/g, " "\)\.slice\(0, 40\)/);
  assert.match(moreProfile, /levelup:profile-updated/);
  assert.match(moreProfileStyles, /profile-name-field\{grid-column:1\/-1\}/);
});

test("the personalized onboarding and dashboard release is cache-busted", () => {
  assert.match(index, /js\/onboarding\/onboarding\.js\?v=onboarding-units-miles-1/);
  assert.match(index, /js\/dashboard\/dashboard-command-center\.js\?v=dashboard-greeting-1/);
  assert.match(index, /css\/dashboard-command-center\.css\?v=dashboard-greeting-1/);
  assert.match(worker, /2026-09-02-140/);
});
