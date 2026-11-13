"""Smoke-test the coach schema with SQLite (D1-compatible SQL subset)."""
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "cloud" / "migrations"

class CoachSchemaTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("CREATE TABLE users (id TEXT PRIMARY KEY);"
                              "INSERT INTO users (id) VALUES ('coach'),('athlete');")

    def apply(self, name):
        self.db.executescript((MIGRATIONS / name).read_text())

    def test_version_migration_retains_existing_assignments(self):
        for filename in sorted(("20261113_coach_assignment_decisions.sql", "20261113_coach_program_assignments.sql", "20261113_coach_training_consent.sql")):
            self.apply(filename)
        self.db.execute("""INSERT INTO coach_program_assignments
          (id,coach_user_id,client_user_id,source_plan_id,name,plan_json,goals_json,nutrition_json,version,status,published_at,created_at,updated_at)
          VALUES ('a','coach','athlete','source','Original','{"days":[]}','{}',NULL,3,'published','2026-11-13','2026-11-13','2026-11-13')""")
        self.apply("20261114_coach_assignment_versions.sql")
        current = self.db.execute("SELECT name,version FROM coach_program_assignments WHERE id='a'").fetchone()
        history = self.db.execute("SELECT name,version FROM coach_assignment_versions WHERE assignment_id='a'").fetchone()
        self.assertEqual(current, ("Original",3))
        self.assertEqual(history, ("Original",3))
        self.db.execute("""INSERT INTO coach_assignment_decisions
          (assignment_id,client_user_id,version,decision,responded_at)
          VALUES ('a','athlete',3,'accepted','2026-11-13')""")
        self.db.execute("""INSERT INTO coach_client_nutrition_selection
          (client_user_id,assignment_id,version,enabled,updated_at)
          VALUES ('athlete','a',3,1,'2026-11-13')""")
        self.assertEqual(self.db.execute("SELECT enabled FROM coach_client_nutrition_selection WHERE client_user_id='athlete'").fetchone()[0],1)

    def test_invalid_decisions_and_duplicate_versions_rejected(self):
        for filename in sorted(("20261113_coach_assignment_decisions.sql", "20261113_coach_program_assignments.sql", "20261113_coach_training_consent.sql", "20261114_coach_assignment_versions.sql")):
            self.apply(filename)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO coach_assignment_decisions
              (assignment_id,client_user_id,version,decision,responded_at)
              VALUES ('missing','athlete',1,'accepted','now')""")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO coach_client_nutrition_selection
              (client_user_id,assignment_id,version,enabled,updated_at)
              VALUES ('athlete',NULL,NULL,1,'now')""")


    def test_publish_accept_revision_and_restore_preserves_old_version(self):
        for filename in sorted(("20261113_coach_assignment_decisions.sql", "20261113_coach_program_assignments.sql", "20261113_coach_training_consent.sql", "20261114_coach_assignment_versions.sql")):
            self.apply(filename)
        self.db.execute("""INSERT INTO coach_program_assignments
          (id,coach_user_id,client_user_id,source_plan_id,name,plan_json,goals_json,nutrition_json,version,status,published_at,created_at,updated_at)
          VALUES ('a','coach','athlete','source','Plan','{"days":[{"name":"A","exercises":[{"id":"barbell-bench-press"}]}]}',
                  '{"goalWeightLb":175}','{"calorieTarget":2850,"protein":165,"carbs":375,"fat":77}',1,'published','2026-11-13','2026-11-13','2026-11-13')""")
        self.db.execute("""INSERT INTO coach_assignment_versions
          (assignment_id,version,name,plan_json,goals_json,nutrition_json,published_at)
          SELECT id,version,name,plan_json,goals_json,nutrition_json,published_at
          FROM coach_program_assignments WHERE id='a'""")
        self.db.execute("""INSERT INTO coach_assignment_decisions
          (assignment_id,client_user_id,version,decision,responded_at)
          VALUES ('a','athlete',1,'accepted','2026-11-13')""")
        self.db.execute("""INSERT INTO coach_client_nutrition_selection
          (client_user_id,assignment_id,version,enabled,updated_at)
          VALUES ('athlete','a',1,1,'2026-11-13')""")

        # Same two-query D1 batch shape used by the server to publish a revision.
        self.db.execute("""UPDATE coach_program_assignments
          SET nutrition_json=?,goals_json=?,version=version+1,published_at=?,updated_at=?
          WHERE id=? AND version=?""",
          ('{"calorieTarget":3000,"protein":180,"carbs":390,"fat":80}',
           '{"goalWeightLb":180}',"2026-11-14","2026-11-14","a",1))
        self.db.execute("""INSERT INTO coach_assignment_versions
          (assignment_id,version,name,plan_json,goals_json,nutrition_json,published_at)
          SELECT id,version,name,plan_json,goals_json,nutrition_json,published_at
          FROM coach_program_assignments WHERE id=? AND version=?""",("a",2))
        rows=self.db.execute("SELECT version,nutrition_json FROM coach_assignment_versions WHERE assignment_id='a' ORDER BY version").fetchall()
        self.assertEqual([v for v,_ in rows],[1,2])
        self.assertIn('"calorieTarget":2850',rows[0][1])
        self.assertIn('"calorieTarget":3000',rows[1][1])
        selected=self.db.execute("SELECT version,enabled FROM coach_client_nutrition_selection WHERE client_user_id='athlete'").fetchone()
        self.assertEqual(selected,(1,1),"Publishing a revision must never auto-activate it")

        self.db.execute("""INSERT INTO coach_assignment_decisions
          (assignment_id,client_user_id,version,decision,responded_at)
          VALUES ('a','athlete',2,'accepted','2026-11-14')""")
        self.db.execute("""UPDATE coach_client_nutrition_selection
          SET version=2,updated_at='2026-11-14' WHERE client_user_id='athlete'""")
        self.assertEqual(self.db.execute("SELECT version FROM coach_client_nutrition_selection").fetchone()[0],2)
        self.db.execute("""UPDATE coach_client_nutrition_selection
          SET assignment_id=NULL,version=NULL,enabled=0 WHERE client_user_id='athlete'""")
        self.assertEqual(self.db.execute("SELECT enabled FROM coach_client_nutrition_selection").fetchone()[0],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM coach_assignment_decisions").fetchone()[0],2)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM coach_assignment_versions").fetchone()[0],2)

if __name__ == "__main__":
    unittest.main()
