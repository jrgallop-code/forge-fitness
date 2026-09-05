import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../js/dashboard/dashboard-insights-analytics.js", import.meta.url), "utf8");
const analytics = await readFile(new URL("../js/dashboard/dashboard-insights-analytics-v5.js", import.meta.url), "utf8");
const weightStyles = await readFile(new URL("../css/dashboard-weight-trend-card.css", import.meta.url), "utf8");

test("original dashboard Trend Weight card styling remains intact", () => {
    assert.doesNotMatch(weightStyles, /dashboard-analytics-screen/);
    assert.doesNotMatch(weightStyles, /dashboard-insights-see-all/);
    assert.match(weightStyles, /dashboard-weight-trend-button/);
});

test("See More is visually above Trend Weight without making its grid cell taller", () => {
    assert.match(bridge, /dashboard-insights-analytics-v5/);
    assert.match(analytics, /dashboard-weight-see-more-wrap\{position:relative;display:block;min-width:0;height:148px/);
    assert.match(analytics, /dashboard-weight-see-more-action\{position:absolute;right:2px;top:-28px/);
    assert.match(analytics, /dashboard-seven-day-sets-card\{height:148px!important;min-height:148px!important;max-height:148px!important;align-self:start!important/);
    assert.match(analytics, />See More</);
});

test("See More uses a compact two-column analytics card grid", () => {
    assert.match(analytics, /dashboard-preview-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(analytics, /dashboard-preview-card\{position:relative;display:flex;min-width:0;min-height:166px/);
    assert.match(analytics, /<h3>Expenditure<\/h3>/);
    assert.match(analytics, /<h3>Calories vs Expenditure<\/h3>/);
    assert.match(analytics, /<h3>Goal Progress<\/h3>/);
    assert.doesNotMatch(analytics, /<h3>Weight Trend<\/h3>/);
    assert.match(analytics, /Last 7 Days/);
});

test("mini energy charts contain no x-axis date or weekday labels", () => {
    assert.doesNotMatch(analytics, /dashboard-preview-label/);
    assert.doesNotMatch(analytics, /weekday:\s*"narrow"/);
    assert.doesNotMatch(analytics, /month:\s*"numeric"/);
    assert.doesNotMatch(analytics, /<text/);
});

test("Calories vs Expenditure spans exactly seven calendar positions", () => {
    assert.match(analytics, /Array\.from\(\{ length: 7 \}/);
    assert.match(analytics, /history\.filter\(point => point\.date < start\)/);
    assert.match(analytics, /live \?\? lastUsable \?\? reviewed/);
    assert.match(analytics, /const step = \(width - left - right\) \/ 6/);
    assert.match(analytics, /point\.expenditure/);
});

test("energy previews use live expenditure history and completed food-day rules", () => {
    assert.match(analytics, /getCalculatedMaintenanceHistory/);
    assert.match(analytics, /liveMaintenanceCalories/);
    assert.match(analytics, /level_up_food_log_complete_days_v1/);
    assert.match(analytics, /shiftDateKey\(today, -6\)/);
});

test("energy preview cards navigate to authoritative Progress graphs", () => {
    assert.match(analytics, /data-dashboard-open-progress="expenditure"/);
    assert.match(analytics, /data-dashboard-open-progress="comparison"/);
    assert.match(analytics, /nav-btn\[data-page="progress"\]/);
    assert.match(analytics, /nutrition-progress-tab/);
    assert.match(analytics, /data-tdee-chart-range="1w"/);
    assert.match(analytics, /expenditure-trend-card/);
    assert.match(analytics, /data-calorie-expenditure-comparison-card/);
});

test("goal preview is based on phase start Trend Weight, current Trend Weight, and goal weight", () => {
    assert.match(analytics, /startingTrendWeight/);
    assert.match(analytics, /calculateVisibleWeightTrend/);
    assert.match(analytics, /trend\.trendWeight/);
    assert.match(analytics, /goalWeight/);
    assert.match(analytics, /Math\.min\(100/);
});
