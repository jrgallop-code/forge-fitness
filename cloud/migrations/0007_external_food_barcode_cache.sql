CREATE TABLE IF NOT EXISTS external_food_barcode_cache (
  barcode TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('openfoodfacts')),
  food_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_external_food_barcode_cache_expiry
  ON external_food_barcode_cache (expires_at);
