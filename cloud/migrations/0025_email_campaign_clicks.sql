CREATE TABLE IF NOT EXISTS email_campaign_clicks (
    id TEXT PRIMARY KEY,
    campaign_key TEXT NOT NULL,
    clicked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS email_campaign_clicks_campaign_time_idx
    ON email_campaign_clicks(campaign_key, clicked_at);
