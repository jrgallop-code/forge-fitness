import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bmi = fs.readFileSync("css/bmi-card.css", "utf8");
const audit = fs.readFileSync("css/theme-surface-audit.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

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
    assert.match(html, /bmi-card\.css\?v=bmi-theme-visibility-1/);
    assert.match(html, /theme-surface-audit\.css\?v=theme-surface-audit-12/);
    assert.match(worker, /2026-09-02-127/);
});
