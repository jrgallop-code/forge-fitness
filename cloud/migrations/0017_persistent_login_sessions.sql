-- Preserve sessions that are valid at migration time by moving their expiry
-- to the application's non-expiring sentinel. Already-expired sessions remain
-- expired and cannot be revived by this migration.
UPDATE sessions
SET expires_at = '9999-12-31T23:59:59.999Z'
WHERE datetime(expires_at) > datetime('now');
