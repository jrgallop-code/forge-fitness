CREATE TABLE IF NOT EXISTS user_acquisition (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    reported_source TEXT,
    other_text TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    referrer TEXT,
    first_landing_path TEXT,
    first_seen_at TEXT NOT NULL,
    answered_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL CHECK (event_name IN ('account_created', 'onboarding_completed', 'workout_completed')),
    event_key TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (user_id, event_name, event_key)
);

CREATE INDEX IF NOT EXISTS product_events_name_time_idx ON product_events(event_name, occurred_at);
CREATE INDEX IF NOT EXISTS product_events_user_time_idx ON product_events(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS user_acquisition_source_idx ON user_acquisition(reported_source, utm_source);
