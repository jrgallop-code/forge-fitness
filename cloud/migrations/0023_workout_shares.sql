CREATE TABLE workout_shares (
    code TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    creator_user_id TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    open_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX workout_shares_expires_at_idx ON workout_shares(expires_at);
CREATE INDEX workout_shares_creator_idx ON workout_shares(creator_user_id, created_at);
