PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS apple_credentials (
    user_id TEXT PRIMARY KEY,
    encrypted_refresh_token TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
