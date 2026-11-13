-- Coach programs are versioned separately from the user's full-device backup.
-- The athlete can add an assigned program to their workout library without
-- overwriting completed workouts or other app data.
CREATE TABLE IF NOT EXISTS coach_program_assignments (
 id TEXT PRIMARY KEY,
 coach_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 source_plan_id TEXT NOT NULL,
 name TEXT NOT NULL,
 plan_json TEXT NOT NULL,
 goals_json TEXT NOT NULL DEFAULT '{}',
 nutrition_json TEXT,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','archived')),
 published_at TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE (coach_user_id, client_user_id, source_plan_id)
);
CREATE INDEX IF NOT EXISTS idx_coach_program_assignments_client ON coach_program_assignments(client_user_id,status,published_at);
CREATE INDEX IF NOT EXISTS idx_coach_program_assignments_coach ON coach_program_assignments(coach_user_id,client_user_id);
