import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/nutrition/phase-goal-controls.js", import.meta.url), "utf8");

test("saving goal weight in the current phase preserves calories when no calorie increase is entered", () => {
    assert.match(source, /const samePhase = Boolean\(active && active\.goalId === goalId\)/);
    assert.match(source, /const currentTarget = positive\(active\?\.currentCalories \?\? active\?\.startCalories\)/);
    assert.match(source, /samePhase[\s\S]*currentTarget \+ directTarget[\s\S]*: currentTarget/);
    assert.doesNotMatch(source, /const targetCalories = directTarget \?\? Math\.round\(maintenance \+ Number\(preset\?\.dailyCalorieAdjustment/);
});

test("same-phase calorie entry remains an increase rather than being treated as a full target", () => {
    assert.match(source, /currentTarget \+ directTarget/);
    assert.match(source, /Added \$\{directTarget\} kcal\/day/);
});

test("recent accidental planned target rewrites can be safely restored", () => {
    assert.match(source, /repairRecentAccidentalPlannedTarget/);
    assert.match(source, /latest\.source !== "planned"/);
    assert.match(source, /GOAL_WEIGHT_REPAIR_MAX_AGE_MS/);
    assert.match(source, /current !== accidental \|\| accidental !== expectedFallback/);
    assert.match(source, /source: GOAL_WEIGHT_REPAIR_SOURCE/);
    assert.match(source, /syncCalculatedCalories\(previous\)/);
    assert.match(source, /localStorage\.removeItem\(PENDING_REVIEW_KEY\)/);
});
