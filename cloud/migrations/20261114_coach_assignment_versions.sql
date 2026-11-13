-- Immutable plan revisions; the latest assignment remains a convenient pointer.
CREATE TABLE IF NOT EXISTS coach_assignment_versions (
 assignment_id TEXT NOT NULL REFERENCES coach_program_assignments(id) ON DELETE CASCADE,
 version INTEGER NOT NULL CHECK(version > 0),
 name TEXT NOT NULL,
 plan_json TEXT NOT NULL,
 goals_json TEXT NOT NULL DEFAULT '{}',
 nutrition_json TEXT,
 published_at TEXT NOT NULL,
 PRIMARY KEY(assignment_id,version)
);
INSERT OR IGNORE INTO coach_assignment_versions
(assignment_id,version,name,plan_json,goals_json,nutrition_json,published_at)
SELECT id,version,name,plan_json,goals_json,nutrition_json,published_at
FROM coach_program_assignments;
CREATE INDEX IF NOT EXISTS idx_coach_assignment_versions_assignment ON coach_assignment_versions(assignment_id,version DESC);

-- Athlete's explicitly selected nutrition source is stored server-side for cross-device use.
-- Disable via this table without deleting old accepted plan decisions.
CREATE TABLE IF NOT EXISTS coach_client_nutrition_selection (
 client_user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 assignment_id TEXT REFERENCES coach_program_assignments(id) ON DELETE SET NULL,
 version INTEGER,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 updated_at TEXT NOT NULL,
 CHECK ((enabled=0) OR (assignment_id IS NOT NULL AND version IS NOT NULL))
);
