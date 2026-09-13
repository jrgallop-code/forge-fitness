import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../js/dashboard/dashboard-insights-analytics.js", import.meta.url), "utf8");
const analytics = await readFile(new URL("../js/dashboard/dashboard-insights-analytics-v5.js", import.meta.url), "utf8");
const energyState = await readFile(new URL("../js/nutrition/energy-balance-state.js", import.meta.url), "utf8");
const energySummary = await readFile(new URL("../js/nutrition/tdee-energy-balance-summary.js", import.meta.url), "utf8");
const expenditureGraph = await readFile(new URL("../js/nutrition/tdee-live-daily-expenditure.js", import.meta.url), "utf8");
const goalTimeline = await readFile(new URL("../js/dashboard/dashboard-goal-timeline.js", import.meta.url), "utf8");
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
    assert.match(weightCard, /dashboard-insights-analytics\.js\?v=energy-summary-1/);
});

test("See More uses a compact two-column analytics card grid", () => {
    assert.match(analytics, /dashboard-preview-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(analytics, /dashboard-preview-card\{position:relative;display:flex;min-width:0;min-height:166px/);
    assert.match(analytics, /<h3>Expenditure<\/h3>/);
    assert.match(analytics, /<h3>Calories vs Expenditure<\/h3>/);
    assert.match(goalTimeline, /<h3>Goal Timeline<\/h3>/);
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
    assert.match(analytics, /shiftEnergyDateKey\(today, -6\)/);
    assert.match(energyState, /for \(let date = visibleStart; date <= endDate; date = shiftEnergyDateKey\(date, 1\)\)/);
    assert.match(energyState, /ordered\.filter\(point => point\.date < visibleStart\)/);
    assert.match(energyState, /lastUsable \?\? reviewed/);
    assert.match(analytics, /const step = \(width - left - right\) \/ 6/);
    assert.match(analytics, /point\.expenditure/);
});

test("energy previews use live expenditure history and completed food-day rules", () => {
    assert.match(analytics, /getEnergyBalanceState/);
    assert.match(analytics, /shiftEnergyDateKey\(today, -6\)/);
    assert.match(energyState, /getCalculatedMaintenanceHistory/);
    assert.match(energyState, /liveMaintenanceCalories/);
    assert.match(energyState, /readFoodLog\(\)/);
    assert.match(energyState, /readCompletedFoodDays\(\)/);
});

test("Dashboard and Progress share one expenditure and energy-balance state", () => {
    assert.match(analytics, /averageExpenditure: state\.averageVisibleExpenditure/);
    assert.match(analytics, /balance: state\.balance/);
    assert.match(analytics, /kcal\/day avg/);
    assert.match(energySummary, /getEnergyBalanceState\(\{ startDate: requestedStart, endDate \}\)/);
    assert.match(expenditureGraph, /getEnergyBalanceState\(\{ startDate, endDate \}\)/);
    assert.doesNotMatch(analytics, /getCalculatedMaintenanceEstimate|getCalculatedMaintenanceHistory/);
    assert.doesNotMatch(analytics, /readJson\(FOOD_LOG_KEY/);
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
    assert.match(analytics, /getGoalTimelineViewModel/);
    assert.match(goalTimeline, /startingTrendWeight/);
    assert.match(goalTimeline, /calculateVisibleWeightTrend/);
    assert.match(goalTimeline, /trend\.trendWeight/);
    assert.match(goalTimeline, /goalWeight/);
    assert.match(goalTimeline, /calculateGoalTimeline/);
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
