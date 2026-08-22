PRAGMA foreign_keys = ON;

CREATE TABLE password_credentials (
    user_id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    iterations INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE auth_rate_limits (
    rate_key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    window_started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX auth_rate_limits_updated_at_idx ON auth_rate_limits(updated_at);
