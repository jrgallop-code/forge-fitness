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
    assert.match(worker, /const day = localDateKey\(now, analyticsTimeZone\(env\)\)/);
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
    assert.match(tracking, /reconcileRecentFoodLogEvents/);
    assert.match(tracking, /level_up_food_usage_reconciled_v1/);
    assert.match(tracking, /entry\.createdAt\|\|`\$\{dateKey\}T12:00:00\.000Z`/);
    assert.match(worker, /USAGE_EVENT_NAMES = new Set\(\["food_logged"\]\)/);
});

test("owner analytics reports current, returning, food, and workout usage", async () => {
    const [worker, admin, router, styles, workerConfig] = await Promise.all([
        read("cloud/src/index.js"),
        read("js/analytics/admin-analytics.js"),
        read("js/core/router.js"),
        read("css/admin-analytics-usage.css"),
        read("cloud/wrangler.jsonc")
    ]);
    for (const metric of ["users_today", "new_users_today", "engaged_users_today", "repeat_users", "foods_logged", "food_log_users", "workout_users"]) {
        assert.match(worker, new RegExp(metric));
        assert.match(admin, new RegExp(metric));
    }
    assert.match(worker, /America\/Halifax/);
    assert.match(worker, /localDayBounds/);
    assert.match(worker, /last_active_at >= \? AND last_active_at < \?/);
    assert.match(worker, /repeatUsers: \[\.\.\.activeDaysByUser\.values\(\)\]/);
    assert.match(admin, /Daily app usage/);
    assert.match(admin, /Signed-in users today/);
    assert.match(admin, /Engaged users today/);
    assert.match(admin, /Halifax local dates/);
    assert.match(admin, /admin-analytics-usage\.css\?v=halifax-local-day-1/);
    assert.match(router, /admin-analytics\.js\?v=halifax-local-day-1/);
    assert.match(workerConfig, /"ANALYTICS_TIME_ZONE": "America\/Halifax"/);
    assert.match(admin, /Users<\/span><span class="is-foods">Foods/);
    assert.match(styles, /admin-analytics-series--users/);
    assert.match(styles, /admin-analytics-series--foods/);
    assert.match(styles, /admin-analytics-series--workouts/);
    assert.match(worker, /people: people\?\.results/);
    assert.match(worker, /u\.display_name/);
    assert.match(admin, /Who logged activity/);
    assert.match(admin, /person\.display_name/);
    assert.match(admin, /statPeople\("Food loggers"/);
    assert.match(admin, /statPeople\("Workout users"/);
    assert.doesNotMatch(admin, /statPeople\("Users today"/);
    assert.doesNotMatch(admin, /statPeople\("Active users"/);
    assert.doesNotMatch(admin, /statPeople\("Returning users"/);
    assert.match(styles, /admin-analytics-stat-groups/);
    assert.match(styles, /admin-analytics-stat-person/);
});
