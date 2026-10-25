CREATE TABLE IF NOT EXISTS instagram_connection (
 id INTEGER PRIMARY KEY CHECK(id=1), account_id TEXT NOT NULL, username TEXT NOT NULL,
 token_cipher TEXT NOT NULL, expires_at INTEGER NOT NULL, refreshed_at INTEGER NOT NULL,
 subscribed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS instagram_oauth_states (state TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS instagram_rules (
 id TEXT PRIMARY KEY, media_id TEXT NOT NULL, title TEXT NOT NULL, keywords TEXT NOT NULL,
 message TEXT NOT NULL, routine_url TEXT NOT NULL, public_reply TEXT NOT NULL DEFAULT '',
 enabled INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS instagram_deliveries (
 comment_id TEXT PRIMARY KEY, rule_id TEXT NOT NULL, account_id TEXT NOT NULL,
 media_id TEXT NOT NULL, username TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS instagram_delivery_created ON instagram_deliveries(created_at);
