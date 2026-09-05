import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const renderer = await readFile(new URL("../js/dashboard/dashboard-weight-trend-svg.js", import.meta.url), "utf8");
const weightCard = await readFile(new URL("../js/dashboard/dashboard-weight-trend-card.js", import.meta.url), "utf8");
const analytics = await readFile(new URL("../js/dashboard/dashboard-insights-analytics.js", import.meta.url), "utf8");
const shared = await readFile(new URL("../js/nutrition/calorie-expenditure-shared.js", import.meta.url), "utf8");
const progressComparison = await readFile(new URL("../js/nutrition/tdee-calorie-expenditure-carousel.js", import.meta.url), "utf8");
const runtimeStyles = await readFile(new URL("../js/dashboard/dashboard-see-more-style.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../css/dashboard-weight-trend-card.css", import.meta.url), "utf8");

test("dashboard Trend Weight visibly traces left to right without changing trend math", () => {
    assert.match(renderer, /pathLength="1"/);
    assert.match(styles, /@keyframes dashboardWeightTrace/);
    assert.match(weightCard, /playTrendTrace/);
    assert.match(weightCard, /1400ms/);
    assert.match(weightCard, /calculateVisibleWeightTrend/);
});

test("See More sits immediately before the dashboard Weight Trend card", () => {
    assert.match(analytics, /dashboard-insights-see-more-row/);
    assert.match(analytics, /See More/);
    assert.match(analytics, /weightCard\.insertAdjacentElement\("beforebegin", row\)/);
    assert.doesNotMatch(analytics, /button\.textContent = "See all"/);
    assert.match(runtimeStyles, /grid-column:\s*1 \/ -1/);
});

test("additional analytics are limited to goal, expenditure, and calories vs expenditure", () => {
    assert.match(analytics, /Goal Progress/);
    assert.match(analytics, /data-dashboard-expenditure-card/);
    assert.match(analytics, /Calories vs Expenditure/);
    assert.doesNotMatch(analytics, /dashboard-analytics-weight-card/);
});

test("dashboard and Progress use one calorie expenditure state and renderer", () => {
    assert.match(progressComparison, /calorie-expenditure-shared\.js/);
    assert.match(progressComparison, /buildCaloriesExpenditureState/);
    assert.match(progressComparison, /renderCaloriesExpenditureChart/);
    assert.match(analytics, /buildCaloriesExpenditureState/);
    assert.match(analytics, /renderCaloriesExpenditureChart/);
    assert.match(shared, /liveMaintenanceCalories/);
    assert.match(shared, /intakeCalories/);
});

test("dashboard expenditure uses the same live-first carry-forward logic as Progress and shows current expenditure", () => {
    assert.match(analytics, /currentLive/);
    assert.match(analytics, /lastUsable/);
    assert.match(analytics, /mode: "updating"/);
    assert.match(analytics, /mode: "holding"/);
    assert.match(analytics, /current kcal \/ day/);
    assert.doesNotMatch(analytics, /averageExpenditure/);
});

test("canvas expenditure lines animate and respect reduced motion", () => {
    assert.match(shared, /animateLine/);
    assert.match(shared, /requestAnimationFrame/);
    assert.match(shared, /prefers-reduced-motion/);
    assert.match(analytics, /renderExpenditureChart/);
    assert.match(analytics, /950/);
});
