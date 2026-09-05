import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const BATCH_39_IDS = [
    "overhead-press",
    "skull-crusher",
    "dumbbell-overhead-extension",
    "dip",
    "front-squat",
    "glute-bridge",
    "plank",
    "cable-crunch",
    "incline-machine-chest-press",
    "deficit-push-up",
    "dumbbell-fly",
    "incline-dumbbell-fly",
    "single-arm-cable-lat-pulldown",
    "wide-grip-lat-pulldown",
    "underhand-lat-pulldown",
    "plate-loaded-high-row",
    "t-bar-row",
    "wide-grip-cable-row",
    "machine-lateral-raise",
    "smith-machine-shoulder-press",
    "arnold-press",
    "cable-rear-delt-fly",
    "dumbbell-shrug",
    "dumbbell-preacher-curl",
    "machine-preacher-curl",
    "cross-body-hammer-curl",
    "spider-curl",
    "cable-skull-crusher",
    "ez-bar-skull-crusher",
    "machine-dip",
    "rope-triceps-pushdown",
    "dumbbell-romanian-deadlift",
    "hip-abduction-machine",
    "hip-adduction-machine",
    "hanging-leg-raise",
    "machine-crunch",
    "wrist-curl",
    "reverse-wrist-curl",
    "elliptical"
];

test("Cloudflare batch 39 exercises have deterministic form-video object keys", () => {
    const source = readFileSync("js/workouts/exercise-guide-video-manifest.js", "utf8");

    assert.equal(BATCH_39_IDS.length, 39);
    assert.equal(new Set(BATCH_39_IDS).size, 39);

    for (const exerciseId of BATCH_39_IDS) {
        const expected = `\"${exerciseId}\": [\"${exerciseId}.mp4\"`;
        assert.ok(
            source.includes(expected),
            `Missing form-video mapping for ${exerciseId}`
        );
    }
});
