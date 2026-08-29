# Level Up Cloud Operations

## User activity

`last_active_at` is updated when a signed-in app opens, returns to the foreground, and every 15 minutes while it remains open.

Recent users:

```sql
SELECT email, created_at, last_active_at
FROM users
ORDER BY last_active_at DESC;
```

Daily and weekly active-user counts:

```sql
SELECT
    SUM(CASE WHEN last_active_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS active_24h,
    SUM(CASE WHEN last_active_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS active_7d,
    COUNT(*) AS registered_users
FROM users;
```

## Automatic backups

Signed-in clients check for changed app data after user interactions and at least every two minutes while open. Uploads retain the existing optimistic version check. If the cloud version is newer than the version known by the device, the automatic upload pauses rather than overwriting the newer backup.

The manual **Back Up Now** and **Download to This Device** controls remain available under **More → Account & Cloud**.

## Acquisition and onboarding funnel

Acquisition stores first-touch campaign/referrer data separately from the optional self-reported onboarding answer. Referrers contain only the hostname; landing URLs contain only the path.

Source mix:

```sql
SELECT
    COALESCE(reported_source, utm_source, referrer, 'unknown') AS source,
    COUNT(*) AS users
FROM user_acquisition
GROUP BY source
ORDER BY users DESC;
```

Core funnel by source:

```sql
WITH acquired AS (
    SELECT user_id, COALESCE(reported_source, utm_source, referrer, 'unknown') AS source
    FROM user_acquisition
)
SELECT
    source,
    COUNT(*) AS acquired_users,
    SUM(EXISTS(SELECT 1 FROM product_events e WHERE e.user_id = acquired.user_id AND e.event_name = 'onboarding_completed')) AS onboarded_users,
    SUM(EXISTS(SELECT 1 FROM product_events e WHERE e.user_id = acquired.user_id AND e.event_name = 'workout_completed')) AS workout_users,
    ROUND(100.0 * SUM(EXISTS(SELECT 1 FROM product_events e WHERE e.user_id = acquired.user_id AND e.event_name = 'workout_completed')) / NULLIF(COUNT(*), 0), 1) AS workout_conversion_pct
FROM acquired
GROUP BY source
ORDER BY acquired_users DESC;
```
# Owner analytics

The website includes an owner-only Stats & Analytics screen under More. The Worker protects its aggregate endpoint with the `ADMIN_EMAILS` environment variable (a comma-separated list of normalized account email addresses). Configure it as a production secret before deploying the Worker:

`wrangler secret put ADMIN_EMAILS`

The endpoint returns aggregate counts only: total and new users, users active today and over seven days, returning users active on multiple days, food loggers and entries, workout users and completions, onboarding, and acquisition sources. It does not expose backup payloads, food names, meal contents, or individual workout records. Daily activity and food-use metrics begin accumulating after migration `0008_usage_analytics.sql` is deployed.

## USDA FoodData Central

The Calories food log searches FoodData Central through the Worker so the API key is never included in website code. Create a free FoodData Central API key, then configure it as a production secret before deploying:

`wrangler secret put USDA_FDC_API_KEY`

The app sends only a food search phrase to USDA. User identity, diary entries, meal names and daily totals remain in Level Up and are not sent to USDA.
