import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const provider = await readFile(new URL("../cloud/src/fatsecret-food-provider.js", import.meta.url), "utf8");

test("FatSecret provider uses OAuth 2 client credentials and server-side secrets", () => {
    assert.match(provider, /oauth\.fatsecret\.com\/connect\/token/);
    assert.match(provider, /FATSECRET_CLIENT_ID/);
    assert.match(provider, /FATSECRET_CLIENT_SECRET/);
    assert.match(provider, /grant_type:\s*"client_credentials"/);
    assert.match(provider, /Authorization:\s*`Basic/);
});

test("FatSecret auto mode omits scope so the token receives all account-entitled scopes", async () => {
    const module = await import("../cloud/src/fatsecret-food-provider.js");
    assert.equal(module.fatSecretConfiguredScope({}), "");
    assert.equal(module.fatSecretConfiguredScope({ FATSECRET_SCOPE: "auto" }), "");
    assert.equal(module.fatSecretScopeMode({ FATSECRET_SCOPE: "auto" }), "auto");
    assert.equal(module.fatSecretConfiguredScope({ FATSECRET_SCOPE: "basic" }), "basic");
    assert.match(provider, /if \(requestedScope\) body\.set\("scope", requestedScope\)/);
    assert.match(provider, /decodeFatSecretAccessTokenScopes/);
});

test("FatSecret access token scopes are decoded from the JWT", async () => {
    const module = await import("../cloud/src/fatsecret-food-provider.js");
    const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "none" })}.${encode({ scope: ["basic", "premier", "localization"] })}.x`;
    assert.deepEqual(module.decodeFatSecretAccessTokenScopes(token), ["basic", "premier", "localization"]);
});

test("FatSecret Basic search uses foods.search while Premier uses localized v5 when granted", () => {
    assert.match(provider, /server\.api/);
    assert.match(provider, /method:\s*"foods\.search"/);
    assert.match(provider, /method:\s*"POST"/);
    assert.match(provider, /application\/x-www-form-urlencoded/);
    assert.match(provider, /foods\/search\/v5/);
    assert.match(provider, /capabilities\.premier/);
    assert.match(provider, /capabilities\.canLocalize && normalizedCountry/);
});

test("FatSecret provider supports detailed foods and optional barcode scope", () => {
    assert.match(provider, /food\/v5/);
    assert.match(provider, /food\/barcode\/find-by-id\/v2/);
    assert.match(provider, /capabilities\.canBarcode/);
});

test("FatSecret normalization carries storable food and serving identifiers", async () => {
    const module = await import("../cloud/src/fatsecret-food-provider.js");
    const food = module.normalizeFatSecretFood({
        food_id: "101",
        food_name: "Protein Bar",
        brand_name: "Example",
        servings: {
            serving: [{
                serving_id: "202",
                serving_description: "1 bar (60 g)",
                metric_serving_amount: "60",
                metric_serving_unit: "g",
                calories: "210",
                protein: "20",
                carbohydrate: "22",
                fat: "6",
                fiber: "4"
            }]
        }
    }, { countryCode: "US" });
    assert.equal(food.fatSecretFoodId, "101");
    assert.equal(food.portions[0].servingId, "202");
    assert.equal(food.portions[0].grams, 60);
    assert.equal(food.portions[0].nutrition.calories, 210);
});

test("FatSecret barcode normalization produces GTIN-13", async () => {
    const module = await import("../cloud/src/fatsecret-food-provider.js");
    assert.equal(module.toFatSecretGtin13("123456789012"), "0123456789012");
    assert.equal(module.toFatSecretGtin13("0123456789012"), "0123456789012");
    assert.equal(module.toFatSecretGtin13("00012345678905"), "0012345678905");
});
