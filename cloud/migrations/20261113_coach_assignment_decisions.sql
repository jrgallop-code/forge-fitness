-- Athlete decisions are version-specific; publishing a revision never changes the accepted plan.
-- This table is separate from athlete backups, workouts and nutrition histories.
CREATE TABLE IF NOT EXISTS coach_assignment_decisions (
 assignment_id TEXT NOT NULL REFERENCES coach_program_assignments(id) ON DELETE CASCADE,
 client_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 version INTEGER NOT NULL CHECK(version >= 1),
 decision TEXT NOT NULL CHECK(decision IN ('accepted','declined')),
 responded_at TEXT NOT NULL,
 PRIMARY KEY (assignment_id, client_user_id, version)
);
CREATE INDEX IF NOT EXISTS idx_coach_assignment_decisions_client ON coach_assignment_decisions(client_user_id,responded_at);
