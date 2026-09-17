import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [progressUi, progressChart, styles] = await Promise.all([
    readFile(new URL("../js/progress/progress-ui.js", import.meta.url), "utf8"),
    readFile(new URL("../js/progress/exercise-progress-v2.js", import.meta.url), "utf8"),
    readFile(new URL("../css/styles.css", import.meta.url), "utf8")
]);

test("machine-aware progress views are available only when a breakdown exists", () => {
    assert.match(progressUi, /data-machine-view="combined"/);
    assert.match(progressUi, /data-machine-view="compare"/);
    assert.match(progressUi, /data-machine-view="separate"/);
    assert.match(progressChart, /hasMachineBreakdown = selectedEquipment === "all" && profiles\.length > 1/);
    assert.match(progressChart, /controls\.hidden = !visible/);
    assert.match(progressChart, /compareButton\.hidden = !canCompare/);
});

test("machine progress supports normalized and raw separated charts", () => {
    assert.match(progressChart, /renderNormalizedMachineChart/);
    assert.match(progressChart, /PROGRESS FROM BASELINE \(%\)/);
    assert.match(progressChart, /renderSeparateMachineCharts/);
    assert.match(progressChart, /More workouts will form a line/);
    assert.match(styles, /machine-small-multiples/);
    assert.match(styles, /machine-progress-card/);
});

test("combined progress remains an undifferentiated line", () => {
    assert.match(progressChart, /Combined view connects every workout without differentiating machines/);
    assert.match(progressChart, /Combined line — machines are not differentiated/);
    assert.match(progressChart, /renderSvgChart\(host, records\)/);
});
