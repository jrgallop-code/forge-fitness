CREATE TABLE IF NOT EXISTS email_campaign_sends (
    campaign_key TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
    recipient_count INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT,
    updated_at TEXT NOT NULL,
    error_message TEXT
);
