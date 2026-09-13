import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("Food Log exposes a clear Eating Out entry point", async () => {
    const foodLog = await read("js/nutrition/food-log.js");
    assert.match(foodLog, /restaurant-menu\.js\?v=eating-out-7/);
    assert.match(foodLog, /data-food-eating-out/);
    assert.match(foodLog, />Eating Out</);
    assert.match(foodLog, /Browse restaurant menus by calories and protein/);
    assert.match(foodLog, /onChooseFood:\s*food\s*=>\s*\{\s*void chooseFood\(food\)/);
    assert.doesNotMatch(foodLog, /class="food-voice-open"/);
});

test("Restaurant Menus searches real food data and supports restaurant discovery", async () => {
    const menu = await read("js/nutrition/restaurant-menu.js");
    assert.match(menu, /Restaurant Menus/);
    assert.match(menu, /Search restaurants/);
    assert.match(menu, /Boston Pizza/);
    assert.match(menu, /Swiss Chalet/);
    assert.match(menu, /Mezza Lebanese Kitchen/);
    assert.match(menu, /Subway/);
    assert.match(menu, /\/v1\/foods\/search\?q=/);
    assert.match(menu, /&menu=1/);
    assert.match(menu, /food\?\.menuSection/);
    assert.match(menu, /data-restaurant-menu-search/);
    assert.match(menu, /data-restaurant-quick="fits"/);
    assert.match(menu, /data-restaurant-quick="under700"/);
    assert.match(menu, /data-restaurant-quick="protein40"/);
    assert.match(menu, /data-restaurant-max-calories/);
    assert.match(menu, /data-restaurant-min-protein/);
    assert.match(menu, /Confirmed restaurant results only/);
    assert.doesNotMatch(menu, /Prototype dataset|mock menu data/i);
});

test("restaurant menu results require an exact restaurant brand identity", async () => {
    const [menuModule, workerModule, menuSource] = await Promise.all([
        import("../js/nutrition/restaurant-menu.js"),
        import("../cloud/src/index.js"),
        read("js/nutrition/restaurant-menu.js")
    ]);
    const confirmed = { name: "Southwest Chicken Bowl", brand: "The Chopped Leaf Restaurants" };
    const falsePositive = { name: "Chopped Leaf Salad", brand: "Unrelated Grocery Brand" };
    const missingBrand = { name: "The Chopped Leaf Caesar Wrap", brand: "" };

    assert.equal(menuModule.restaurantFoodMatches(confirmed, "Chopped Leaf"), true);
    assert.equal(menuModule.restaurantFoodMatches(falsePositive, "Chopped Leaf"), false);
    assert.equal(menuModule.restaurantFoodMatches(missingBrand, "Chopped Leaf"), false);
    assert.equal(workerModule.restaurantBrandMatchesQuery(confirmed, "Chopped Leaf"), true);
    assert.equal(workerModule.restaurantBrandMatchesQuery(falsePositive, "Chopped Leaf"), false);
    assert.equal(workerModule.restaurantBrandMatchesQuery(missingBrand, "Chopped Leaf"), false);
    assert.doesNotMatch(menuSource, /matching\.length \? matching : \(nextRestaurant\.known \? \[\] : usable\)/);
    assert.match(menuSource, /Confirmed restaurant results only/);
    assert.match(menuSource, /Uncertain matches are hidden/);
});

test("restaurant catalogue mode returns complete verified menus before external providers", async () => {
    const [baseWorker, fatSecretWorker] = await Promise.all([
        read("cloud/src/index.js"),
        read("cloud/src/fatsecret-enabled-worker.js")
    ]);
    assert.match(baseWorker, /restaurantMenu.*searchVerifiedFoods\(query, env, countryCode, 250\)/s);
    assert.match(baseWorker, /filter\(food => restaurantBrandMatchesQuery\(food, query\)\)/);
    assert.match(baseWorker, /restaurantCatalogue:\s*isCompleteVerifiedRestaurantCatalogue\(query, verifiedFoods\)/);
    assert.match(baseWorker, /\["mezza lebanese kitchen", MEZZA_FOODS\.length\]/);
    assert.match(baseWorker, /\["boston pizza", BOSTON_PIZZA_FOODS\.length\]/);
    assert.match(fatSecretWorker, /cataloguePayload\?\.restaurantCatalogue/);
    assert.match(fatSecretWorker, /RESTAURANT_MENU_RESULT_LIMIT = 250/);
    assert.match(fatSecretWorker, /providerFoods\.filter\(food => restaurantBrandMatchesQuery\(food, query\)\)/);
    assert.match(fatSecretWorker, /baseCandidates\.filter\(food => restaurantBrandMatchesQuery\(food, query\)\)/);
    assert.doesNotMatch(fatSecretWorker, /restaurantMenu \? RESTAURANT_MENU_PAGE_SIZE \* RESTAURANT_MENU_PAGES/);
});

test("Eating Out inherits the active appearance instead of hard-coding one theme", async () => {
    const styles = await read("css/restaurant-menu.css");
    for (const variable of ["--bg", "--surface", "--surface-raised", "--card", "--text", "--heading", "--muted", "--line", "--accent", "--accent-text", "--accent-soft", "--accent-contrast"]) {
        assert.match(styles, new RegExp(`var\\(${variable.replace("--", "--")}\\)`));
    }
    assert.match(styles, /body\.restaurant-menu-open/);
    assert.match(styles, /env\(safe-area-inset-top\)/);
    assert.match(styles, /env\(safe-area-inset-bottom\)/);
    assert.doesNotMatch(styles, /html\[data-theme=/);
});

test("PWA routing and caching include the restaurant menu source", async () => {
    const router = await read("js/core/router.js");
    const worker = await read("service-worker.js");
    assert.match(router, /food-log\.js\?v=eating-out-7/);
    assert.match(worker, /2026-09-13-305/);
    assert.match(worker, /restaurant-menu\.js\?v=eating-out-7/);
    assert.match(worker, /restaurant-menu\.css\?v=eating-out-7/);
});

test("restaurant logos require documented rights and a bundled local asset", async () => {
    const { approvedRestaurantLogoAsset } = await import("../js/nutrition/restaurant-menu.js");
    const approved = {
        logo: {
            status: "approved",
            usageBasis: "written_permission",
            rightsHolder: "Example Restaurant Ltd.",
            permissionReference: "legal/example-restaurant-permission.pdf",
            approvedAt: "2026-09-13",
            assetPath: "assets/restaurant-logos/example-restaurant.svg"
        }
    };
    assert.equal(approvedRestaurantLogoAsset(approved), "assets/restaurant-logos/example-restaurant.svg");
    assert.equal(approvedRestaurantLogoAsset({ logo: { ...approved.logo, status: "pending" } }), "");
    assert.equal(approvedRestaurantLogoAsset({ logo: { ...approved.logo, permissionReference: "" } }), "");
    assert.equal(approvedRestaurantLogoAsset({ logo: { ...approved.logo, assetPath: "https://example.com/logo.svg" } }), "");
    assert.equal(approvedRestaurantLogoAsset({ logo: { ...approved.logo, assetPath: "assets/restaurant-logos/../unapproved.svg" } }), "");

    const menu = await read("js/nutrition/restaurant-menu.js");
    const styles = await read("css/restaurant-menu.css");
    assert.match(menu, /Restaurant logos appear only when Level Up has documented permission or a compatible licence/);
    assert.match(menu, /bindRestaurantLogoFallbacks/);
    assert.match(styles, /\.restaurant-brand-logo/);
});

test("Boston Pizza cards show both per-slice and whole-pizza calories", async () => {
    const menu = await read("js/nutrition/restaurant-menu.js");
    assert.match(menu, /\^1 whole \/i/);
    assert.match(menu, /cal whole/);
    assert.match(menu, /"Apps and Shareables".*"Pizza"/);
});

test("Food Log search controls stay on one balanced row without a microphone", async () => {
    const [foodLog, styles] = await Promise.all([
        read("js/nutrition/food-log.js"),
        read("css/restaurant-menu.css")
    ]);
    assert.doesNotMatch(foodLog, /class="food-voice-open"/);
    assert.match(foodLog, /food-search-submit/);
    assert.match(foodLog, /food-search-field"><svg/);
    assert.match(styles, /\.food-search\{grid-template-columns:minmax\(0,1fr\) 96px!important/);
    assert.match(styles, /\.food-search-entry\{[^}]*grid-template-columns:minmax\(0,1fr\) 48px!important/);
    assert.match(styles, /\.food-search \.food-barcode-open\{[^}]*width:48px!important;height:48px/);
    assert.match(styles, /\.food-search>\.food-search-submit\{[^}]*width:96px[^}]*height:48px/);
});
