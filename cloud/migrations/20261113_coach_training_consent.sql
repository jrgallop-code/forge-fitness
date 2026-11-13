-- Coach analytics is strictly opt-in and scoped to training data.
-- Use an existing authenticated Level Up account for both coach and athlete.
CREATE TABLE IF NOT EXISTS coach_training_invitations (
  id TEXT PRIMARY KEY,
  coach_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coach_training_invites_coach ON coach_training_invitations(coach_user_id, created_at);

CREATE TABLE IF NOT EXISTS coach_training_links (
  coach_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_permission INTEGER NOT NULL DEFAULT 1 CHECK (training_permission IN (0,1)),
  nutrition_permission INTEGER NOT NULL DEFAULT 0 CHECK (nutrition_permission IN (0,1)),
  accepted_at TEXT NOT NULL,
  revoked_at TEXT,
  PRIMARY KEY(coach_user_id, client_user_id),
  CHECK (length(coach_user_id) > 0 AND length(client_user_id) > 0)
);
CREATE INDEX IF NOT EXISTS idx_coach_training_links_client ON coach_training_links(client_user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_coach_training_links_coach ON coach_training_links(coach_user_id, revoked_at);

-- Self-testing is allowed only through an explicitly accepted self-link. Coach and client can revoke access at any time.
