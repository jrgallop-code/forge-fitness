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
