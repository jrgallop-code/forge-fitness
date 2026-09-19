import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bmi = fs.readFileSync("css/bmi-card.css", "utf8");
const bmiCard = fs.readFileSync("js/more/bmi-card.js", "utf8");
const audit = fs.readFileSync("css/theme-surface-audit.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const app = fs.readFileSync("js/app.js", "utf8");
const router = fs.readFileSync("js/core/router.js", "utf8");
const more = fs.readFileSync("js/more/more-ui-v2.js", "utf8");

test("BMI value and gauge ranges use semantic theme colors", () => {
    assert.match(bmi, /\.bmi-index-value\s*\{[\s\S]*color:\s*var\(--heading/);
    assert.match(bmi, /\.bmi-gauge-track\s*\{\s*stroke:\s*var\(--line/);
    assert.match(bmi, /\.bmi-healthy\s*\{\s*stroke:\s*var\(--success/);
    assert.match(bmi, /\.bmi-over\s*\{\s*stroke:\s*var\(--warning/);
    assert.match(bmi, /\.bmi-obesity\s*\{\s*stroke:\s*var\(--danger/);
});

test("BMI pointer remains visible in every appearance", () => {
    assert.match(audit, /html\[data-theme\] \.bmi-gauge-pointer line/);
    assert.match(audit, /stroke:\s*var\(--accent-text\)\s*!important/);
    assert.match(audit, /stroke-width:\s*4\s*!important/);
    assert.match(audit, /html\[data-theme\] \.bmi-gauge-pointer circle/);
    assert.match(audit, /fill:\s*var\(--card\)\s*!important/);
});

test("BMI visibility release is cache-busted", () => {
    assert.match(html, /bmi-card\.css\?v=bmi-medical-sources-1/);
    assert.match(html, /js\/app\.js\?v=[^"']*bmi-medical-sources-1/);
    assert.match(app, /router\.js\?v=[^"']*bmi-medical-sources-1/);
    assert.match(router, /more-ui-v2\.js\?v=[^"']*bmi-medical-sources-1/);
    assert.match(more, /bmi-card\.js\?v=bmi-medical-sources-1/);
    assert.match(html, /theme-surface-audit\.css\?v=theme-surface-audit-14/);
    assert.match(worker, /2026-09-18-341/);
});

test("BMI screen explains its formula and adult reference thresholds", () => {
    assert.match(bmiCard, /weight \(kg\) ÷ height² \(m²\)/);
    assert.match(bmiCard, /adults age 20 and older/i);
    assert.match(bmiCard, /Below 18\.5/);
    assert.match(bmiCard, /18\.5–24\.9/);
    assert.match(bmiCard, /25\.0–29\.9/);
    assert.match(bmiCard, /30\.0 or greater/);
});

test("BMI screen includes medical limitations and authoritative sources", () => {
    assert.match(bmiCard, /Screening measure, not a diagnosis/);
    assert.match(bmiCard, /does not directly measure body fat or distinguish fat, muscle and bone/i);
    assert.match(bmiCard, /Do not use this result to make medical decisions/);
    assert.match(bmiCard, /consult a qualified healthcare professional/);
    assert.match(bmiCard, /https:\/\/www\.cdc\.gov\/bmi\/adult-calculator\/bmi-categories\.html/);
    assert.match(bmiCard, /https:\/\/www\.nhlbi\.nih\.gov\/calculate-your-bmi/);
    assert.match(bmiCard, /target="_blank" rel="noopener noreferrer"/);
});
