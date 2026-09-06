import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const warmupPlate = await readFile(new URL("../js/workouts/warmup-plate-calculator.js", import.meta.url), "utf8");
const warmupBridge = await readFile(new URL("../js/workouts/warmup-session-fix.js", import.meta.url), "utf8");
const loggerCleanup = await readFile(new URL("../js/workouts/logger-ui-cleanup.js", import.meta.url), "utf8");

test("warm-ups reuse the same canonical plate trigger used by working sets", () => {
    assert.match(warmupPlate, /function canonicalTrigger/);
    assert.match(warmupPlate, /\.plate-calculator-trigger/);
    assert.doesNotMatch(warmupPlate, /createWarmupButton/);
    assert.doesNotMatch(warmupPlate, /Warm-up plates<\/strong>/);
    assert.match(warmupPlate, /cleanupLegacyWarmupControls/);
});

test("only the warm-up weight currently being edited owns the plate trigger", () => {
    assert.match(warmupPlate, /\.session-warmup-row \.session-warmup-weight/);
    assert.match(warmupPlate, /activeWarmupPlateIndex/);
    assert.match(warmupPlate, /row\.insertAdjacentElement\("afterend", trigger\)/);
    assert.match(warmupPlate, /clearWarmupSelection/);
    assert.match(warmupPlate, /\.session-set-row \.session-weight/);
});

test("warm-up calculator opens the existing working-set sheet with the warm-up load", () => {
    assert.match(warmupPlate, /warmup-plate-calculator-proxy/);
    assert.match(warmupPlate, /className = "session-set-row warmup-plate-calculator-proxy"/);
    assert.match(warmupPlate, /input\.className = "session-weight"/);
    assert.match(warmupPlate, /trigger\.insertAdjacentElement\("beforebegin", proxy\)/);
    assert.match(warmupPlate, /prepareWarmupProxyForCanonicalClick/);
});

test("warm-up plate display follows the canonical saved plate and base settings", () => {
    assert.match(warmupPlate, /level_up_plate_calculator_settings/);
    assert.match(warmupPlate, /DEFAULT_PLATES/);
    assert.match(warmupPlate, /OPTIONAL_PLATES/);
    assert.match(warmupPlate, /PLATE_MACHINE_IDS/);
    assert.match(warmupPlate, /plateSummary/);
    assert.match(warmupPlate, /plate-calculator-trigger-copy/);
});

test("warm-up sets remain warm-ups rather than entering working-set analytics", () => {
    assert.match(loggerCleanup, /setType:\s*"warmup"/);
    assert.doesNotMatch(warmupPlate, /forge_workout_sessions/);
    assert.doesNotMatch(warmupPlate, /1RM|oneRepMax|personalRecord|trainingVolume/i);
});

test("warm-up session bootstrap loads the working-set-parity bridge", () => {
    assert.match(warmupBridge, /warmup-plate-calculator\.js\?v=warmup-plate-calculator-3/);
});
