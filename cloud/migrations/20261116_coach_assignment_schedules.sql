-- Per-assignment recurring workout/rest calendar. Athlete history is never modified.
CREATE TABLE IF NOT EXISTS coach_assignment_schedules (
 assignment_id TEXT PRIMARY KEY REFERENCES coach_program_assignments(id) ON DELETE CASCADE,
 coach_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 start_date TEXT NOT NULL,
 weeks INTEGER NOT NULL CHECK(weeks BETWEEN 1 AND 52),
 week_pattern_json TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coach_assignment_schedules_client ON coach_assignment_schedules(client_user_id,updated_at);
