ALTER TABLE users ADD COLUMN last_active_at TEXT;

CREATE INDEX users_last_active_at_idx ON users(last_active_at);
