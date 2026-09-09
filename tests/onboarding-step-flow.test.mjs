import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [onboarding, bodyComposition, bodyCompositionCore, bodyFatArtwork, router, smartBuild, html, worker] = await Promise.all([
  read("js/onboarding/onboarding.js"),
  read("js/progress/body-composition-ui.js"),
  read("js/core/body-composition.js"),
  read("js/progress/body-fat-visual-replacement.js"),
  read("js/core/router.js"),
  read("js/workouts/smart-build.js"),
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
  assert.match(onboarding, /syncOnboardingProgress\(\);return updateContinueState\(\)/);
  assert.match(onboarding, /syncNutritionSelection\("\[data-nutrition-activity\]"/);
  assert.match(onboarding, /\[data-nutrition-preview\]/);
  assert.match(onboarding, /host\.innerHTML=nutritionModeContent\(\)/);
  assert.match(onboarding, /syncThemeChoices\(\);return updateContinueState\(\)/);
});

test("female anatomy uses a dedicated nine-range body-fat visual", () => {
  assert.match(onboarding, /data-anatomy-sex/);
  assert.match(bodyCompositionCore, /FEMALE_BODY_FAT_RANGES/);
  assert.match(bodyCompositionCore, /female-10-13/);
  assert.match(bodyCompositionCore, /female-42-plus/);
  assert.match(bodyComposition, /sex === "female" \? FEMALE_BODY_FAT_RANGES : BODY_FAT_RANGES/);
  assert.match(bodyFatArtwork, /body-fat-female-grid-v1\.webp/);
  assert.match(worker, /assets\/body-fat-female-grid-v1\.webp/);
});

test("personalized program building opens as its own page", () => {
  assert.match(onboarding, /page:"program-builder"/);
  assert.match(router, /case "program-builder"/);
  assert.match(router, /smart-build-dedicated-page/);
  assert.match(smartBuild, /!root\.matches\?\.\("\.smart-build-dedicated-page"\)/);
});

test("revised onboarding assets are cache-busted", () => {
  assert.match(html, /onboarding-granular-units\.css\?v=onboarding-units-step-1/);
  assert.match(html, /onboarding\.js\?v=nutrition-steady-program-page-1/);
  assert.match(html, /pwa-startup-safeguard\.js\?v=female-body-fat-selector-1/);
  assert.match(html, /app\.js\?v=smart-build-direct-open-1/);
  assert.match(worker, /body-composition-ui\.js\?v=female-body-fat-selector-1/);
  assert.match(worker, /CACHE_VERSION = "2026-09-09-286"/);
});
