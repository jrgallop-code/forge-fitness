import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [tracker, styles, router, index] = await Promise.all([
    readFile(new URL("../js/progress/measurements-tracker.js", import.meta.url), "utf8"),
    readFile(new URL("../css/measurements.css", import.meta.url), "utf8"),
    readFile(new URL("../js/core/router.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
]);

test("Measurements removes the oversized anatomy guide and prioritizes logging", () => {
    assert.doesNotMatch(tracker, /measurement-body-(?:front|back)|measurement-artwork|measurement-view-tab/);
    assert.match(tracker, /NEW CHECK-IN/);
    assert.match(tracker, /How to measure consistently/);
    assert.match(tracker, /Latest measurements/);
});

test("Measurements presents meaningful per-area changes without an aggregate total", () => {
    assert.match(tracker, /Areas Tracked/);
    assert.match(tracker, /measurement-current/);
    assert.match(tracker, /measurement-change/);
    assert.doesNotMatch(tracker, /Net Change Since Start|getNetChange|measurements-total-change/);
});

test("Measurement history is expandable and includes actual recorded values", () => {
    assert.match(tracker, /<details class="measurement-history-row">/);
    assert.match(tracker, /measurement-history-values/);
    assert.match(tracker, /data-edit-measurement/);
    assert.match(tracker, /data-delete-measurement/);
});

test("mobile measurement layout cannot create a viewport-wide minimum table", () => {
    assert.doesNotMatch(styles, /min-width:\s*(?:5[2-9]\d|[6-9]\d\d)px/);
    assert.match(styles, /#content:has\(> \.measurements-page\)/);
    assert.match(styles, /overflow-x:\s*hidden/);
    assert.match(styles, /grid-template-columns:\s*minmax\(68px, 1\.05fr\) repeat\(3, minmax\(0, \.95fr\)\)/);
});

test("the cleaned measurements assets are cache-busted and old detail enhancer is not initialized", () => {
    assert.match(router, /measurements-mobile-cleanup-1/);
    assert.doesNotMatch(router, /initializeMeasurementHistoryDetail/);
    assert.match(index, /css\/measurements\.css\?v=measurements-mobile-cleanup-1/);
});
