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
});

test("saved onboarding equipment is respected by Smart Build", () => {
  assert.match(engine, /const savedEquipment = Array\.isArray\(prefs\.equipment\)/);
  assert.match(engine, /equipment: savedEquipment\.length \? \[\.\.\.new Set\(savedEquipment\)\] : \["Full Gym"\]/);
});

test("completion reveals the plan and keeps acquisition outside the required flow", () => {
  assert.match(source, /BUILT AROUND YOU/);
  assert.match(source, /YOUR STARTING POINT/);
  assert.match(source, /Your progress starts here/);
  assert.match(source, /<details class="onboarding-acquisition">/);
  assert.match(source, /Help us improve Level Up/);
  assert.match(source, /Build My Workout Program/);
});

test("the professional onboarding release is cache-busted", () => {
  assert.match(html, /css\/onboarding\.css\?v=transparent-logo-1/);
  assert.match(html, /js\/onboarding\/onboarding\.js\?v=transparent-logo-1/);
  assert.match(worker, /CACHE_VERSION = "2026-09-03-143"/);
});
