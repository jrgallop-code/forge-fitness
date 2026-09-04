import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const path = "cloud/src/fatsecret-food-provider.js";
const source = readFileSync(path, "utf8");

test("FatSecret provider parses", () => {
    const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("FatSecret credentials stay server-side", () => {
    assert.match(source, /env\.FATSECRET_CLIENT_ID/);
    assert.match(source, /env\.FATSECRET_CLIENT_SECRET/);
    assert.match(source, /oauth\.fatsecret\.com\/connect\/token/);
    assert.match(source, /grant_type:\s*"client_credentials"/);
    assert.doesNotMatch(source, /const\s+FATSECRET_CLIENT_SECRET\s*=\s*["'][^"']+/);
});

test("Basic search and optional Premier/barcode capabilities are supported", () => {
    assert.match(source, /foods\/search\/\$\{version\}/);
    assert.match(source, /const version = premier \? "v5" : "v1"/);
    assert.match(source, /food\/barcode\/find-by-id\/v2/);
    assert.match(source, /fatSecretCanBarcode/);
    assert.match(source, /fatSecretCanLocalize/);
});

test("FatSecret search summaries normalize into Level Up portions", async () => {
    const module = await import(new URL("../cloud/src/fatsecret-food-provider.js", import.meta.url));
    const portion = module.parseFatSecretDescription("Per 1 serving - Calories: 300kcal | Fat: 13.00g | Carbs: 32.00g | Protein: 15.00g");
    assert.equal(portion.label, "1 serving");
    assert.deepEqual(portion.nutrition, { calories: 300, protein: 15, carbs: 32, fat: 13, fiber: 0 });
});

test("FatSecret food normalization preserves provider IDs and serving IDs", async () => {
    const module = await import(new URL("../cloud/src/fatsecret-food-provider.js", import.meta.url));
    const food = module.normalizeFatSecretFood({
        food_id: "41963",
        food_name: "Cheeseburger",
        brand_name: "McDonald's",
        food_type: "Brand",
        food_url: "https://foods.fatsecret.com/example",
        servings: {
            serving: {
                serving_id: "101",
                serving_description: "1 serving",
                metric_serving_amount: "100",
                metric_serving_unit: "g",
                calories: "300",
                protein: "15",
                carbohydrate: "32",
                fat: "13",
                fiber: "2"
            }
        }
    }, { countryCode: "CA" });
    assert.equal(food.source, "fatsecret");
    assert.equal(food.fatSecretFoodId, "41963");
    assert.equal(food.catalogueId, "fatsecret:41963");
    assert.equal(food.portions[0].servingId, "101");
    assert.equal(food.portions[0].grams, 100);
    assert.equal(food.countryCode, "CA");
});

test("barcodes are converted to FatSecret GTIN-13 format", async () => {
    const module = await import(new URL("../cloud/src/fatsecret-food-provider.js", import.meta.url));
    assert.equal(module.toFatSecretGtin13("847534004261"), "0847534004261");
    assert.equal(module.toFatSecretGtin13("12345678"), "0000012345678");
    assert.equal(module.toFatSecretGtin13("not-a-barcode"), "");
});
