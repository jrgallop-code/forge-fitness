CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    unsubscribed_at TEXT
);

CREATE INDEX IF NOT EXISTS email_unsubscribe_tokens_email_idx
    ON email_unsubscribe_tokens(email);

CREATE INDEX IF NOT EXISTS email_unsubscribe_tokens_unsubscribed_idx
    ON email_unsubscribe_tokens(unsubscribed_at);
