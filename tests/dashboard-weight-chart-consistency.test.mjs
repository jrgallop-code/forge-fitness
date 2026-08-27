import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const renderer = await readFile(new URL("../js/dashboard/dashboard-weight-trend-svg.js", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../js/dashboard/dashboard-weight-trend-card.js", import.meta.url), "utf8");
const future = await readFile(new URL("../js/progress/future-weight-testing.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../css/dashboard-weight-trend-card.css", import.meta.url), "utf8");

test("dashboard and future-preview cards share one weight trend renderer", () => {
    assert.match(dashboard, /dashboard-weight-trend-svg/);
    assert.match(future, /dashboard-weight-trend-svg/);
    assert.doesNotMatch(dashboard, /function buildSparklinePath/);
    assert.doesNotMatch(future, /function buildSparklinePath/);
});

test("compact renderer shows only the smoothed seven-day trend", () => {
    assert.match(renderer, /6 \* DAY_MS/);
    assert.match(renderer, /dashboard-weight-trend-average/);
    assert.match(renderer, /traceSmoothPath/);
    assert.match(styles, /stroke:#45cb75/);
    assert.doesNotMatch(renderer, /daily-line|daily-point|trend-area|latest-halo|<circle/);
});
