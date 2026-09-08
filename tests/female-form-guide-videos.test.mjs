import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("female profiles resolve to the female Cloudflare form-guide path", async () => {
  globalThis.window = { __levelUpAnatomySexPreview: "female" };
  const { getFormGuideVideo } = await import("../js/workouts/exercise-guide-video-resolver.js?test=female-profile");

  const video = getFormGuideVideo("barbell-bench-press");
  assert.equal(video.src, "https://media.leveluphypertrophy.com/form-videos/female/barbell-bench-press.mp4");
  assert.equal(video.fallbackSrc, "https://media.leveluphypertrophy.com/form-videos/barbell-bench-press.mp4");
  assert.equal(video.storagePath, "form-videos/female");
});

test("the single missing female clip keeps the existing male guide", async () => {
  globalThis.window = { __levelUpAnatomySexPreview: "female" };
  const { getFormGuideVideo } = await import("../js/workouts/exercise-guide-video-resolver.js?test=female-fallback");

  const video = getFormGuideVideo("close-grip-bench-press");
  assert.equal(video.src, "https://media.leveluphypertrophy.com/form-videos/close-grip-bench-press.mp4");
  assert.doesNotMatch(video.src, /\/female\//);
});

test("male profiles retain the current Cloudflare path layout", async () => {
  globalThis.window = { __levelUpAnatomySexPreview: "male" };
  const { getFormGuideVideo } = await import("../js/workouts/exercise-guide-video-resolver.js?test=male-profile");

  const video = getFormGuideVideo("barbell-bench-press");
  assert.equal(video.src, "https://media.leveluphypertrophy.com/form-videos/barbell-bench-press.mp4");
  assert.equal(video.storagePath, "form-videos");
});

test("female dynamic warm-ups are first with existing sources retained as fallbacks", () => {
  const source = readFileSync("js/workouts/dynamic-warmup.js", "utf8");
  const femalePosition = source.indexOf("${WARMUP_VIDEO_ORIGIN}/female/${mediaKey}");
  const malePosition = source.indexOf("${WARMUP_VIDEO_ORIGIN}/${mediaKey}");

  assert.ok(femalePosition >= 0);
  assert.ok(malePosition > femalePosition);
  assert.match(source, /getAnatomySex\(\) === "female"/);
  assert.match(source, /return \[\.\.\.new Set\(urls\.filter\(Boolean\)\)\]/);
});

test("open form guides refresh when the saved profile sex changes", () => {
  const source = readFileSync("js/workouts/exercise-guide-videos.js", "utf8");
  assert.match(source, /levelup:profile-updated/);
  assert.match(source, /levelup:nutrition-updated/);
  assert.match(source, /existing\?\.dataset\.formGuideSrc === config\.src/);
});
