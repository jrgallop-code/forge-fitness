CREATE TABLE IF NOT EXISTS satisfaction_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    trigger_name TEXT NOT NULL CHECK (trigger_name IN ('workout_milestone', 'food_log_milestone', 'active_day_milestone')),
    app_version TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS satisfaction_feedback_created_idx
    ON satisfaction_feedback(created_at);

CREATE INDEX IF NOT EXISTS satisfaction_feedback_user_created_idx
    ON satisfaction_feedback(user_id, created_at);
