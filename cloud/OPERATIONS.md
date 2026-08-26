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

## Workout funnel

Workout funnel tracking begins when the funnel analytics release is deployed. The stages are:

`workout_viewed` → `plan_selected` → `workout_started` → `first_set_logged` → `workout_completed`

Unique users reaching each stage:

```sql
SELECT
    COUNT(DISTINCT CASE WHEN event_name = 'workout_viewed' THEN user_id END) AS viewed_workouts,
    COUNT(DISTINCT CASE WHEN event_name = 'plan_selected' THEN user_id END) AS selected_plan,
    COUNT(DISTINCT CASE WHEN event_name = 'workout_started' THEN user_id END) AS started_workout,
    COUNT(DISTINCT CASE WHEN event_name = 'first_set_logged' THEN user_id END) AS logged_first_set,
    COUNT(DISTINCT CASE WHEN event_name = 'workout_completed' THEN user_id END) AS completed_workout
FROM product_events;
```

The same funnel limited to the last 24 hours:

```sql
SELECT
    COUNT(DISTINCT CASE WHEN event_name = 'workout_viewed' THEN user_id END) AS viewed_workouts,
    COUNT(DISTINCT CASE WHEN event_name = 'plan_selected' THEN user_id END) AS selected_plan,
    COUNT(DISTINCT CASE WHEN event_name = 'workout_started' THEN user_id END) AS started_workout,
    COUNT(DISTINCT CASE WHEN event_name = 'first_set_logged' THEN user_id END) AS logged_first_set,
    COUNT(DISTINCT CASE WHEN event_name = 'workout_completed' THEN user_id END) AS completed_workout
FROM product_events
WHERE datetime(occurred_at) >= datetime('now', '-24 hours');
```

See which users reached each workout stage:

```sql
SELECT
    u.email,
    MAX(CASE WHEN e.event_name = 'workout_viewed' THEN e.occurred_at END) AS viewed_at,
    MAX(CASE WHEN e.event_name = 'plan_selected' THEN e.occurred_at END) AS plan_selected_at,
    MAX(CASE WHEN e.event_name = 'workout_started' THEN e.occurred_at END) AS started_at,
    MAX(CASE WHEN e.event_name = 'first_set_logged' THEN e.occurred_at END) AS first_set_at,
    MAX(CASE WHEN e.event_name = 'workout_completed' THEN e.occurred_at END) AS completed_at
FROM users u
LEFT JOIN product_events e ON e.user_id = u.id
GROUP BY u.id, u.email
ORDER BY COALESCE(completed_at, first_set_at, started_at, plan_selected_at, viewed_at) DESC;
```
