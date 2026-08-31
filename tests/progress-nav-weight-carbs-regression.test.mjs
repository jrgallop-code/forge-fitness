import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const toggle = readFileSync("js/progress/weight-carbs-detail-toggle.js", "utf8");
const navbar = readFileSync("js/components/navbar.js", "utf8");

test("Weight and Carbs detail toggle cannot intercept primary navigation", () => {
    assert.doesNotMatch(toggle, /document\.addEventListener\("pointerdown"/);
    assert.match(toggle, /card\.addEventListener\("pointerdown"/);
    assert.match(toggle, /tooltip\.contains\(event\.target\)/);
    assert.match(navbar, /data-page="progress"/);
    assert.match(navbar, /nav\.addEventListener\(\s*"click"/);
});

test("Weight and Carbs summary still has an explicit close path", () => {
    assert.match(toggle, /clearViaExistingRangeControl/);
    assert.match(toggle, /selectedRange\.click\(\)/);
    assert.match(toggle, /Tap the summary or graph again to close details/);
});
