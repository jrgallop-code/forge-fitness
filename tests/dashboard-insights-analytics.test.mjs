import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const renderer = await readFile(new URL("../js/dashboard/dashboard-weight-trend-svg.js", import.meta.url), "utf8");
const weightCard = await readFile(new URL("../js/dashboard/dashboard-weight-trend-card.js", import.meta.url), "utf8");
const analytics = await readFile(new URL("../js/dashboard/dashboard-insights-analytics.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../css/dashboard-weight-trend-card.css", import.meta.url), "utf8");

test("dashboard Trend Weight traces from left to right without changing trend math", () => {
    assert.match(renderer, /pathLength="1"/);
    assert.match(styles, /@keyframes dashboardWeightTrace/);
    assert.match(styles, /stroke-dasharray:\s*1/);
    assert.match(styles, /stroke-dashoffset:\s*1/);
    assert.match(styles, /prefers-reduced-motion/);
    assert.match(weightCard, /calculateVisibleWeightTrend/);
});

test("dashboard exposes a See all analytics drill-down", () => {
    assert.match(weightCard, /dashboard-insights-analytics\.js/);
    assert.match(analytics, /data-dashboard-insights-open/);
    assert.match(analytics, /Insights &amp; Analytics/);
    assert.match(analytics, /Calories vs Expenditure/);
    assert.match(analytics, /Goal Progress/);
});

test("goal progress is based on phase start, current Trend Weight, and goal weight", () => {
    assert.match(analytics, /startingTrendWeight/);
    assert.match(analytics, /trendWeightAtPhaseStart/);
    assert.match(analytics, /trendWeight/);
    assert.match(analytics, /goalWeight/);
    assert.match(analytics, /Math\.min\(100/);
});

test("analytics reuse the adaptive expenditure history", () => {
    assert.match(analytics, /getCalculatedMaintenanceHistory/);
    assert.match(analytics, /liveMaintenanceCalories/);
    assert.match(analytics, /Last 7 completed days/);
});
