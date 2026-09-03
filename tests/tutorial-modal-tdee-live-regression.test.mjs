import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const modal = await readFile(new URL("../js/core/contextual-tutorial-modal.js", import.meta.url), "utf8");
const entry = await readFile(new URL("../js/progress/weight-carbs-chart.js", import.meta.url), "utf8");
const weightSync = await readFile(new URL("../js/progress/weight-visible-trend-sync-v2.js", import.meta.url), "utf8");
const liveTdee = await readFile(new URL("../js/nutrition/tdee-live-display-sync.js", import.meta.url), "utf8");

test("Trend Weight and TDEE launchers use the app-level modal", () => {
    assert.match(modal, /data-trend-tutorial-launch/);
    assert.match(modal, /data-tdee-tutorial-launch/);
    assert.match(modal, /position: fixed/);
    assert.match(modal, /document\.addEventListener\("pointerup"/);
    assert.doesNotMatch(modal, /document\.addEventListener\("pointerdown"/);
    assert.match(entry, /contextual-tutorial-modal\.js\?v=contextual-modal-2/);
});

test("active visible weight sync no longer rewrites TDEE copy", () => {
    assert.match(entry, /weight-visible-trend-sync-v2/);
    assert.doesNotMatch(weightSync, /syncTdeeCopy/);
    assert.doesNotMatch(weightSync, /calculated-maintenance-breakdown/);
});

test("TDEE breakdown exposes live smoothed estimate without changing reviewed value", () => {
    assert.match(liveTdee, /Live TDEE from current data/);
    assert.match(liveTdee, /liveMaintenanceCalories/);
    assert.match(liveTdee, /reviewed TDEE remains/);
    assert.match(liveTdee, /weightRateLbPerWeek/);
    assert.match(liveTdee, /energyCorrection/);
    assert.doesNotMatch(liveTdee, /localStorage\.setItem/);
});
