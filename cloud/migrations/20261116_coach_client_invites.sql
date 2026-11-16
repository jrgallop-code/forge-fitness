-- Coach invitation and onboarding records: invite-only, consent-driven. 
CREATE TABLE IF NOT EXISTS coach_client_invites (
  id TEXT PRIMARY KEY,
  coach_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  coaching_type TEXT NOT NULL DEFAULT 'online',
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  accepted_user_id TEXT REFERENCES users(id),
  emailed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coach_client_invites_coach ON coach_client_invites(coach_user_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_coach_client_invites_recipient ON coach_client_invites(email,status);
