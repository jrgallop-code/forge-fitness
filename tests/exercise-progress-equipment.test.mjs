import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.localStorage = {
    getItem() { return null; }
};

const { resolveEquipmentLabel } = await import("../js/progress/exercise-progress-v2.js");

const progressChart = await readFile(new URL("../js/progress/exercise-progress-v2.js", import.meta.url), "utf8");

test("default progress records use the exercise's real equipment label", () => {
    assert.equal(resolveEquipmentLabel("barbell-curl"), "Barbell");
    assert.equal(resolveEquipmentLabel("dumbbell-curl", "default", "Default machine"), "Dumbbells");
});

test("saved machine names remain distinct", () => {
    assert.equal(
        resolveEquipmentLabel("machine-chest-press", "goodlife-penhorn", "Goodlife Penhorn · Machine"),
        "Goodlife Penhorn · Machine"
    );
});

test("single-series legend uses the same theme accent as its chart", () => {
    assert.match(progressChart, /profiles\.length === 1 \? "var\(--accent\)" : equipmentColor\(index\)/);
    assert.match(progressChart, /stroke="var\(--accent\)" stroke-width="3"/);
});

test("single-equipment exercises show their equipment instead of All equipment", () => {
    assert.match(progressChart, /profiles\[0\]\?\.name \|\| "Equipment"/);
    assert.match(progressChart, /select\.disabled = true/);
});
