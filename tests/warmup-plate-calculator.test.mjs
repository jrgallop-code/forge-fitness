import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const warmupPlate = await readFile(new URL("../js/workouts/warmup-plate-calculator.js", import.meta.url), "utf8");
const warmupBridge = await readFile(new URL("../js/workouts/warmup-session-fix.js", import.meta.url), "utf8");

test("warm-up rows expose plate calculator only when the exercise already has the canonical plate calculator", () => {
    assert.match(warmupPlate, /workingPlateTrigger/);
    assert.match(warmupPlate, /\.plate-calculator-trigger/);
    assert.match(warmupPlate, /\.session-warmup-row/);
    assert.match(warmupPlate, /if \(!baseTrigger \|\| !rows\.length\)/);
});

test("warm-up calculator uses the warm-up load and reuses the canonical plate calculator sheet", () => {
    assert.match(warmupPlate, /\.session-warmup-weight/);
    assert.match(warmupPlate, /warmup-plate-calculator-proxy/);
    assert.match(warmupPlate, /className = "session-set-row warmup-plate-calculator-proxy"/);
    assert.match(warmupPlate, /input\.className = "session-weight"/);
    assert.match(warmupPlate, /baseTrigger\.click\(\)/);
    assert.match(warmupPlate, /proxy\.remove\(\)/);
});

test("warm-up plate control is icon-only and appears only for the active warm-up row", () => {
    assert.match(warmupPlate, /warmup-plate-weight-wrap/);
    assert.match(warmupPlate, /plate-calculator-trigger-icon/);
    assert.match(warmupPlate, /activeWarmupPlateIndex/);
    assert.match(warmupPlate, /button\.hidden = !isCurrent/);
    assert.match(warmupPlate, /setCurrentWarmup/);
    assert.doesNotMatch(warmupPlate, /Warm-up plates<\/strong>/);
    assert.doesNotMatch(warmupPlate, /warmup-plate-calculator-trigger-copy/);
    assert.doesNotMatch(warmupPlate, /warmup-plate-calculator-chevron/);
});

test("focusing a working-set load clears the warm-up calculator selection", () => {
    assert.match(warmupPlate, /\.session-set-row \.session-weight/);
    assert.match(warmupPlate, /clearCurrentWarmup/);
});

test("warm-up session bootstrap loads the compact warm-up plate calculator", () => {
    assert.match(warmupBridge, /warmup-plate-calculator\.js\?v=warmup-plate-calculator-2/);
});
