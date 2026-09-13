const RAW_RESTAURANTS = [
    entry("boston-pizza", "Boston Pizza", "BP", "Pizza & casual dining", ["CA"], ["Boston Pizza"]),
    entry("mezza-lebanese-kitchen", "Mezza Lebanese Kitchen", "MZ", "Wraps, plates & bowls", ["CA"], ["Mezza Lebanese Kitchen", "Mezza"]),
    entry("swiss-chalet", "Swiss Chalet", "SC", "Chicken & family meals", ["CA"], ["Swiss Chalet"]),
    entry("subway", "Subway", "SW", "Sandwiches & bowls", ["CA", "US"], ["Subway"]),
    entry("mcdonalds", "McDonald's", "M", "Burgers & breakfast", ["CA", "US"], ["McDonald's", "McDonalds"]),
    entry("pur-and-simple", "Pür & Simple", "PS", "Breakfast & brunch", ["CA"], ["Pür & Simple", "Pur & Simple"]),
    entry("aw-canada", "A&W Canada", "AW", "Burgers & breakfast", ["CA"], ["A&W Canada", "A&W"]),
    entry("harveys", "Harvey's", "H", "Burgers & grilled chicken", ["CA"], ["Harvey's", "Harveys"]),
    entry("tim-hortons", "Tim Hortons", "TH", "Coffee, breakfast & baked goods", ["CA", "US"], ["Tim Hortons"]),
    entry("mary-browns", "Mary Brown's", "MB", "Chicken, sandwiches & sides", ["CA"], ["Mary Brown's", "Mary Browns"]),
    entry("pizza-pizza", "Pizza Pizza", "PP", "Pizza, chicken & sides", ["CA"], ["Pizza Pizza"]),
    entry("booster-juice", "Booster Juice", "BJ", "Smoothies, bowls & wraps", ["CA"], ["Booster Juice"]),
    entry("the-keg", "The Keg", "K", "Steak, seafood & casual dining", ["CA", "US"], ["The Keg", "The Keg Steakhouse + Bar", "The Keg Steakhouse and Bar"]),
    entry("montanas", "Montana's", "MT", "BBQ, burgers & ribs", ["CA"], ["Montana's", "Montanas", "Montana's BBQ & Bar"]),
    entry("kelseys", "Kelseys", "K", "Burgers, wings & casual dining", ["CA"], ["Kelseys", "Kelseys Original Roadhouse"]),
    entry("east-side-marios", "East Side Mario's", "ES", "Pasta, pizza & Italian favourites", ["CA"], ["East Side Mario's", "East Side Marios"]),
    entry("five-guys", "Five Guys", "FG", "Burgers, hot dogs & fries", ["CA", "US"], ["Five Guys", "Five Guys Burgers and Fries"]),
    entry("new-york-fries", "New York Fries", "NY", "Fries, poutines & hot dogs", ["CA"], ["New York Fries"]),
    entry("cora", "Cora", "C", "Breakfast, crêpes & brunch", ["CA"], ["Cora", "Cora Breakfast and Lunch"]),
    entry("little-caesars", "Little Caesars", "LC", "Whole pizzas, wings & sides", ["CA", "US"], ["Little Caesars", "Little Caesar's"]),
    entry("freshii", "Freshii", "F", "Bowls, wraps & smoothies", ["CA", "US"], ["Freshii"]),
    entry("wendys", "Wendy's", "W", "Burgers & chicken", ["CA", "US"], ["Wendy's", "Wendys"]),
    entry("dairy-queen", "Dairy Queen", "DQ", "Meals & treats", ["CA", "US"], ["Dairy Queen", "DQ"]),
    entry("starbucks", "Starbucks", "S", "Coffee & café food", ["CA", "US"], ["Starbucks"]),
    entry("pizza-hut", "Pizza Hut", "PH", "Pizza & sides", ["CA", "US"], ["Pizza Hut"]),
    entry("dominos", "Domino's", "D", "Pizza & sides", ["CA", "US"], ["Domino's", "Dominos"]),
    entry("burger-king", "Burger King", "BK", "Burgers & chicken", ["CA", "US"], ["Burger King"]),
    entry("popeyes", "Popeyes", "P", "Chicken & sides", ["CA", "US"], ["Popeyes", "Popeyes Louisiana Kitchen"]),
    entry("chipotle", "Chipotle", "C", "Bowls & salads", ["CA", "US"], ["Chipotle", "Chipotle Mexican Grill"]),
    entry("taco-bell", "Taco Bell", "TB", "Tacos & burritos", ["CA", "US"], ["Taco Bell"]),
    entry("chick-fil-a", "Chick-fil-A", "CFA", "Chicken & salads", ["CA", "US"], ["Chick-fil-A", "Chick Fil A"]),
    entry("dunkin", "Dunkin'", "DD", "Coffee & breakfast", ["US"], ["Dunkin'", "Dunkin", "Dunkin Donuts"]),
    entry("panera-bread", "Panera Bread", "PB", "Soups, salads & sandwiches", ["US"], ["Panera Bread", "Panera"]),
    entry("panda-express", "Panda Express", "PE", "Bowls & entrées", ["CA", "US"], ["Panda Express"]),
    entry("olive-garden", "Olive Garden", "OG", "Pasta & entrées", ["CA", "US"], ["Olive Garden"]),

    // Canada expansion. Official nutrition is the primary source whenever a compiled catalogue is available.
    entry("the-chopped-leaf", "The Chopped Leaf", "CL", "Bowls, salads & wraps", ["CA"], ["The Chopped Leaf", "Chopped Leaf"], official("https://choppedleaf.ca/nutritionals/", "official_menu", "2026-08-31")),
    entry("osmows", "Osmow's", "OS", "Shawarma, wraps & plates", ["CA", "US"], ["Osmow's", "Osmows", "Osmow's Shawarma"], official("https://osmows.com/nutrition-calculator", "official_menu")),
    entry("edo-japan", "Edo Japan", "EJ", "Teriyaki, sushi & bowls", ["CA"], ["Edo Japan"], official("https://www.edojapan.com/nutrition/", "official_menu", "2026-08-07")),
    entry("kfc-canada", "KFC Canada", "KFC", "Chicken, sandwiches & sides", ["CA"], ["KFC Canada", "KFC", "Kentucky Fried Chicken"], official("https://www.kfc.ca/nutrition-allergen", "official_menu", "2025-11-17")),
    entry("tacotime-canada", "TacoTime Canada", "TT", "Tacos, burritos & bowls", ["CA"], ["TacoTime Canada", "Taco Time Canada", "TacoTime", "Taco Time"], official("https://tacotimecanada.com/nutrition/", "official_menu", "2025-10-01")),
    entry("mucho-burrito", "MUCHO Burrito", "MB", "Burritos, bowls & tacos", ["CA"], ["MUCHO Burrito", "Mucho Burrito"], official("https://muchoburrito.com/nutrition/", "official_components")),
    entry("quesada", "Quesada Burritos & Tacos", "Q", "Burritos, tacos & bowls", ["CA"], ["Quesada Burritos & Tacos", "Quesada"], official("https://quesada.ca/nutrition/", "official_components", "2026-08-01")),
    entry("pita-pit-canada", "Pita Pit Canada", "PP", "Pitas, bowls & smoothies", ["CA"], ["Pita Pit Canada", "Pita Pit"], official("https://pitapit.ca/menu/nutrition/", "official_components", "2026-08-01")),
    entry("firehouse-subs-canada", "Firehouse Subs Canada", "FS", "Hot subs, salads & sides", ["CA"], ["Firehouse Subs Canada", "Firehouse Subs"], official("https://www.firehousesubs.ca/nutrition/", "official_reference")),
    entry("st-hubert", "St-Hubert", "SH", "Rotisserie chicken & comfort food", ["CA"], ["St-Hubert", "St Hubert", "St-Hubert BBQ"], official("https://www.st-hubert.com/fr/informations-nutritionnelles.html", "official_reference")),
    entry("white-spot", "White Spot", "WS", "Burgers, breakfast & entrées", ["CA"], ["White Spot"], official("https://www.whitespot.ca/nutrition/", "official_reference")),
    entry("triple-os", "Triple O's", "TO", "Burgers, chicken & shakes", ["CA"], ["Triple O's", "Triple Os"], official("https://www.tripleos.com/nutrition/", "official_reference")),
    entry("thai-express", "Thai Express", "TE", "Stir-fries, curries & noodles", ["CA"], ["Thai Express"], official("https://thaiexpress.ca/nutrition/", "official_reference")),
    entry("mr-sub", "MR.SUB", "MS", "Subs, wraps & salads", ["CA"], ["MR.SUB", "Mr Sub", "Mr. Sub"], official("https://mrsub.ca/nutrition/", "official_reference")),

    // United States expansion.
    entry("jersey-mikes", "Jersey Mike's", "JM", "Subs, wraps & bowls", ["US"], ["Jersey Mike's", "Jersey Mikes", "Jersey Mike's Subs"], official("https://www.jerseymikes.com/menu/nutrition", "official_reference")),
    entry("cava", "CAVA", "CV", "Mediterranean bowls & pitas", ["US"], ["CAVA", "Cava Grill"], official("https://cava.com/nutrition", "official_reference")),
    entry("sweetgreen", "Sweetgreen", "SG", "Salads, bowls & plates", ["US"], ["Sweetgreen"], official("https://www.sweetgreen.com/menu", "official_reference")),
    entry("qdoba", "QDOBA", "QD", "Burritos, bowls & tacos", ["US"], ["QDOBA", "Qdoba Mexican Eats", "Qdoba Mexican Grill"], official("https://www.qdoba.com/nutrition-allergens", "official_reference")),
    entry("wingstop", "Wingstop", "WS", "Wings, tenders & sides", ["US"], ["Wingstop"], official("https://www.wingstop.com/nutrition", "official_reference")),
    entry("shake-shack", "Shake Shack", "SS", "Burgers, chicken & shakes", ["US"], ["Shake Shack"], official("https://shakeshack.com/nutrition-allergens", "official_reference")),
    entry("whataburger", "Whataburger", "WB", "Burgers & breakfast", ["US"], ["Whataburger"], official("https://whataburger.com/nutrition", "official_reference")),
    entry("ihop", "IHOP", "IH", "Breakfast & diner meals", ["US"], ["IHOP", "International House of Pancakes"], official("https://www.ihop.com/en/nutrition", "official_reference")),
    entry("dennys", "Denny's", "DY", "Breakfast & diner meals", ["US", "CA"], ["Denny's", "Dennys"], official("https://www.dennys.com/nutrition", "official_reference")),
    entry("buffalo-wild-wings", "Buffalo Wild Wings", "BW", "Wings, burgers & sides", ["US"], ["Buffalo Wild Wings", "B-Dubs", "BDubs"], official("https://www.buffalowildwings.com/nutrition/", "official_reference")),
    entry("applebees", "Applebee's", "AB", "Grill, burgers & entrées", ["US"], ["Applebee's", "Applebees"], official("https://www.applebees.com/en/nutrition", "official_reference")),
    entry("arbys", "Arby's", "AR", "Roast beef, chicken & sides", ["US", "CA"], ["Arby's", "Arbys"], official("https://www.arbys.com/nutrition", "official_reference")),
    entry("culvers", "Culver's", "CU", "ButterBurgers, chicken & custard", ["US"], ["Culver's", "Culvers"], official("https://www.culvers.com/menu-and-nutrition", "official_reference")),
    entry("in-n-out", "In-N-Out", "IO", "Burgers, fries & shakes", ["US"], ["In-N-Out", "In N Out Burger", "In-N-Out Burger"], official("https://www.in-n-out.com/menu/nutrition-info", "official_reference")),
    entry("papa-johns", "Papa Johns", "PJ", "Pizza, wings & sides", ["US", "CA"], ["Papa Johns", "Papa John's", "Papa John's Pizza"], official("https://www.papajohns.com/company/nutritional-information.html", "official_reference")),
    entry("texas-roadhouse", "Texas Roadhouse", "TR", "Steaks, ribs & sides", ["US"], ["Texas Roadhouse"], official("https://www.texasroadhouse.com/nutrition", "official_reference")),
    entry("chilis", "Chili's", "CH", "Grill, burgers & fajitas", ["US"], ["Chili's", "Chilis", "Chili's Grill & Bar"], official("https://www.chilis.com/menu/nutrition-and-allergen-information", "official_reference")),
    entry("raising-canes", "Raising Cane's", "RC", "Chicken fingers & sides", ["US"], ["Raising Cane's", "Raising Canes"], official("https://www.raisingcanes.com/allergen-nutrition/", "official_reference")),
    entry("sonic", "SONIC", "SO", "Drive-in burgers, drinks & sides", ["US"], ["SONIC", "Sonic Drive-In", "Sonic Drive In"], official("https://www.sonicdrivein.com/nutrition/", "official_reference"))
];

