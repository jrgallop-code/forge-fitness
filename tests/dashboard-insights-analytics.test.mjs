import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../js/dashboard/dashboard-insights-analytics.js", import.meta.url), "utf8");
const analytics = await readFile(new URL("../js/dashboard/dashboard-insights-analytics-v5.js", import.meta.url), "utf8");
const positionFix = await readFile(new URL("../js/dashboard/dashboard-see-more-position-fix.js", import.meta.url), "utf8");
const workoutTheme = await readFile(new URL("../js/core/workout-theme-guardrail.js", import.meta.url), "utf8");
const weightCard = await readFile(new URL("../js/dashboard/dashboard-weight-trend-card.js", import.meta.url), "utf8");
const weightStyles = await readFile(new URL("../css/dashboard-weight-trend-card.css", import.meta.url), "utf8");

test("original dashboard Trend Weight card styling remains intact", () => {
    assert.doesNotMatch(weightStyles, /dashboard-analytics-screen/);
    assert.doesNotMatch(weightStyles, /dashboard-insights-see-all/);
    assert.match(weightStyles, /dashboard-weight-trend-button/);
});

test("See More has a dedicated gap above the analytics row without changing card dimensions", () => {
    assert.match(bridge, /dashboard-insights-analytics-v5/);
    assert.match(bridge, /dashboard-see-more-position-fix/);
    assert.match(bridge, /dashboard-see-more-position-3/);
    assert.match(analytics, /dashboard-weight-see-more-wrap\{position:relative;display:block;min-width:0;height:148px/);
    assert.match(positionFix, /margin-top:\s*24px\s*!important/);
    assert.match(positionFix, /top:\s*-27px\s*!important/);
    assert.match(analytics, /dashboard-seven-day-sets-card\{height:148px!important;min-height:148px!important;max-height:148px!important;align-self:start!important/);
    assert.match(analytics, />See More</);
    assert.match(weightCard, /dashboard-insights-analytics\.js\?v=dashboard-insights-6/);
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

test("workout PR and set-number colors follow the selected appearance", () => {
    assert.match(bridge, /workout-theme-guardrail/);
    assert.match(workoutTheme, /html\[data-theme\] #workout-session-logger \.session-set-row > strong/);
    assert.match(workoutTheme, /background:\s*var\(--accent\)\s*!important/);
    assert.match(workoutTheme, /color:\s*var\(--accent-contrast\)\s*!important/);
    assert.match(workoutTheme, /\.live-pr-exercise-badge/);
    assert.match(workoutTheme, /background:\s*var\(--accent-soft\)\s*!important/);
    assert.match(workoutTheme, /color:\s*var\(--accent-text\)\s*!important/);
    assert.match(workoutTheme, /\.live-pr-toast/);
    assert.doesNotMatch(workoutTheme, /#17181d|#121318/);
});
