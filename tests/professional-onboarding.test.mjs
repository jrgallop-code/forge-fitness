import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [source, styles, engine, html, worker] = await Promise.all([
  read("js/onboarding/onboarding.js"),
  read("css/onboarding.css"),
  read("js/workouts/smart-build-unified-engine-v11.js"),
  read("index.html"),
  read("service-worker.js")
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
  assert.match(html, /css\/onboarding\.css\?v=professional-onboarding-1/);
  assert.match(html, /js\/onboarding\/onboarding\.js\?v=professional-onboarding-1/);
  assert.match(worker, /CACHE_VERSION = "2026-09-02-142"/);
});
