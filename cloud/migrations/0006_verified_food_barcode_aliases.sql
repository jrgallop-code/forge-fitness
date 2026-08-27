CREATE TABLE IF NOT EXISTS verified_food_barcodes (
  food_id TEXT NOT NULL,
  barcode TEXT NOT NULL,
  country_code TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL,
  PRIMARY KEY (food_id, barcode),
  UNIQUE (barcode),
  FOREIGN KEY (food_id) REFERENCES verified_foods(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_verified_food_barcodes_barcode
  ON verified_food_barcodes (barcode);

ALTER TABLE verified_foods ADD COLUMN product_family_id TEXT;

CREATE INDEX IF NOT EXISTS idx_verified_foods_product_family
  ON verified_foods (product_family_id);

INSERT OR REPLACE INTO verified_foods (
  id, name, brand, category, country_code, search_text, barcode,
  serving_label, serving_grams, calories, protein_g, carbs_g, fat_g, fiber_g,
  source_name, source_url, verified_at, status, created_at, updated_at
) VALUES
(
  'grenade-salted-caramel-ca-60g',
  'Chocolate Chip Salted Caramel Protein Bar',
  'Grenade',
  'Protein bar',
  'CA',
  'grenade chocolate chip salted caramel protein bar carb killa',
  '847534004261',
  '1 bar (60 g)',
  60,
  240,
  21,
  22,
  9,
  2,
  'Canadian package label via Open Food Facts',
  'https://world.openfoodfacts.org/product/0847534004261',
  '2026-08-27',
  'active',
  '2026-08-27T00:00:00Z',
  '2026-08-27T00:00:00Z'
),
(
  'grenade-salted-caramel-us-60g',
  'Chocolate Chip Salted Caramel Protein Bar',
  'Grenade',
  'Protein bar',
  'US',
  'grenade chocolate chip salted caramel protein bar carb killa',
  '847534004063',
  '1 bar (60 g)',
  60,
  230,
  20,
  23,
  10,
  3,
  'USDA FoodData Central',
  'https://fdc.nal.usda.gov/food-details/2387796/nutrients',
  '2026-08-27',
  'active',
  '2026-08-27T00:00:00Z',
  '2026-08-27T00:00:00Z'
);

UPDATE verified_foods
SET product_family_id = 'grenade-salted-caramel-60g'
WHERE id IN ('grenade-salted-caramel-ca-60g', 'grenade-salted-caramel-us-60g');

INSERT OR IGNORE INTO verified_food_barcodes (
  food_id, barcode, country_code, is_primary, created_at
)
SELECT id, barcode, country_code, 1, '2026-08-27T00:00:00Z'
FROM verified_foods
WHERE barcode IS NOT NULL;

INSERT OR REPLACE INTO verified_food_barcodes (
  food_id, barcode, country_code, is_primary, created_at
) VALUES
  ('grenade-salted-caramel-ca-60g', '847534004261', 'CA', 1, '2026-08-27T00:00:00Z'),
  ('grenade-salted-caramel-us-60g', '847534004063', 'US', 1, '2026-08-27T00:00:00Z');
