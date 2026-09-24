ALTER TABLE users ADD COLUMN signup_platform TEXT CHECK (signup_platform IN ('ios', 'pwa', 'unknown'));
ALTER TABLE users ADD COLUMN signup_app_version TEXT;
ALTER TABLE users ADD COLUMN signup_app_build TEXT;
ALTER TABLE users ADD COLUMN first_ios_at TEXT;
ALTER TABLE users ADD COLUMN first_pwa_at TEXT;

CREATE INDEX IF NOT EXISTS users_signup_platform_idx ON users(signup_platform);
CREATE INDEX IF NOT EXISTS users_first_ios_at_idx ON users(first_ios_at);
CREATE INDEX IF NOT EXISTS users_first_pwa_at_idx ON users(first_pwa_at);
