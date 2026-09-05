import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../js/dashboard/dashboard-insights-analytics.js", import.meta.url), "utf8");
const analytics = await readFile(new URL("../js/dashboard/dashboard-insights-analytics-v4.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../css/dashboard-weight-trend-card.css", import.meta.url), "utf8");

test("original dashboard Trend Weight card styling is restored", () => {
    assert.doesNotMatch(styles, /dashboard-analytics-screen/);
    assert.doesNotMatch(styles, /dashboard-insights-see-all/);
    assert.match(styles, /dashboard-weight-trend-button/);
});

test("See More is attached only to the Trend Weight card cell", () => {
    assert.match(bridge, /dashboard-insights-analytics-v4/);
    assert.match(analytics, /dashboard-weight-see-more-wrap/);
    assert.match(analytics, /dashboard-weight-see-more-action/);
    assert.match(analytics, />See More</);
    assert.doesNotMatch(analytics, />See all</i);
    assert.match(analytics, /wrapper\.appendChild\(card\)/);
});

test("See More contains exactly the requested preview types", () => {
    assert.match(analytics, /<h3>Expenditure<\/h3>/);
    assert.match(analytics, /<h3>Calories vs Expenditure<\/h3>/);
    assert.match(analytics, /<h3>Goal Progress<\/h3>/);
    assert.doesNotMatch(analytics, /<h3>Weight Trend<\/h3>/);
    assert.match(analytics, /Last 7 days/);
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
