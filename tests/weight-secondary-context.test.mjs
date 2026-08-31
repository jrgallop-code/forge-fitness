import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync("js/progress/weight-carbs-chart.js", "utf8");
const module = readFileSync("js/progress/weight-secondary-context.js", "utf8");

test("Weight entry keeps the authoritative renderer and adds secondary context", () => {
    assert.match(entry, /initializeWeightCarbsChartV2\(root\)/);
    assert.match(entry, /initializeWeightCarbsInteractionEnhancements\(root\)/);
    assert.match(entry, /initializeWeightSecondaryContext\(root\)/);
    assert.match(entry, /weight-secondary-context\.js\?v=weight-secondary-context-1/);
});

test("Weight Trend points expose actual and seven-day trend snapshots", () => {
    assert.match(module, /#weight-trend-chart/);
    assert.match(module, /selectWeightPoint/);
    assert.match(module, /<b>Weight<\/b>/);
    assert.match(module, /<b>7-day trend<\/b>/);
    assert.match(module, /massUnit\(\)/);
    assert.match(module, /displayMass\(/);
    assert.doesNotMatch(module, /document\.addEventListener\("pointer/);
});

test("Weight carousel adds Sodium as the third graph after carbs", () => {
    assert.match(module, /data-weight-graph-slide-v2=\"sodium\"/);
    assert.match(module, /data-weight-graph-page-v2 = "2"|dataset\.weightGraphPageV2 = "2"/);
    assert.match(module, /Weight \+ Sodium/);
    assert.match(module, /repeat\(3,minmax\(0,1fr\)\)/);
});

test("Sodium uses an amber Level Up context color and milligram axis", () => {
    assert.match(module, /SODIUM_COLOR = "#e8a24d"/);
    assert.match(module, /fillText\("mg"/);
    assert.match(module, /is-sodium/);
});

test("Missing sodium remains missing instead of being treated as zero", () => {
    assert.match(module, /complete: known > 0 && missing === 0/);
    assert.match(module, /sodiumMg: sodium\.complete \? sodium\.totalMg : null/);
    assert.match(module, /More sodium data needed/);
    assert.doesNotMatch(module, /sodiumMg:\s*0/);
});

test("Sodium can be read from entry or saved food portion snapshots", () => {
    assert.match(module, /sodiumMgFromNutrition\(entry\?\.nutrition\)/);
    assert.match(module, /food\?\.portions/);
    assert.match(module, /sodiumMg/);
    assert.match(module, /sodium_mg/);
    assert.match(module, /saltG/);
});
