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
        read("admin/admin-analytics.js"),
        read("js/core/router.js"),
        read("admin/admin-analytics-usage.css"),
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
    assert.match(admin, /admin-analytics-usage\.css\?v=owner-dashboard-1/);
    assert.doesNotMatch(router, /admin-analytics/);
    assert.match(workerConfig, /"ANALYTICS_TIME_ZONE": "America\/Halifax"/);
    assert.match(admin, /Users<\/span><span class="is-foods">Foods/);
    assert.match(styles, /admin-analytics-series--users/);
    assert.match(styles, /admin-analytics-series--foods/);
    assert.match(styles, /admin-analytics-series--workouts/);
    assert.match(worker, /people: people\?\.results/);
    assert.match(worker, /u\.display_name/);
    assert.match(worker, /AS latest_activity_at/);
    assert.match(worker, /ORDER BY latest_activity_at DESC/);
    assert.match(worker, /LIMIT 500/);
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

test("owner analytics can query new users and their first-day logging by date", async () => {
    const [worker, admin, dashboard, app] = await Promise.all([
        read("cloud/src/index.js"),
        read("admin/admin-analytics.js"),
        read("admin/daily-user-query.js"),
        read("admin/app.js")
    ]);
    assert.match(worker, /url\.searchParams\.get\("date"\)/);
    assert.match(worker, /selectedDayUsers/);
    assert.match(worker, /u\.created_at >= \? AND u\.created_at < \?/);
    assert.match(worker, /AS food_logs/);
    assert.match(worker, /AS workout_logs/);
    assert.match(worker, /selectedDay:\s*\{/);
    assert.match(dashboard, /type="date"/);
    assert.match(dashboard, /Active users/);
    assert.match(dashboard, /New accounts/);
    assert.match(dashboard, /No tracked logs that day/);
    assert.match(app, /initializeDailyUserQuery/);
    assert.doesNotMatch(admin, /Restaurant|restaurantCatalogue|data-restaurant-review/);
});

test("owner analytics counts users with at least one synced weigh-in", async () => {
    const [wrapper, admin] = await Promise.all([
        read("cloud/src/safe-backup-worker-v2.js"),
        read("admin/admin-analytics.js")
    ]);
    assert.match(wrapper, /weight_log_users/);
    assert.match(wrapper, /forge_weight_entries/);
    assert.match(wrapper, /json_array_length\(json_extract\(payload, '\$\.data\.forge_weight_entries'\)\)/);
    assert.match(admin, /Weight loggers/);
    assert.match(admin, /weight_log_users/);
    assert.match(admin, /People with weigh-ins/);
});

test("completed workouts report and summarize how they were created", async () => {
    const [source, session, tracking, worker, admin, styles] = await Promise.all([
        read("js/workouts/workout-source.js"),
        read("js/workouts/workout-session.js"),
        read("js/analytics/acquisition.js"),
        read("cloud/src/index.js"),
        read("admin/admin-analytics.js"),
        read("admin/admin-analytics-usage.css")
    ]);
    for (const value of ["coach_builder", "manual_builder", "template_library", "imported_routine", "one_off"]) {
        assert.match(source, new RegExp(value));
        assert.match(worker, new RegExp(value));
    }
    assert.match(session, /classifyWorkoutSource\(plan\)/);
    assert.match(session, /workoutSource: completed\.workoutSource/);
    assert.match(tracking, /workoutSource:detail\.workoutSource/);
    assert.match(tracking, /forge_workout_sessions/);
    assert.match(tracking, /reconcileRecentWorkoutEvents/);
    assert.match(tracking, /level_up_workout_usage_reconciled_v1/);
    assert.match(tracking, /reconciled:true/);
    assert.match(tracking, /countWorkingSets\(session\)/);
    assert.match(worker, /workoutSources: workoutSources\?\.results/);
    assert.match(worker, /legacy_unknown/);
    assert.match(admin, /How workouts were created/);
    assert.match(admin, /Older workouts were recorded before workout type tracking was added/);
    assert.match(styles, /admin-workout-source/);
});

test("workout source classifier distinguishes every creation path", async () => {
    const { classifyWorkoutSource } = await import("../js/workouts/workout-source.js");
    assert.equal(classifyWorkoutSource({ id: "smart-1", smartBuild: {} }), "coach_builder");
    assert.equal(classifyWorkoutSource({ id: "plan-1", name: "Mine", days: [] }), "manual_builder");
    assert.equal(classifyWorkoutSource({ id: "full-body", daysPerWeek: 3 }), "template_library");
    assert.equal(classifyWorkoutSource({ id: "import-1", importedRoutine: {} }), "imported_routine");
    assert.equal(classifyWorkoutSource({ id: "one-off-1", isOneOff: true }), "one_off");
});


test("signup platform attribution separates iOS and PWA acquisition", async () => {
    const [migration, worker, login, iosBridge, accountCloud, admin, daily, styles] = await Promise.all([
        read("cloud/migrations/0024_signup_platform.sql"),
        read("cloud/src/index.js"),
        read("js/account/first-launch-login.js"),
        read("js/account/ios-auth-bridge.js"),
        read("js/more/account-cloud-ui.js"),
        read("admin/admin-analytics.js"),
        read("admin/daily-user-query.js"),
        read("admin/platform-analytics.css")
    ]);
    for (const column of ["signup_platform", "signup_app_version", "signup_app_build", "first_ios_at", "first_pwa_at"]) {
        assert.match(migration, new RegExp(column));
        assert.match(worker, new RegExp(column));
    }
    assert.match(login, /analyticsRuntimeContext/);
    assert.match(login, /platform: "ios"/);
    assert.match(iosBridge, /platform: "ios"/);
    assert.match(accountCloud, /analyticsRuntimeContext/);
    assert.match(worker, /pwaToIosConversions/);
    assert.match(worker, /bothPlatforms/);
    assert.match(worker, /new_users_ios_today/);
    assert.match(worker, /new_users_pwa_today/);
    assert.match(admin, /New iOS today/);
    assert.match(admin, /New PWA today/);
    assert.match(admin, /PWA → iOS conversions/);
    assert.match(admin, /Used both platforms/);
    assert.match(daily, /newUsersByPlatform/);
    assert.match(daily, /admin-daily-platform/);
    assert.match(styles, /admin-platform-badge/);
});


test("current native builds can be attributed from the Capacitor origin", async () => {
    const worker = await read("cloud/src/index.js");
    assert.match(worker, /function authClientMetadata/);
    assert.match(worker, /capacitor:\/\/localhost/);
    assert.match(worker, /ionic:\/\/localhost/);
    assert.match(worker, /authClientMetadata\(body, request\)/);
    assert.match(worker, /authClientMetadata\(clientMetadata, request\)/);
});
