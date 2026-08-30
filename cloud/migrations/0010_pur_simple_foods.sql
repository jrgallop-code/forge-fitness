-- Pür & Simple Canada's official 2026 Nutrition Guide.
-- Source: https://pursimple.com/wp-content/uploads/2026/02/PS-Nutrition-Guide-English-2026-1.pdf (verified 2026-08-30)
INSERT OR REPLACE INTO verified_foods (
  id, name, brand, category, country_code, search_text, barcode,
  serving_label, serving_grams, calories, protein_g, carbs_g, fat_g, fiber_g,
  source_name, source_url, verified_at, status, created_at, updated_at
) VALUES
  ('pur-simple-ca-avocado-bacon', 'Avocado Bacon', 'Pür & Simple', 'Restaurant food', 'CA', 'avocado bacon pür simple pur simple pursimple restaurant canada breakfast brunch avocado toast', NULL, '1 order', NULL, 1183, 47.52, 94.26, 65.29, 14.6, 'Pür & Simple Canada', 'https://pursimple.com/wp-content/uploads/2026/02/PS-Nutrition-Guide-English-2026-1.pdf', '2026-08-30', 'active', '2026-08-30T00:00:00Z', '2026-08-30T00:00:00Z'),
  ('pur-simple-ca-avocado-lox', 'Avocado Lox', 'Pür & Simple', 'Restaurant food', 'CA', 'avocado lox pür simple pur simple pursimple restaurant canada breakfast brunch avocado toast', NULL, '1 order', NULL, 1013, 43.7, 95.96, 45.87, 15.2, 'Pür & Simple Canada', 'https://pursimple.com/wp-content/uploads/2026/02/PS-Nutrition-Guide-English-2026-1.pdf', '2026-08-30', 'active', '2026-08-30T00:00:00Z', '2026-08-30T00:00:00Z'),
  ('pur-simple-ca-avocado-toast', 'Avocado Toast', 'Pür & Simple', 'Restaurant food', 'CA', 'avocado toast pür simple pur simple pursimple restaurant canada breakfast brunch', NULL, '1 order', NULL, 980, 42.64, 88.96, 43.87, 12.8, 'Pür & Simple Canada', 'https://pursimple.com/wp-content/uploads/2026/02/PS-Nutrition-Guide-English-2026-1.pdf', '2026-08-30', 'active', '2026-08-30T00:00:00Z', '2026-08-30T00:00:00Z'),
  ('pur-simple-ca-simply-vegan', 'Simply Vegan', 'Pür & Simple', 'Restaurant food', 'CA', 'simply vegan pür simple pur simple pursimple restaurant canada breakfast brunch avocado toast', NULL, '1 order', NULL, 811, 18.52, 136.57, 23.66, 17.5, 'Pür & Simple Canada', 'https://pursimple.com/wp-content/uploads/2026/02/PS-Nutrition-Guide-English-2026-1.pdf', '2026-08-30', 'active', '2026-08-30T00:00:00Z', '2026-08-30T00:00:00Z');
