import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const chartSource = await readFile(new URL("../js/progress/weight-trend-chart.js", import.meta.url), "utf8");
const chartStyles = await readFile(new URL("../css/weight-chart-polish.css", import.meta.url), "utf8");
const progressMarkup = await readFile(new URL("../js/progress/progress-ui.js", import.meta.url), "utf8");
const weightTracker = await readFile(new URL("../js/progress/weight-tracker.js", import.meta.url), "utf8");
const compactStyles = await readFile(new URL("../css/weight-progress-compact.css", import.meta.url), "utf8");
const appEntry = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const routerSource = await readFile(new URL("../js/core/router.js", import.meta.url), "utf8");
const publishedEntry = await readFile(new URL("../index.html", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");

test("weight chart uses the Level Up emerald trend and faded area", () => {
    assert.match(chartSource, /const TREND_GREEN = "#45cb75"/);
    assert.match(chartSource, /createLinearGradient/);
    assert.match(chartSource, /rgba\(69, 203, 117, 0\.25\)/);
    assert.match(chartSource, /traceSmoothLine/);
    assert.doesNotMatch(chartSource, /setLineDash\(\[6, 5\]\)/);
});

test("weight history shows the shared weekly trend without shrinking columns", () => {
    assert.match(progressMarkup, /<span>Moving Average<\/span>/);
    assert.match(progressMarkup, /<span>Weekly Trend<\/span>/);
    assert.match(weightTracker, /calculateDisplayWeightTrend/);
    assert.match(weightTracker, /formatHistoryTrend/);
    assert.match(compactStyles, /overflow-x: auto/);
    assert.match(compactStyles, /min-width: 638px/);
    assert.match(compactStyles, /weight-history-trend\.is-down/);
});

test("weight chart polish keeps the card compact and summarizes the selected period", () => {
    assert.match(chartStyles, /\.weight-chart-period-stat strong/);
    assert.match(chartStyles, /color: #74dc98/);
    assert.match(chartStyles, /border-radius: 20px/);
    assert.match(progressMarkup, /7-DAY ROLLING AVERAGE/);
    assert.match(progressMarkup, /data-weight-chart-average/);
    assert.match(progressMarkup, /data-weight-chart-change/);
    assert.match(progressMarkup, /data-weight-chart-period/);
    assert.match(chartSource, /updatePeriodSummary\(legacyCanvas\.closest/);
    assert.match(chartSource, /movingAverage\.at\(-1\)\.date/);
    assert.match(chartSource, /month: "long"/);
    assert.match(chartSource, /startLabel} – \$\{endLabel/);
});

test("published app refreshes the full weight period summary module chain", () => {
    assert.match(publishedEntry, /js\/app\.js\?v=weight-period-summary-2/);
    assert.match(appEntry, /core\/router\.js\?v=weight-period-summary-2/);
    assert.match(routerSource, /progress\/progress-ui\.js\?v=weight-period-summary-2/);
    assert.match(publishedEntry, /weight-trend-chart\.js\?v=period-date-format-1/);
    assert.match(serviceWorker, /CACHE_VERSION = "2026-08-31-33"/);
});