export const RESTAURANT_DIRECTORY = Object.freeze(RAW_RESTAURANTS.map(item => Object.freeze({
    ...item,
    markets: Object.freeze([...item.markets]),
    brandAliases: Object.freeze([...item.brandAliases]),
    nutritionSource: item.nutritionSource ? Object.freeze({ ...item.nutritionSource }) : null
})));

const DIRECTORY_BY_ID = new Map(RESTAURANT_DIRECTORY.map(item => [item.id, item]));

export function restaurantForId(id) {
    return DIRECTORY_BY_ID.get(String(id || "").trim().toLowerCase()) || null;
}

export function restaurantMarket(item, requestedCountry = "CA") {
    const country = normalizeCountry(requestedCountry);
    if (!item?.markets?.length) return country;
    return item.markets.includes(country) ? country : item.markets[0];
}

export function restaurantBrandMatches(food, itemOrId) {
    const item = typeof itemOrId === "string" ? restaurantForId(itemOrId) : itemOrId;
    if (!item) return false;
    const brand = restaurantBrandIdentity(food?.brand);
    return Boolean(brand && item.brandAliases.some(alias => restaurantBrandIdentity(alias) === brand));
}

export function restaurantBrandIdentity(value) {
    const suffixes = new Set(["canada", "canadian", "restaurant", "restaurants", "inc", "incorporated", "ltd", "limited", "llc", "corp", "corporation"]);
    const tokens = normalizeRestaurantText(value).split(" ").filter(Boolean);
    if (tokens[0] === "the") tokens.shift();
    while (tokens.length > 1 && suffixes.has(tokens[tokens.length - 1])) tokens.pop();
    return tokens.join(" ");
}

export function normalizeRestaurantText(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeCountry(value) {
    return String(value || "").trim().toUpperCase() === "US" ? "US" : "CA";
}

function entry(id, name, mark, description, markets, brandAliases, nutritionSource = null) {
    const searchName = [...brandAliases].sort((a, b) => normalizeRestaurantText(a).length - normalizeRestaurantText(b).length)[0] || name;
    return { id, name, searchName, mark, description, markets, brandAliases, nutritionSource };
}

function official(url, coverage, updatedAt = null) {
    return { authority: "official_restaurant", url, coverage, updatedAt };
}
