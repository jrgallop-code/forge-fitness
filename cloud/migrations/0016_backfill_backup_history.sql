INSERT OR IGNORE INTO backup_history
    (user_id, version, payload, byte_size, client_exported_at, created_at)
SELECT
    user_id,
    version,
    payload,
    byte_size,
    client_exported_at,
    COALESCE(updated_at, created_at)
FROM backups;
