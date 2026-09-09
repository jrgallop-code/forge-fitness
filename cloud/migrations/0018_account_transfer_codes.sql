CREATE TABLE account_transfer_codes (
    code_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX account_transfer_codes_user_idx
    ON account_transfer_codes(user_id, created_at DESC);

CREATE INDEX account_transfer_codes_expiry_idx
    ON account_transfer_codes(expires_at);
