import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const EXPECTED_MAPPINGS = {
    "smith-machine-bench-press": "barbell-bench-press.mp4",
    "smith-machine-incline-press": "incline-barbell-press.mp4",
    "converging-chest-press": "machine-chest-press.mp4",
    "weighted-push-up": "push-up.mp4",
    "low-to-high-cable-fly": "cable-fly.mp4",
    "high-to-low-cable-fly": "cable-fly.mp4",
    "single-arm-dumbbell-row": "single-arm-dumbbell-row.mp4",
    "machine-row": "plate-loaded-high-row.mp4",
    "cable-lat-pullover": "straight-arm-pulldown.mp4",
    "neutral-grip-lat-pulldown": "neutral-grip-lat-pulldown.mp4",
    "chest-supported-t-bar-row": "t-bar-row.mp4",
    "seal-row": "seal-row.mp4",
    "leaning-cable-lateral-raise": "cable-lateral-raise.mp4",
    "cuffed-cable-lateral-raise": "cable-lateral-raise.mp4",
    "chest-supported-rear-delt-row": "chest-supported-rear-delt-row.mp4",
    "smith-machine-shrug": "smith-machine-shrug.mp4",
    "ez-bar-preacher-curl": "preacher-curl.mp4",
    "cable-preacher-curl": "preacher-curl.mp4",
    "single-arm-overhead-cable-extension": "overhead-tricep-extension.mp4",
    "weighted-dip": "dip.mp4",
    "single-arm-triceps-pushdown": "tricep-pushdown.mp4",
    "smith-machine-squat": "smith-machine-squat.mp4",
    "walking-lunge": "lunge.mp4",
    "single-leg-leg-curl": "single-leg-leg-curl.mp4",
    "romanian-deadlift": "romanian-deadlift.mp4",
    "cable-pull-through": "cable-pull-through.mp4",
    "cable-glute-kickback": "cable-glute-kickback.mp4",
    "bodyweight-squat": "bodyweight-squat.mp4",
    "hanging-knee-raise": "hanging-knee-raise.mp4"
};

test("near-match form video batch 29 has expected object mappings", () => {
    const source = readFileSync("js/workouts/exercise-guide-video-manifest.js", "utf8");
    const entries = Object.entries(EXPECTED_MAPPINGS);

    assert.equal(entries.length, 29);
    assert.equal(new Set(entries.map(([exerciseId]) => exerciseId)).size, 29);

    for (const [exerciseId, objectKey] of entries) {
        const expected = `\"${exerciseId}\": [\"${objectKey}\"`;
        assert.ok(source.includes(expected), `Missing ${exerciseId} -> ${objectKey}`);
    }
});
