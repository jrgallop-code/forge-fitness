import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [source, styles, engine, html, worker, transparentMark] = await Promise.all([
  read("js/onboarding/onboarding.js"),
  read("css/onboarding.css"),
  read("js/workouts/smart-build-unified-engine-v11.js"),
  read("index.html"),
  read("service-worker.js"),
  read("assets/level-up-mark-transparent.svg")
]);

test("onboarding leads with an honest animated product preview", () => {
  assert.match(source, /EXAMPLE PROGRESS/);
  assert.match(source, /Estimated 1RM/);
  assert.match(source, /Weight trend/);
  assert.match(source, /Preview data shows/);
  assert.match(source, /aria-label="Example Level Up progress\. Preview data only\."/);
  assert.match(styles, /@keyframes onboarding-draw/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});

test("onboarding uses the transparent standalone brand mark across appearances", () => {
  assert.match(source, /assets\/level-up-mark-transparent\.svg\?v=1/);
  assert.doesNotMatch(styles, /onboarding-brand-lockup img[^}]*mix-blend-mode/);
  const payload = transparentMark.match(/data:image\/png;base64,([^\"]+)/)?.[1];
  assert.ok(payload, "brand mark should embed a PNG with alpha support");
  const png = Buffer.from(payload, "base64");
  assert.equal(png[25], 6, "embedded PNG should use RGBA color type");
});

test("onboarding collects the inputs needed for a personalized program", () => {
  assert.match(source, /START WITH THE OUTCOME/);
  assert.match(source, /MATCH YOUR EXPERIENCE/);
  assert.match(source, /BUILD AROUND YOUR LIFE/);
  assert.match(source, /CHOOSE YOUR FOCUS/);
  assert.match(source, /TRAIN YOUR WAY/);
  assert.match(source, /MAKE LEVEL UP YOURS/);
  assert.match(source, /data-training-setup/);
  assert.match(source, /equipment:answers\.equipment/);
  assert.match(source, /answers\.priorities\.length<3/);
  assert.match(source, /data-training-day/);
  assert.match(source, /trainingDays:answers\.trainingDays/);
  assert.match(source, /Tap the exact days you want to train/);
});

test("onboarding stays above the app navigation and keeps its actions tappable", () => {
  assert.match(styles, /body\.levelup-onboarding-open \.bottom-nav\{[^}]*visibility:hidden!important[^}]*pointer-events:none!important/);
  assert.match(styles, /\.levelup-onboarding\{[^}]*z-index:40000/);
  assert.match(source, /if\(g==="goal"\)\{answers\.primaryGoal=v/);
  assert.match(source, /if\(key==="goal"\)return!!answers\.primaryGoal/);
});

test("training location cards use descriptive SVG artwork", () => {
  assert.match(source, /function trainingSetupIcon/);
  assert.match(source, /full_gym:'<path/);
  assert.match(source, /minimal:'<path/);
  assert.match(source, /bodyweight:'<circle/);
  assert.match(styles, /\.onboarding-setup-icon svg/);
});

test("saved onboarding equipment is respected by Smart Build", () => {
  assert.match(engine, /const savedEquipment = Array\.isArray\(prefs\.equipment\)/);
  assert.match(engine, /equipment: savedEquipment\.length \? \[\.\.\.new Set\(savedEquipment\)\] : \["Full Gym"\]/);
});

test("acquisition is a required standalone onboarding page", () => {
  assert.match(source, /BUILT AROUND YOU/);
  assert.match(source, /YOUR STARTING POINT/);
  assert.match(source, /Your progress starts here/);
  assert.match(source, /"appearance","acquisition"/);
  assert.match(source, /function acquisition\(\)/);
  assert.match(source, /How did you find us\?/);
  assert.match(source, /onboarding-acquisition-list/);
  assert.match(source, /function acquisitionIcon/);
  assert.doesNotMatch(source, /<details class="onboarding-acquisition">/);
  assert.match(source, /Build My Workout Program/);
});

test("the professional onboarding release is cache-busted", () => {
  assert.match(html, /css\/onboarding\.css\?v=nutrition-feature-choice-1/);
  assert.match(html, /js\/onboarding\/onboarding\.js\?v=nutrition-steady-program-page-1/);
  assert.match(worker, /CACHE_VERSION = "2026-09-11-292"/);
});
