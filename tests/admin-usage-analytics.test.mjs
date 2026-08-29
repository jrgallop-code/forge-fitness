import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("usage analytics records one active event per user per day", async () => {
    const [worker, migration] = await Promise.all([
        read("cloud/src/index.js"),
        read("cloud/migrations/0008_usage_analytics.sql")
    ]);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS usage_events/);
    assert.match(migration, /UNIQUE \(user_id, event_name, event_key\)/);
    assert.match(worker, /'app_active'/);
    assert.match(worker, /ON CONFLICT\(user_id, event_name, event_key\) DO NOTHING/);
    assert.match(worker, /const day = now\.slice\(0, 10\)/);
});

test("food additions create deduplicated analytics events", async () => {
    const [data, tracking, worker] = await Promise.all([
        read("js/nutrition/food-log-data.js"),
        read("js/analytics/acquisition.js"),
        read("cloud/src/index.js")
    ]);
    assert.match(data, /action: "foods_added"/);
    assert.match(data, /entryIds: safeEntries\.map/);
    assert.match(tracking, /detail\.action!=="foods_added"/);
    assert.match(tracking, /trackProductEvent\("food_logged"/);
    assert.match(worker, /USAGE_EVENT_NAMES = new Set\(\["food_logged"\]\)/);
});

test("owner analytics reports current, returning, food, and workout usage", async () => {
    const [worker, admin, styles] = await Promise.all([
        read("cloud/src/index.js"),
        read("js/analytics/admin-analytics.js"),
        read("css/admin-analytics-usage.css")
    ]);
    for (const metric of ["users_today", "repeat_users", "foods_logged", "food_log_users", "workout_users"]) {
        assert.match(worker, new RegExp(metric));
        assert.match(admin, new RegExp(metric));
    }
    assert.match(worker, /COUNT\(DISTINCT substr\(occurred_at, 1, 10\)\) >= 2/);
    assert.match(admin, /Daily app usage/);
    assert.match(admin, /Users<\/span><span class="is-foods">Foods/);
    assert.match(styles, /admin-analytics-series--users/);
    assert.match(styles, /admin-analytics-series--foods/);
    assert.match(styles, /admin-analytics-series--workouts/);
});
