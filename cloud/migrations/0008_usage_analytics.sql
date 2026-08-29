CREATE TABLE IF NOT EXISTS usage_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL CHECK (event_name IN ('app_active', 'food_logged')),
    event_key TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (user_id, event_name, event_key)
);

CREATE INDEX IF NOT EXISTS usage_events_name_time_idx ON usage_events(event_name, occurred_at);
CREATE INDEX IF NOT EXISTS usage_events_user_time_idx ON usage_events(user_id, occurred_at);
