CREATE TABLE IF NOT EXISTS verified_foods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT,
  country_code TEXT NOT NULL DEFAULT 'CA',
  search_text TEXT NOT NULL,
  barcode TEXT,
  serving_label TEXT NOT NULL,
  serving_grams REAL,
  calories REAL NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  fiber_g REAL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verified_foods_status_name
  ON verified_foods (status, name);

CREATE INDEX IF NOT EXISTS idx_verified_foods_barcode
  ON verified_foods (barcode)
  WHERE barcode IS NOT NULL;

INSERT OR REPLACE INTO verified_foods (
  id, name, brand, category, country_code, search_text, barcode,
  serving_label, serving_grams, calories, protein_g, carbs_g, fat_g, fiber_g,
  source_name, source_url, verified_at, status, created_at, updated_at
) VALUES
  ('mcd-ca-hamburger', 'Hamburger', 'McDonald''s', 'Restaurant food', 'CA',
   'hamburger mcdonalds mcdonald burger', NULL, '1 burger (100 g)', 100, 240, 12, 32, 8, 2,
   'McDonald''s Canada', 'https://www.mcdonalds.com/ca/en-ca/product/hamburger.html', '2026-08-27', 'active', '2026-08-27T00:00:00Z', '2026-08-27T00:00:00Z'),
  ('mcd-ca-cheeseburger', 'Cheeseburger', 'McDonald''s', 'Restaurant food', 'CA',
   'cheeseburger mcdonalds mcdonald burger cheese', NULL, '1 burger (113 g)', 113, 290, 14, 32, 12, 2,
   'McDonald''s Canada', 'https://www.mcdonalds.com/ca/en-ca/product/cheeseburger.html', '2026-08-27', 'active', '2026-08-27T00:00:00Z', '2026-08-27T00:00:00Z'),
  ('mcd-ca-big-mac', 'Big Mac', 'McDonald''s', 'Restaurant food', 'CA',
   'big mac mcdonalds mcdonald burger', NULL, '1 burger (216 g)', 216, 570, 24, 46, 32, NULL,
   'McDonald''s Canada', 'https://www.mcdonalds.com/ca/en-ca/product/big-mac-sandwich.html', '2026-08-27', 'active', '2026-08-27T00:00:00Z', '2026-08-27T00:00:00Z'),
  ('mcd-ca-quarter-pounder-no-cheese', 'Quarter Pounder without Cheese', 'McDonald''s', 'Restaurant food', 'CA',
   'quarter pounder without cheese mcdonalds mcdonald burger', NULL, '1 burger', NULL, 430, 24, 40, 20, NULL,
   'McDonald''s Canada', 'https://www.mcdonalds.com/ca/en-ca/product/quarter-pounder-without-cheese.html', '2026-08-27', 'active', '2026-08-27T00:00:00Z', '2026-08-27T00:00:00Z'),
  ('mcd-ca-double-quarter-cheese', 'Double Quarter Pounder with Cheese', 'McDonald''s', 'Restaurant food', 'CA',
   'double quarter pounder with cheese mcdonalds mcdonald burger', NULL, '1 burger', NULL, 750, 47, 47, 44, NULL,
   'McDonald''s Canada', 'https://www.mcdonalds.com/ca/en-ca/product/double-quarter-pounder-with-cheese.html', '2026-08-27', 'active', '2026-08-27T00:00:00Z', '2026-08-27T00:00:00Z'),
  ('mcd-ca-hash-brown', 'Hash Brown', 'McDonald''s', 'Restaurant food', 'CA',
   'hash brown hashbrown mcdonalds mcdonald breakfast', NULL, '1 hash brown (55 g)', 55, 160, 1, 16, 10, NULL,
   'McDonald''s Canada', 'https://www.mcdonalds.com/ca/en-ca/product/hash-browns.html', '2026-08-27', 'active', '2026-08-27T00:00:00Z', '2026-08-27T00:00:00Z'),
  ('grenade-cookie-dough-60g', 'Chocolate Chip Cookie Dough Protein Bar', 'Grenade', 'Protein bar', 'CA',
   'grenade chocolate chip cookie dough protein bar carb killa', NULL, '1 bar (60 g)', 60, 208, 21, 18, 7.8, 2.7,
   'Grenade', 'https://www.grenade.com/products/protein-bar-cookie-dough', '2026-08-27', 'active', '2026-08-27T00:00:00Z', '2026-08-27T00:00:00Z'),
  ('grenade-peanut-nutter-60g', 'Peanut Nutter Protein Bar', 'Grenade', 'Protein bar', 'CA',
   'grenade peanut nutter protein bar carb killa peanut butter', NULL, '1 bar (60 g)', 60, 214, 20, 18, 9.1, 5.6,
   'Grenade', 'https://www.grenade.com/products/protein-bar-peanut-nutter', '2026-08-27', 'active', '2026-08-27T00:00:00Z', '2026-08-27T00:00:00Z');
