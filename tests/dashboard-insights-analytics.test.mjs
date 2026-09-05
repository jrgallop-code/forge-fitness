import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const renderer = await readFile(new URL("../js/dashboard/dashboard-weight-trend-svg.js", import.meta.url), "utf8");
const weightCard = await readFile(new URL("../js/dashboard/dashboard-weight-trend-card.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../js/dashboard/dashboard-insights-analytics.js", import.meta.url), "utf8");
const analytics = await readFile(new URL("../js/dashboard/dashboard-insights-analytics-v3.js", import.meta.url), "utf8");

test("dashboard Trend Weight gets a visible left-to-right path trace", () => {
    assert.match(renderer, /pathLength="1"/);
    assert.match(weightCard, /calculateVisibleWeightTrend/);
    assert.match(analytics, /getTotalLength/);
    assert.match(analytics, /strokeDasharray/);
    assert.match(analytics, /strokeDashoffset/);
    assert.match(analytics, /path\.animate/);
    assert.match(analytics, /prefers-reduced-motion/);
});

test("See More sits immediately above the Weight Trend card", () => {
    assert.match(bridge, /dashboard-insights-analytics-v3/);
    assert.match(analytics, /dashboard-insights-see-more-row/);
    assert.match(analytics, />See More</);
    assert.doesNotMatch(analytics, />See all</i);
    assert.match(analytics, /weightCard\.insertAdjacentElement\("beforebegin", row\)/);
});

test("See More contains only goal and energy analytics", () => {
    assert.match(analytics, /GOAL PROGRESS/);
    assert.match(analytics, /Expenditure Over Time/);
    assert.match(analytics, /Calories vs Expenditure/);
    assert.doesNotMatch(analytics, /<h3>Weight Trend<\/h3>/);
});

test("goal progress uses phase start Trend Weight, current Trend Weight, and goal weight", () => {
    assert.match(analytics, /startingTrendWeight/);
    assert.match(analytics, /calculateVisibleWeightTrend/);
    assert.match(analytics, /trend\.trendWeight/);
    assert.match(analytics, /goalWeight/);
    assert.match(analytics, /Math\.min\(100/);
});

test("energy graphs mirror Progress data semantics and show current expenditure", () => {
    assert.match(analytics, /getCalculatedMaintenanceHistory/);
    assert.match(analytics, /level_up_tdee_chart_range_v1/);
    assert.match(analytics, /liveMaintenanceCalories/);
    assert.match(analytics, /completedDays/);
    assert.match(analytics, /current cal\/day/);
    assert.doesNotMatch(analytics, /AVERAGE/);
    assert.match(analytics, /Bars show logged calories\. The line shows the same daily expenditure used in Progress/);
    assert.match(analytics, /Uses the same daily expenditure values and selected range as Progress/);
});

test("dashboard energy lines animate from left to right", () => {
    assert.match(analytics, /function animate\(draw, duration = 1100\)/);
    assert.match(analytics, /requestAnimationFrame/);
    assert.match(analytics, /plotWidth \* progress/);
});
