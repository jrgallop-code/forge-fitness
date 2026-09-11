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

test("lifting inputs save canonical pounds while displaying the selected unit", () => {
  values.clear();
  units.setUnitPreferences({ liftingWeight: "kg" }, { reload: true });

  const metricInput = {
    value: "100",
    dataset: {
      levelUpUnitKind: units.UNIT_KINDS.LIFTING_WEIGHT,
      levelUpRenderedUnit: units.METRIC
    }
  };
  const canonical = units.canonicalInputValue(metricInput);
  assert.ok(Math.abs(canonical - 220.4623) < 0.0001);
  assert.equal(units.formatMass(canonical, 1, units.UNIT_KINDS.LIFTING_WEIGHT), "100 kg");

  const placeholderInput = {
    placeholder: "",
    dataset: { levelUpUnitKind: units.UNIT_KINDS.LIFTING_WEIGHT }
  };
  units.setCanonicalUnitPlaceholder(placeholderInput, canonical);
  assert.equal(placeholderInput.placeholder, "100");

  metricInput.value = String(canonical);
  metricInput.dataset.levelUpRenderedUnit = units.IMPERIAL;
  assert.equal(units.canonicalInputValue(metricInput), canonical);

  units.setUnitPreferences({ liftingWeight: "lb" }, { reload: true });
  assert.equal(units.formatMass(canonical, 1, units.UNIT_KINDS.LIFTING_WEIGHT), "220.5 lb");
  units.setCanonicalUnitPlaceholder(placeholderInput, canonical);
  assert.equal(placeholderInput.placeholder, "220.5");
});

test("workout surfaces use canonical lifting weights and unit-aware display", async () => {
  const [session, drops, prompts, history, recap, progress, calibration, plates] = await Promise.all([
    read("js/workouts/workout-session.js"),
    read("js/workouts/drop-set-runtime.js"),
    read("js/workouts/progression-prompt-v2.js"),
    read("js/workouts/workout-history.js"),
    read("js/workouts/workout-complete-recap.js"),
    read("js/progress/training-progress.js"),
    read("js/workouts/starting-weight-calibration.js"),
    read("js/workouts/plate-calculator.js")
  ]);

  assert.match(session, /set\.weight = canonicalInputValue\(event\.target\)/);
  assert.match(session, /formatUnitMass\(value, 1, UNIT_KINDS\.LIFTING_WEIGHT\)/);
  assert.match(drops, /canonicalInputValue\(input\)/);
  assert.match(prompts, /weight: canonicalInputValue\(row\.querySelector\('\.session-weight'\)\)/);
  assert.match(prompts, /setCanonicalUnitPlaceholder\(weight, previousSet\?\.weight/);
  assert.match(history, /formatUnitMass\(weight, 1, UNIT_KINDS\.LIFTING_WEIGHT\)/);
  assert.match(recap, /formatUnitMass\(stats\.volume, 0, UNIT_KINDS\.LIFTING_WEIGHT\)/);
  assert.match(progress, /formatUnitMass\(set\.weight, 1, UNIT_KINDS\.LIFTING_WEIGHT\)/);
  assert.match(calibration, /canonicalInputValue\(modal\.querySelector\('\.starting-weight-test-load'\)\)/);
  assert.match(plates, /calculationTotalForProfile\(canonicalInputValue\(input\)/);
});

test("onboarding and settings expose all four choices", async () => {
  const [onboarding, settings, more, router] = await Promise.all([
    read("js/onboarding/onboarding.js"),
    read("js/more/unit-settings.js"),
    read("js/more/more-ui-v2.js"),
    read("js/core/router.js")
  ]);

  for (const kind of ["bodyWeight", "liftingWeight", "distance", "length"]) {
    assert.match(onboarding, new RegExp(`unitChoice\\(\"${kind}\"`));
    assert.match(settings, new RegExp(`key: \"${kind}\"`));
  }
  assert.match(onboarding, /setUnitPreferences\(answers\.unitPreferences\)/);
  assert.match(onboarding, /use pounds for body weight and kilometres for cardio/);
  assert.match(onboarding, /unitChoice\("distance","Cardio distance",\[\["km","Kilometres"\],\["mi","Miles"\]\]\)/);
  assert.match(onboarding, /class="onboarding-unit-preferences" data-unit-text-ignore/);
  assert.match(settings, /class="unit-settings-groups" data-unit-text-ignore/);
  assert.match(settings, /\["mi", "Miles", "mi"\]/);
  assert.match(more, /unit-settings\.js\?v=more-units-miles-1/);
  assert.match(router, /more-ui-v2\.js\?v=more-units-miles-1/);
});
