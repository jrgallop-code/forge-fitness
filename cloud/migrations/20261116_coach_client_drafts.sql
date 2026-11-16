-- Phase 1: durable coach-authored drafts tied to authenticated athlete IDs.
-- These are NOT athlete backups or published programs; athlete histories stay separate.
CREATE TABLE IF NOT EXISTS coach_client_drafts (
 id TEXT NOT NULL,
 coach_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 draft_json TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
 updated_at TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY (coach_user_id, client_user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_coach_client_drafts_owner ON coach_client_drafts(coach_user_id,client_user_id,updated_at);
