ALTER TABLE verified_foods ADD COLUMN restaurant_slug TEXT;
ALTER TABLE verified_foods ADD COLUMN region_code TEXT;
ALTER TABLE verified_foods ADD COLUMN source_type TEXT NOT NULL DEFAULT 'official_restaurant';
ALTER TABLE verified_foods ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'verified';
ALTER TABLE verified_foods ADD COLUMN nutrition_scope TEXT NOT NULL DEFAULT 'full';
ALTER TABLE verified_foods ADD COLUMN serving_type TEXT NOT NULL DEFAULT 'item';
ALTER TABLE verified_foods ADD COLUMN popularity_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE verified_foods ADD COLUMN last_checked_at TEXT;
ALTER TABLE verified_foods ADD COLUMN next_review_at TEXT;
ALTER TABLE verified_foods ADD COLUMN retired_at TEXT;

UPDATE verified_foods SET
  restaurant_slug = lower(replace(replace(replace(brand, ' ', '-'), '''', ''), '&', 'and')),
  region_code = country_code,
  source_type = CASE WHEN lower(category) = 'restaurant food' THEN 'official_restaurant' ELSE 'official_label' END,
  verification_status = 'verified',
  nutrition_scope = CASE WHEN protein_g = 0 AND carbs_g = 0 AND fat_g = 0 THEN 'calories_only' ELSE 'full' END,
  last_checked_at = COALESCE(verified_at, updated_at),
  next_review_at = datetime(COALESCE(verified_at, updated_at), '+90 days')
WHERE restaurant_slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_verified_foods_restaurant_region
  ON verified_foods (restaurant_slug, country_code, verification_status, status);
CREATE INDEX IF NOT EXISTS idx_verified_foods_review_due
  ON verified_foods (next_review_at, verification_status)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS restaurant_food_staging (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  restaurant_slug TEXT NOT NULL,
  country_code TEXT NOT NULL,
  region_code TEXT,
  menu_category TEXT,
  search_text TEXT NOT NULL,
  serving_label TEXT NOT NULL,
  serving_grams REAL,
  calories REAL NOT NULL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  fiber_g REAL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  nutrition_scope TEXT NOT NULL,
  serving_type TEXT NOT NULL DEFAULT 'item',
  popularity_score INTEGER NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  validation_errors TEXT NOT NULL DEFAULT '[]',
  submitted_by TEXT,
  submitted_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_restaurant_food_staging_status
  ON restaurant_food_staging (validation_status, submitted_at);

CREATE TABLE IF NOT EXISTS food_search_misses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  query_normalized TEXT NOT NULL,
  country_code TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  verified_result_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_food_search_misses_query_date
  ON food_search_misses (query_normalized, country_code, created_at);

CREATE TABLE IF NOT EXISTS restaurant_food_modifiers (
  id TEXT PRIMARY KEY,
  food_id TEXT NOT NULL,
  name TEXT NOT NULL,
  calories_delta REAL NOT NULL DEFAULT 0,
  protein_delta REAL NOT NULL DEFAULT 0,
  carbs_delta REAL NOT NULL DEFAULT 0,
  fat_delta REAL NOT NULL DEFAULT 0,
  source_url TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY (food_id) REFERENCES verified_foods(id) ON DELETE CASCADE
);

CREATE VIEW IF NOT EXISTS restaurant_catalogue_audit AS
SELECT
  brand,
  country_code,
  COUNT(*) AS item_count,
  SUM(CASE WHEN nutrition_scope = 'full' THEN 1 ELSE 0 END) AS full_nutrition_count,
  SUM(CASE WHEN nutrition_scope = 'calories_only' THEN 1 ELSE 0 END) AS calories_only_count,
  SUM(CASE WHEN next_review_at IS NOT NULL AND next_review_at <= datetime('now') THEN 1 ELSE 0 END) AS review_due_count
FROM verified_foods
WHERE status = 'active' AND lower(category) = 'restaurant food'
GROUP BY brand, country_code;
