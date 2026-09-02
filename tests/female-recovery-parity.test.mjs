import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.localStorage = { getItem() { return null; } };
globalThis.window = { __levelUpAnatomySexPreview: "female" };

const { getAnatomyConfig } = await import("../js/core/anatomy-profile.js?test=female-recovery-parity");

test("female recovery views use the same canonical muscle groups as male views", () => {
  window.__levelUpAnatomySexPreview = "female";
  const femaleFront = getAnatomyConfig("front");
  const femaleBack = getAnatomyConfig("back");

  window.__levelUpAnatomySexPreview = "male";
  const maleFront = getAnatomyConfig("front");
  const maleBack = getAnatomyConfig("back");

  assert.deepEqual(Object.keys(femaleFront.regions), Object.keys(maleFront.regions));
  assert.deepEqual(Object.keys(femaleBack.regions), Object.keys(maleBack.regions));
});

test("female recovery overlays never select traced hand groups or overlap muscle states", () => {
  window.__levelUpAnatomySexPreview = "female";

  for (const side of ["front", "back"]) {
    const ids = Object.values(getAnatomyConfig(side).regions).flat();
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.some(id => /female_(?:front|back)_forearms_[lr]/.test(id)), false);
  }
});

test("every configured female recovery region exists in its SVG", async () => {
  window.__levelUpAnatomySexPreview = "female";

  for (const side of ["front", "back"]) {
    const svg = await readFile(new URL(`../assets/recovery/female-${side}-view.svg`, import.meta.url), "utf8");
    const ids = Object.values(getAnatomyConfig(side).regions).flat();

    for (const id of ids) {
      assert.match(svg, new RegExp(`id=["']${id}["']`), `${side} SVG is missing ${id}`);
    }
  }
});
