PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS backup_history (
    user_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    payload TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    client_exported_at TEXT,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, version),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS backup_history_user_version_idx
    ON backup_history(user_id, version DESC);
