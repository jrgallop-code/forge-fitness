import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { epley1RM, convertGymWeight } from "../js/core/gym-tools-math.js";

const read = file => fs.readFileSync(file,"utf8");
const gym = read("js/core/ios-gym-tools.js");
const quick = read("js/core/ios-quick-log.js");
const plate = read("js/workouts/plate-calculator.js");
const native = read("ios/App/App/LevelUpTimerPlugin.swift");
const state = read("ios/App/App/LevelUpTimerAttributes.swift");
const widget = read("ios/App/LevelUpTimerWidget/LevelUpTimerWidget.swift");
const index = read("index.html");
const plateCss = read("css/plate-calculator.css");

test("Epley 1RM handles low reps and invalid sets", () => {
  assert.equal(epley1RM(100,1),100);
  assert.ok(Math.abs(epley1RM(100,3)-110) < 1e-9);
  assert.ok(Math.abs(epley1RM(90,10)-120) < 1e-9);
  assert.equal(epley1RM(100,0),null);
  assert.equal(epley1RM(100,31),null);
  assert.equal(epley1RM(-20,8),null);
  assert.equal(epley1RM(100,2.5),null);
});

test("Machine kg to lb and reverse conversion use consistent factors", () => {
  assert.ok(Math.abs(convertGymWeight(100,"kg","lb")-220.462262185)<1e-6);
  assert.ok(Math.abs(convertGymWeight(220.462262185,"lb","kg")-100)<1e-6);
  assert.equal(convertGymWeight(50,"kg","kg"),50);
  assert.equal(convertGymWeight(50,"unknown","lb"),null);
});

test("Gym Tools are exclusive to iOS Quick Log and omit back-off sets", () => {
  assert.match(quick,/data-ql-action="gym-tools"/);
  assert.match(quick,/openGymTools\(\)/);
  assert.match(gym,/openStandalonePlateCalculator/);
  assert.match(plate,/export function openStandalonePlateCalculator/);
  assert.match(plate,/renderPlateVisual\(solution\)/);
  assert.match(plate,/BAR_WEIGHT_PRESETS\[liftingUnit\]/);
  assert.match(plate,/plate-calculator-bar-options/);
  assert.match(plate,/plate-calculator-plate-options/);
  assert.match(plate,/const STANDALONE_ID/);
  assert.match(plate,/if \(card\?\.dataset\?\.exerciseId === STANDALONE_ID\) return/);
  assert.match(gym,/plate-calculator\.js\?v=stopwatch-blank-20261120/);
  assert.match(quick,/ios-gym-tools\.js\?v=stopwatch-blank-20261120/);
  assert.match(index,/js\/app\.js\?v=[a-z0-9-]+/i);
  assert.match(gym,/\["oneRM", "1RM"\]/);
  assert.match(gym,/\["stopwatch", "Stopwatch"\]/);
  assert.doesNotMatch(gym,/Back-Off Sets/);
  assert.match(index,/css\/ios-gym-tools\.css\?v=stopwatch-blank-20261120/);
});

test("Lock screen uses existing native elapsed Live Activity, without alarm", () => {
  assert.match(gym,/plugin\.startHold/);
  assert.match(gym,/kind: "stopwatch"/);
  assert.match(gym,/getState/);
  assert.match(gym,/STOPWATCH_KEY/);
  assert.match(native,/record\.kind = call\.getString\("kind"\) == "stopwatch"/);
  assert.match(native,/record\.endAt = nil/);
  assert.match(state,/record\.kind == "hold" \|\| record\.kind == "stopwatch"/);
  assert.match(state,/record\.kind == "stopwatch"/);
  assert.match(widget,/GYM STOPWATCH/);
  assert.match(widget,/stopwatchControls/);
  assert.match(widget,/ToggleLevelUpTimerIntent/);
  assert.match(widget,/SkipLevelUpTimerIntent/);
  assert.match(widget,/countsDown: context\.attributes\.kind != "hold" && context\.attributes\.kind != "stopwatch"/);
});

test("Quick Log standalone plate entry always follows selected theme", () => {
  const standalone = plateCss.slice(plateCss.indexOf("/* Gym Tools standalone entry"));
  assert.ok(standalone.length > 100, "Standalone style section exists");
  for (const token of ["--plate-card", "--plate-text", "--plate-heading", "--plate-muted", "--plate-line"]) {
    assert.ok(standalone.includes("var(" + token + ")"), token + " is used by the standalone card");
  }
  assert.doesNotMatch(standalone, /background:\s*linear-gradient\([^;]*#(?:17171b|121216)/);
  assert.doesNotMatch(standalone, /color:\s*#(?:fff|f5f5f7|a4a4b1)\s*;/);
  assert.match(plate, /plate-calculator\.css\?v=plate-theme-parity-20261120/);
});

test("New Quick Log entry fields are blank and stopwatch uses theme tokens", () => {
  const quick = read("js/core/ios-quick-log.js");
  const gym = read("js/core/ios-gym-tools.js");
  const themeCss = read("css/ios-gym-tools.css");
  assert.match(quick, /const shown = ""/);
  assert.doesNotMatch(quick, /value = existingToday\?\.weight/);
  assert.match(gym, /field\("Weight", "target", ""\)/);
  assert.match(gym, /field\("Working weight", "target", ""\)/);
  assert.match(gym, /field\("Repetitions \(1–30\)", "reps", ""/);
  assert.match(plate, /standaloneLoad = null/);
  assert.match(themeCss, /gym-tools-stopwatch-panel[\s\S]*?var\(--accent-soft\)/);
  assert.match(themeCss, /gym-tools-stopwatch-panel \.gym-tools-clock-main[\s\S]*?var\(--heading\)/);
  assert.match(themeCss, /gym-tools-timer-actions button:first-child[\s\S]*?var\(--accent-contrast\)/);
});
