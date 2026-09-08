import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [onboarding, bodyComposition, html, worker] = await Promise.all([
  read("js/onboarding/onboarding.js"),
  read("js/progress/body-composition-ui.js"),
  read("index.html"),
  read("service-worker.js")
]);

test("units and body composition have dedicated onboarding steps", () => {
  assert.match(onboarding, /"schedule","units","profile","body-composition","priorities"/);
  assert.match(onboarding, /function units\(\)/);
  assert.match(onboarding, /How do you measure your progress\?/);
  assert.match(onboarding, /function bodyComposition\(\)/);
  assert.match(onboarding, /Which body-composition range looks closest to you\?/);
});

test("personal details no longer contains duplicated unit or body-composition controls", () => {
  const profile = onboarding.match(/function profile\(\)\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.doesNotMatch(profile, /onboarding-units-disclosure/);
  assert.doesNotMatch(profile, /data-body-composition-slot/);
  assert.match(profile, /A few details to make it yours/);
});

test("body composition visual mounts only on its dedicated onboarding page", () => {
  assert.match(bodyComposition, /document\.querySelector\("\.onboarding-body-composition-screen"\)/);
  assert.match(bodyComposition, /screen\.querySelector\("\[data-body-composition-slot\]"\)/);
  assert.doesNotMatch(bodyComposition, /document\.querySelector\("\.onboarding-profile-screen"\)/);
});

test("selection-heavy onboarding pages update in place without replaying page animation", () => {
  assert.match(onboarding, /syncChoiceGroup\(group,b\.dataset\.choiceValue\)/);
  assert.match(onboarding, /syncScheduleScreen\(\);return updateContinueState\(\)/);
  assert.match(onboarding, /syncPriorityScreen\(\);return updateContinueState\(\)/);
  assert.match(onboarding, /function syncUnitChoices\(\)/);
});

test("revised onboarding assets are cache-busted", () => {
  assert.match(html, /onboarding-granular-units\.css\?v=onboarding-units-step-1/);
  assert.match(html, /onboarding\.js\?v=onboarding-units-body-comp-1/);
  assert.match(html, /pwa-startup-safeguard\.js\?v=onboarding-body-step-1/);
  assert.match(worker, /body-composition-ui\.js\?v=onboarding-body-step-1/);
  assert.match(worker, /CACHE_VERSION = "2026-09-08-275"/);
});
