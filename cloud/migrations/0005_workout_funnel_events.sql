CREATE TABLE product_events_v2 (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL CHECK (event_name IN (
        'account_created',
        'onboarding_completed',
        'workout_viewed',
        'plan_selected',
        'workout_started',
        'first_set_logged',
        'workout_completed'
    )),
    event_key TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (user_id, event_name, event_key)
);

INSERT INTO product_events_v2
    (id, user_id, event_name, event_key, occurred_at, metadata_json, created_at)
SELECT
    id, user_id, event_name, event_key, occurred_at, metadata_json, created_at
FROM product_events;

DROP TABLE product_events;
ALTER TABLE product_events_v2 RENAME TO product_events;

CREATE INDEX product_events_name_time_idx ON product_events(event_name, occurred_at);
CREATE INDEX product_events_user_time_idx ON product_events(user_id, occurred_at);
