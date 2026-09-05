import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const card = await readFile(new URL("../js/dashboard/dashboard-weight-trend-card.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../js/dashboard/dashboard-insights-analytics.js", import.meta.url), "utf8");

test("dashboard weight card cache-busts the v5 analytics bridge", () => {
    assert.match(card, /dashboard-insights-analytics\.js\?v=dashboard-insights-5/);
    assert.match(bridge, /dashboard-insights-analytics-v5\.js\?v=dashboard-insights-5/);
});
