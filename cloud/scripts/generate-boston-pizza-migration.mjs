import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BOSTON_PIZZA_FOODS } from "../src/data/boston-pizza-foods.js";

const outputUrl = new URL("../migrations/0021_boston_pizza_foods.sql", import.meta.url);
const quote = value => `'${String(value ?? "").replaceAll("'", "''")}'`;
const number = value => Number.isFinite(Number(value)) ? String(Number(value)) : "NULL";

const rows = BOSTON_PIZZA_FOODS.map(food => `  (${[
    quote(food.id),
    quote(food.name),
    quote(food.brand),
    quote("Restaurant food"),
    quote(food.countryCode),
    quote(`${food.name} ${food.brand} ${food.aliases}`.toLowerCase()),
    "NULL",
    quote(food.label),
    "NULL",
    number(food.calories),
    number(food.protein),
    number(food.carbs),
    number(food.fat),
    number(food.fiber),
    quote(food.sourceName),
    quote(food.sourceUrl),
    quote("2026-09-12"),
    quote("active"),
    quote("2026-09-12T00:00:00Z"),
    quote("2026-09-12T00:00:00Z"),
    quote("boston-pizza"),
    quote("CA"),
    quote("official_restaurant"),
    quote("verified"),
    quote("full"),
    quote("item"),
    number(70),
    quote("2026-09-12"),
    quote("2026-12-11"),
    quote(food.menuSection)
].join(", ")})`).join(",\n");

const sql = `INSERT OR IGNORE INTO verified_foods (
  id, name, brand, category, country_code, search_text, barcode, serving_label, serving_grams,
  calories, protein_g, carbs_g, fat_g, fiber_g, source_name, source_url, verified_at, status,
  created_at, updated_at, restaurant_slug, region_code, source_type, verification_status,
  nutrition_scope, serving_type, popularity_score, last_checked_at, next_review_at, menu_section
) VALUES
${rows};
`;

await writeFile(outputUrl, sql, "utf8");
console.log(`Wrote ${BOSTON_PIZZA_FOODS.length} Boston Pizza foods to ${fileURLToPath(outputUrl)}`);
