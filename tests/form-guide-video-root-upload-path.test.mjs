import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ROOT_OBJECT_KEYS = [
  "overhead-press.mp4",
  "skull-crusher.mp4",
  "dumbbell-overhead-extension.mp4",
  "dip.mp4",
  "front-squat.mp4",
  "glute-bridge.mp4",
  "plank.mp4",
  "cable-crunch.mp4",
  "incline-machine-chest-press.mp4",
  "deficit-push-up.mp4",
  "dumbbell-fly.mp4",
  "incline-dumbbell-fly.mp4",
  "single-arm-cable-lat-pulldown.mp4",
  "wide-grip-lat-pulldown.mp4",
  "underhand-lat-pulldown.mp4",
  "plate-loaded-high-row.mp4",
  "t-bar-row.mp4",
  "wide-grip-cable-row.mp4",
  "machine-lateral-raise.mp4",
  "smith-machine-shoulder-press.mp4",
  "arnold-press.mp4",
  "cable-rear-delt-fly.mp4",
  "dumbbell-shrug.mp4",
  "dumbbell-preacher-curl.mp4",
  "machine-preacher-curl.mp4",
  "cross-body-hammer-curl.mp4",
  "spider-curl.mp4",
  "cable-skull-crusher.mp4",
  "ez-bar-skull-crusher.mp4",
  "machine-dip.mp4",
  "rope-triceps-pushdown.mp4",
  "dumbbell-romanian-deadlift.mp4",
  "hip-abduction-machine.mp4",
  "hip-adduction-machine.mp4",
  "hanging-leg-raise.mp4",
  "machine-crunch.mp4",
  "wrist-curl.mp4",
  "reverse-wrist-curl.mp4",
  "elliptical.mp4",
  "single-arm-dumbbell-row.mp4",
  "neutral-grip-lat-pulldown.mp4",
  "seal-row.mp4",
  "chest-supported-rear-delt-row.mp4",
  "smith-machine-shrug.mp4",
  "smith-machine-squat.mp4",
  "single-leg-leg-curl.mp4",
  "romanian-deadlift.mp4",
  "cable-pull-through.mp4",
  "cable-glute-kickback.mp4",
  "bodyweight-squat.mp4",
  "hanging-knee-raise.mp4"
];

test("51 newly uploaded Cloudflare form videos prefer the bucket root", () => {
  const source = readFileSync("js/workouts/exercise-guide-video-resolver.js", "utf8");
  assert.equal(ROOT_OBJECT_KEYS.length, 51);
  for (const key of ROOT_OBJECT_KEYS) {
    assert.ok(source.includes(`\"${key}\"`), `missing root object key ${key}`);
  }
  assert.match(source, /rootUploadedObjectKeys\.has\(config\.objectKey\)/);
  assert.match(source, /src: preferRoot \? rootSrc : librarySrc/);
  assert.match(source, /fallbackSrc: preferRoot \? librarySrc : rootSrc/);
});

test("legacy form videos keep form-videos as their preferred path", () => {
  const source = readFileSync("js/workouts/exercise-guide-video-resolver.js", "utf8");
  assert.match(source, /FORM_VIDEO_LIBRARY_BASE_URL = `\$\{FORM_VIDEO_ORIGIN\}\/form-videos`/);
});

test("form guide renderer retries the alternate Cloudflare path before hiding a video", () => {
  const source = readFileSync("js/workouts/exercise-guide-videos.js", "utf8");
  assert.match(source, /config\.fallbackSrc/);
  assert.match(source, /formGuideFallbackTried/);
  assert.match(source, /video\.load\(\)/);
});
