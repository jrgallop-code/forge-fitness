import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("onboarding offers every existing appearance as a visual choice", async () => {
  const source = await read("js/onboarding/onboarding.js");

  assert.match(source, /APPEARANCE_THEMES/);
  assert.match(source, /function appearance\(\)/);
  assert.match(source, /onboarding-theme-grid/);
  assert.match(source, /appearance-theme-preview/);
  assert.match(source, /role="radiogroup"/);
  assert.match(source, /role="radio"/);
  assert.match(source, /aria-checked/);
});

test("onboarding applies and persists a selected theme immediately", async () => {
  const source = await read("js/onboarding/onboarding.js");

  assert.match(source, /const theme=getAppearanceTheme\(\)/);
  assert.match(source, /data-onboarding-theme/);
  assert.match(source, /applyAppearanceTheme\(answers\.theme\)/);
  assert.match(source, /changed anytime/);
  assert.match(source, /ONBOARDING_TOTAL=8/);
});

test("onboarding appearance cards have compact phone-friendly previews", async () => {
  const styles = await read("css/onboarding.css");

  assert.match(styles, /\.onboarding-theme-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.onboarding-theme-card \.appearance-theme-preview\{[^}]*height:94px/);
  assert.match(styles, /\.onboarding-theme-card\.selected/);
  assert.match(styles, /\.onboarding-theme-check/);
  assert.match(styles, /\.onboarding-screen h3\{/);
  assert.match(styles, /\.onboarding-units-disclosure/);
});
