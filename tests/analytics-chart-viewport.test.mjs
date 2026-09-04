import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const path = "js/progress/analytics-chart-zoom.js";
const source = readFileSync(path, "utf8");

test("authoritative chart viewport module parses", () => {
  const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("legacy chart renderers cannot overwrite the visible viewport chart", () => {
  assert.match(source, /analytics-viewport-legacy\{display:none!important\}/);
  assert.match(source, /canvas\.removeAttribute\("id"\)/);
  assert.match(source, /canvas\.removeAttribute\("data-expenditure-chart"\)/);
  assert.match(source, /data-analytics-viewport-chart/);
});

test("weight and expenditure use one persisted visible date window", () => {
  assert.match(source, /level_up_weight_chart_viewport_v4/);
  assert.match(source, /level_up_expenditure_chart_viewport_v4/);
  assert.match(source, /function effectiveWindow\(/);
  assert.match(source, /updateWeightSummary\(instance, state\.start, state\.end/);
  assert.match(source, /updateExpenditureSummary\(instance, state\.start, state\.end/);
});

test("viewport interaction supports pinch pan exact dates and overview scrubbing", () => {
  assert.match(source, /MIN_VISIBLE_DAYS = 2/);
  assert.match(source, /windowAroundAnchor/);
  assert.match(source, /analytics-viewport-date-panel/);
  assert.match(source, /analytics-viewport-scrubber/);
  assert.match(source, /data-viewport-apply/);
  assert.match(source, /data-viewport-reset/);
});

test("Y scale stays fixed during live gestures and settles after commit", () => {
  assert.match(source, /renderInstance\(instance,\s*\{\s*freezeY:\s*true\s*\}\s*\)/);
  assert.match(source, /animateCommittedScale/);
  assert.match(source, /interpolateScale/);
});

test("mobile date controls cannot overlap and expenditure footer sits outside chart shell", () => {
  assert.match(source, /@media\(max-width:520px\)/);
  assert.match(source, /analytics-viewport-date-panel\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(source, /min-inline-size:0;max-inline-size:100%/);
  assert.match(source, /const expenditureShell = kind === "expenditure"/);
  assert.match(source, /const footerAnchor = expenditureShell \|\| stage/);
  assert.match(source, /expenditure-chart-hint\{display:none!important\}/);
  assert.match(source, /expenditure-chart-ranges\{position:relative!important/);
});
