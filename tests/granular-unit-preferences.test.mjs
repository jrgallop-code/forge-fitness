import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { language: "en-CA" }
});
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
};
globalThis.window = {
  dispatchEvent() {},
  location: { reload() {} }
};

const units = await import("../js/core/unit-system.js?test=granular-unit-preferences");
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Canadian users can default to pounds and kilometres", () => {
  values.clear();
  assert.deepEqual(units.getUnitPreferences(), {
    bodyWeight: "lb",
    liftingWeight: "lb",
    distance: "km",
    length: "cm"
  });
});

test("existing metric or imperial selection migrates without changing behavior", () => {
  values.clear();
  values.set(units.UNIT_SYSTEM_KEY, units.METRIC);
  assert.deepEqual(units.getUnitPreferences(), {
    bodyWeight: "kg",
    liftingWeight: "kg",
    distance: "km",
    length: "cm"
  });
});

test("body, lifting, distance and length preferences remain independent", () => {
  values.clear();
  units.setUnitPreferences({
    bodyWeight: "lb",
    liftingWeight: "kg",
    distance: "km",
    length: "in"
  }, { reload: true });

  assert.equal(units.massUnit(units.UNIT_KINDS.BODY_WEIGHT), "lb");
  assert.equal(units.massUnit(units.UNIT_KINDS.LIFTING_WEIGHT), "kg");
  assert.equal(units.distanceUnit(), "km");
  assert.equal(units.lengthUnit(), "in");
  assert.equal(units.displayMass(100, 1, units.UNIT_KINDS.BODY_WEIGHT), 100);
  assert.equal(units.displayMass(100, 1, units.UNIT_KINDS.LIFTING_WEIGHT), 45.4);
});

test("onboarding and settings expose all four choices", async () => {
  const [onboarding, settings] = await Promise.all([
    read("js/onboarding/onboarding.js"),
    read("js/more/unit-settings.js")
  ]);

  for (const kind of ["bodyWeight", "liftingWeight", "distance", "length"]) {
    assert.match(onboarding, new RegExp(`unitChoice\\(\"${kind}\"`));
    assert.match(settings, new RegExp(`key: \"${kind}\"`));
  }
  assert.match(onboarding, /setUnitPreferences\(answers\.unitPreferences\)/);
  assert.match(onboarding, /pounds and kilometres are fully supported/);
});
