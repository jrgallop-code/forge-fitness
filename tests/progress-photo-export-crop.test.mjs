import assert from "node:assert/strict";
import test from "node:test";

import { calculateCroppedPhotoSource } from "../js/progress/photo-journal.js";

test("progress-photo export reproduces the preview's CSS pan and zoom", () => {
    const source = calculateCroppedPhotoSource(
        1200,
        1800,
        480,
        900,
        { scale: 2, nx: 0.5, ny: -0.25 }
    );

    // object-fit cover renders this image at 480 × 720 before the frame crops
    // it. A 2× CSS zoom plus +120 px x / -112.5 px y translation must map back
    // through the complete 1× render scale, not through the intrinsic crop.
    assert.deepEqual(source, {
        x: 240,
        y: 562.5,
        width: 480,
        height: 900
    });
});

test("a centred unzoomed export retains the normal object-fit cover crop", () => {
    assert.deepEqual(
        calculateCroppedPhotoSource(1600, 1200, 400, 800, { scale: 1, nx: 1, ny: -1 }),
        { x: 500, y: 0, width: 600, height: 1200 }
    );
});
