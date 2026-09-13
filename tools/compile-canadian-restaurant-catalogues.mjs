import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourceDir = resolve(process.argv[2] || "");
const outputPath = resolve(process.argv[3] || "cloud/src/data/canadian-restaurant-catalogues.js");

if (!process.argv[2]) {
    throw new Error("Usage: node tools/compile-canadian-restaurant-catalogues.mjs <source-dir> [output-file]");
}

const SOURCE_MANIFEST = Object.freeze({
    "Booster Juice": {
        file: "boosterjuice.txt",
        sourceName: "Booster Juice Canada nutrition guide",
        sourceUrl: "https://cdn.shopify.com/s/files/1/0673/9371/6482/files/2026-09-NutritionGuide-ENG.pdf?v=1788534813",
        menuUrl: "https://boosterjuice.com/en-ca"
    },
    "Cora": {
        file: "cora.txt",
        sourceName: "Cora Breakfast & Lunch nutrition guide",
        sourceUrl: "https://www.chezcora.com/wp-content/uploads/2026/06/ValeurNutritive_EN_Mai26.pdf",
        menuUrl: "https://www.chezcora.com/en/menu/"
    },
    "East Side Mario's": {
        file: "eastsidemarios.html",
        sourceName: "East Side Mario's official nutrition page",
        sourceUrl: "https://www.eastsidemarios.com/en/nutrition.html",
        menuUrl: "https://www.eastsidemarios.com/en/menu.html"
    },
    "Five Guys": {
        file: "fiveguys.txt",
        sourceName: "Five Guys Canada nutrition and allergen guide",
        sourceUrl: "https://www.fiveguys.ca/media/canada_en-ca/-/media/public-site/files/allergen-ingredients-and-nutrition-info/five-guys-canada-ingredient--allergen-guide-english.pdf",
        menuUrl: "https://www.fiveguys.ca/menu/"
    },
    "Freshii": {
        file: "freshii.txt",
        sourceName: "Freshii nutritionals and allergen guide",
        sourceUrl: "https://freshii.com/wp-content/uploads/2026/09/Freshii-Nutritionals-and-Allergens-Guide-EN-092026.pdf",
        menuUrl: "https://freshii.com/menu/"
    },
    "Kelseys": {
        file: "kelseys.html",
        sourceName: "Kelseys official nutrition page",
        sourceUrl: "https://www.kelseys.ca/en/nutrition.html",
        menuUrl: "https://www.kelseys.ca/en/menu.html"
    },
    "Little Caesars": {
        file: "littlecaesars.txt",
        sourceName: "Little Caesars Canada nutrition guide",
        sourceUrl: "https://www.datocms-assets.com/92799/1674767518-canadiannutritionguide-enca.pdf",
        menuUrl: "https://order.littlecaesars.ca/en-ca/order/menu/"
    },
    "Montana's": {
        file: "montanas.html",
        sourceName: "Montana's official nutrition page",
        sourceUrl: "https://www.montanas.ca/en/nutrition.html",
        menuUrl: "https://www.montanas.ca/en/menu.html"
    },
    "The Keg": {
        file: "thekeg.txt",
        sourceName: "The Keg Steakhouse + Bar official nutrition guide",
        sourceUrl: "https://cdn.sanity.io/files/dw0heewu/production/9bd1278ec1168135bd1a16077dc2a309d997ec41.pdf",
        menuUrl: "https://thekeg.com/en/locations"
    }
});

const FATSECRET_SUPPLEMENT_MANIFEST = Object.freeze({
    "Tim Hortons": {
        menuUrl: "https://www.timhortons.ca/menu",
        nutritionUrl: "https://www.timhortons.ca/menu",
        note: "The current Canadian menu and nutrition explorer are dynamic; exact confirmed restaurant results remain FatSecret-supplemented."
    },
    "Mary Brown's": {
        menuUrl: "https://marybrowns.com/menu/",
        nutritionUrl: "https://marybrowns.com/menu/",
        note: "The first-party menu publishes calorie ranges but macro placeholders, so Level Up does not invent exact macros."
    },
    "Pizza Pizza": {
        menuUrl: "https://www.pizzapizza.ca/",
        nutritionUrl: "https://www.pizzapizza.ca/about-us/nutrition/",
        note: "The official nutrition tables are protected from unattended compilation; exact confirmed restaurant results remain FatSecret-supplemented."
    },
    "New York Fries": {
        menuUrl: "https://www.newyorkfries.com/menu",
        nutritionUrl: "https://www.newyorkfries.com/_files/ugd/bdf8b6_4b1456a15baf4c13acd16438966d77e6.pdf",
        note: "The current first-party guide is image-only and could not be transcribed reliably enough for verified static macros."
    }
});

// These guides are current, first-party catalogues whose published rows cover the
// restaurant's standard Canadian menu. Older or component-based guides still add
// verified foods, but FatSecret remains enabled so newer/assembled items can fill
// any gaps rather than being incorrectly treated as a complete menu.
const COMPLETE_CATALOGUE_BRANDS = new Set([
    "Booster Juice",
    "Cora",
    "East Side Mario's",
    "Freshii",
    "Kelseys",
    "Montana's"
]);

const read = file => readFile(resolve(sourceDir, file), "utf8");
const number = value => {
    const text = String(value ?? "").replace(/,/g, "").trim();
    if (/^<\s*1(?:\.0+)?$/.test(text)) return 0.5;
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) ? parsed : 0;
};
const clean = value => String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&reg;|®/g, "")
    .replace(/&trade;|™/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const slug = value => clean(value).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function food(brand, name, label, calories, protein, carbs, fat, fiber, menuSection, grams = 0, extra = {}) {
    return {
        brand,
        name: clean(name),
        label: clean(label),
        ...(grams > 0 ? { grams } : {}),
        calories: number(calories),
        protein: number(protein),
        carbs: number(carbs),
        fat: number(fat),
        fiber: number(fiber),
        menuSection: clean(menuSection) || "Menu items",
        countryCode: "CA",
        ...extra
    };
}

function parseRecipeUnlimited(html, brand) {
    const lines = html.split(/\r?\n/);
    const results = [];
    let section = "Menu items";
    for (let index = 0; index < lines.length; index += 1) {
        if (lines[index].includes('class="nutritional-heading')) {
            section = buttonText(lines, index) || section;
            continue;
        }
        if (!lines[index].includes('class="h4 nutrition-product-heading"')) continue;
        const name = buttonText(lines, index);
        const end = nextIndex(lines, index + 1, line => line.includes('class="h4 nutrition-product-heading"') || line.includes('class="nutritional-heading'));
        const block = lines.slice(index, end).join("\n");
        const value = label => number(block.match(new RegExp(`${label}\\s*<span class="pull-right">([^<]+)`, "i"))?.[1]);
        const grams = value("Serving Size");
        const calories = value("Calories");
        if (!name || calories <= 0) continue;
        results.push(food(brand, name, grams ? `1 order (${grams} g)` : "1 order", calories, value("Protein"), value("Carbohydrates"), value("Fat"), value("Fiber"), titleCase(section), grams));
        index = end - 1;
    }
    return results;
}

function buttonText(lines, start) {
    const end = nextIndex(lines, start, line => line.includes("</button>"));
    return clean(lines.slice(start, end + 1).join(" ").replace(/^.*?<button[^>]*>/s, "").replace(/<i[\s\S]*$/s, ""));
}

function nextIndex(lines, start, predicate) {
    const offset = lines.slice(start).findIndex(predicate);
    return offset < 0 ? lines.length : start + offset;
}

function titleCase(value) {
    return clean(value).toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
}

function parseFreshii(text) {
    const headings = new Set(["Breakfast", "Pockets", "Poke Bowls", "Energy Bowls", "Lifestyle Bowls", "Heartii Bowls", "Salad Bowls", "Burritos", "Wraps", "Sides", "Soup", "Kids Menu", "Proteins", "Smoothies", "Smoothie Bowls", "Sauces & Dressings", "Add-Ons"]);
    const results = [];
    let section = "Menu items";
    let pendingName = "";
    const lines = text.split(/\r?\n/).slice(0, 300);
    for (let index = 0; index < lines.length; index += 1) {
        const raw = lines[index];
        const line = raw.trim();
        if (headings.has(line)) {
            section = line;
            pendingName = "";
            continue;
        }
        let parts = line.split(/\s{2,}/).map(clean);
        if (parts.length >= 13 && /^\d/.test(parts[0]) && pendingName) {
            const continuation = clean(lines[index + 1]);
            const fullName = continuation && !/^\(|Item\b|Approved\b/.test(continuation) ? `${pendingName} ${continuation}` : pendingName;
            parts = [fullName, ...parts];
            if (fullName !== pendingName) index += 1;
        }
        if (parts.length < 14 || !/^\d/.test(parts[1])) {
            if (line && parts.length === 1 && !/^Item\b|Approved\b|Nutrition\b|NUTRITION/i.test(line)) pendingName = line;
            continue;
        }
        results.push(food("Freshii", parts[0], "1 menu serving", parts[1], parts[9], parts[6], parts[2], parts[7], section));
        pendingName = "";
    }
    return results;
}

function parseBoosterJuice(text) {
    const headings = new Set(["CLASSICS", "HIGH PROTEIN", "SPIRIT", "SUPERFOOD", "SUPERFOOD+", "REFRESH", "BOOSTER MIX’RS", "FRESH JUICES", "SHOTS", "BOWLS", "BOOSTER BALLS", "BOOSTER BARS", "PANINIS", "WRAPS"]);
    const results = [];
    let section = "Smoothies";
    let pendingName = "";
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (headings.has(line)) {
            section = ["CLASSICS", "HIGH PROTEIN", "SPIRIT", "SUPERFOOD", "SUPERFOOD+", "REFRESH", "BOOSTER MIX’RS"].includes(line) ? `Smoothies — ${titleCase(line)}` : titleCase(line);
            pendingName = "";
            continue;
        }
        let parts = line.split(/\s{2,}/).map(clean);
        if (/^\d+(?:\.\d+)?\s*(?:mL|oz|item)$/i.test(parts[0]) && pendingName) parts = [pendingName, ...parts];
        if (parts.length < 16 || !/^\d+(?:\.\d+)?\s*(?:mL|oz|item)$/i.test(parts[1])) {
            if (line && parts.length === 1 && !/^(NUTRITION|Product|Updated|SMOOTHIES|Calorie|Serving|Total|Size|t \(g\))/i.test(line)) pendingName = line;
            continue;
        }
        const size = /\(R\)$/.test(parts[0]) ? "Regular" : /\(S\)$/.test(parts[0]) ? "Snack" : "";
        const name = parts[0].replace(/\s*\([RS]\)$/, size ? ` — ${size}` : "");
        results.push(food("Booster Juice", name, `1 ${size.toLowerCase() || "menu"} serving (${parts[1]})`, parts[2], parts[6], parts[7], parts[3], parts[8], section));
        pendingName = "";
    }
    return results;
}

function parseCora(text) {
    const headings = new Set(["Beverages", "Refreshing beverages", "Fresh fruit", "French Toast", "Waffles", "Fruit crêpes", "Pancakes", "Savoury crêpes", "Crêpomelettes", "Eggs", "Sweet ‘n salty", "Ben et Dictine", "Ben Duos", "Eggs in a skillet", "Omelettes", "Sandwiches", "Breakfast pizzas", "Teen’s favourites!", "Early Bird", "Kid’s menu", "Little extras", "Lunch Menu", "Dishes to share", "Breads"]);
    const results = [];
    let section = "Menu items";
    const lines = text.split(/\r?\n/).slice(0, 2640);
    for (const raw of lines) {
        const line = raw.trim();
        if (headings.has(line)) {
            section = line;
            continue;
        }
        const parts = line.split(/\s{2,}/).map(clean);
        if (parts.length < 14 || !/^\d/.test(parts[1])) continue;
        results.push(food("Cora", parts[0], "1 menu order", parts[1], parts[10], parts[7], parts[2], parts[8], section));
    }
    return results;
}

function parseTheKeg(text) {
    const headings = new Set(["APPETIZERS + SOUPS", "SALADS", "STEAK + PRIME RIB", "KEG CLASSICS", "STEAK + SEAFOOD", "MAINS", "ACCOMPANIMENTS", "CASUAL BITES", "US SIDES", "APPETIZERS + SOUPS + SALADS", "LUNCH FEATURES"]);
    const results = [];
    let section = "Menu items";
    let scope = "Dinner";
    let pendingName = "";
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const raw = lines[index];
        const line = raw.trim();
        if (line.startsWith("DINNER MENU ITEMS")) scope = "Dinner";
        else if (line.startsWith("LUNCH MENU ITEMS")) scope = "Lunch";
        else if (line.startsWith("KIDS MENU ITEMS")) {
            scope = "Kids";
            section = "Kids";
        }
        else if (line.startsWith("DESSERT MENU ITEMS")) {
            scope = "Dessert";
            section = "Desserts";
        }
        if (headings.has(line)) {
            const heading = titleCase(line.replace(/\s*\+\s*/g, " & "));
            section = ["Kids", "Dessert"].includes(scope) ? heading : `${scope} — ${heading}`;
            pendingName = "";
            continue;
        }
        let parts = line.split(/\s{2,}/).map(clean);
        if (parts.length === 15 && /^\d/.test(parts[0]) && pendingName) {
            const continuation = clean(lines[index + 1]);
            const fullName = continuation && !/^\(|\*|Only\b/.test(continuation) ? `${pendingName} ${continuation}` : pendingName;
            parts = [fullName, ...parts];
            if (fullName !== pendingName) index += 1;
        }
        if (parts.length < 16 || !/^\d+g?$/.test(parts[1]) || !/^\d/.test(parts[2])) {
            if (line && parts.length === 1 && !/^\(|\*|Only\b|Nutritional\b|The actual\b|Some Keg\b|please\b|DAILY\b/i.test(line)) pendingName = line;
            continue;
        }
        const grams = number(parts[1]);
        results.push(food("The Keg", parts[0], `1 order (${grams} g)`, parts[2], parts[11], parts[8], parts[3], parts[9], section, grams));
        pendingName = "";
    }
    return results;
}

function parseLittleCaesars(text) {
    const headings = ["12” Medium Round Classic Pizzas", "12” Medium Round Specialty Pizzas", "14” Large Round Classic Pizzas", "14”Large Round Specialty Pizzas", "Deep!Deep! Dish Pizza", "Deep!Deep! Dish Specialty Pizzas", "Breads and Sides", "Caesar Wings", "Caesar Dips", "Toppings for"];
    const results = [];
    let section = "Menu items";
    let serving = "1 order";
    for (const raw of text.split(/\r?\n/).slice(0, 215)) {
        const line = clean(raw);
        const heading = headings.find(value => line.startsWith(value));
        if (heading) {
            section = heading.startsWith("Toppings for") ? "Toppings" : /Pizza/.test(heading) ? "Pizza" : heading;
            if (/12” Medium/.test(heading)) serving = "1 whole 12-inch medium pizza (8 slices)";
            else if (/14” ?Large/.test(heading)) serving = "1 whole 14-inch large pizza (8 slices)";
            else if (/Deep!Deep!/.test(heading)) serving = "1 whole Deep!Deep! Dish pizza (8 slices)";
            continue;
        }
        if (/^\(Serving Size:/i.test(line) && section !== "Pizza") serving = clean(line.replace(/^\(|\)$/g, "").replace(/^Serving Size:\s*/i, ""));
        if (section === "Toppings") continue;
        const parts = raw.trim().split(/\s{2,}/).map(clean);
        if (parts.length < 15 || !/^\d/.test(parts[1])) continue;
        const sizeSuffix = section === "Pizza" ? serving.replace(/^1 whole | pizza.*$/g, "").trim() : "";
        const name = sizeSuffix ? `${parts[0]} — ${sizeSuffix}` : parts[0];
        results.push(food("Little Caesars", name, serving, parts[1], parts[10], parts[7], parts[2], parts[8], section));
    }
    return results;
}

function parseFiveGuys(text) {
    const results = [];
    let section = "Menu items";
    for (const raw of text.split(/\r?\n/).slice(0, 285)) {
        const line = raw.trim();
        if (/^(MEAT|BUN|TOPPINGS|MILKSHAKES|MIX-INS|OTHER ITEMS)/.test(line)) section = titleCase(line.split(" (")[0]);
        if (/^FRIES/.test(line)) section = "Fries";
        const parts = line.split(/\s{2,}/).map(clean);
        if (parts.length < 13 || !/^\d/.test(parts[1]) || !/^\d/.test(parts[2])) continue;
        const grams = number(parts[1]);
        let name = parts[0];
        if (/Five Guys Style$/.test(name)) name = name.replace(/^(Little|Regular|Large) (.+)$/, "$2 Fries — $1");
        if (/Cajun Style$/.test(name)) name = name.replace(/^(Little|Regular|Large) (.+)$/, "$2 Fries — $1");
        results.push(food("Five Guys", name, `1 serving (${grams} g)`, parts[2], parts[12], parts[9], parts[4], parts[10], section, grams));
    }

    const byName = new Map(results.map(item => [item.name, item]));
    const patty = byName.get("Hamburger Patty");
    const bun = byName.get("Bun");
    const cheese = byName.get("Cheese (1 slice)");
    const bacon = byName.get("Bacon (2 pieces)");
    const hotDog = byName.get("Hot Dog");
    const sum = (name, components, label) => {
        const combined = components.reduce((total, item) => ({
            grams: total.grams + (item?.grams || 0), calories: total.calories + (item?.calories || 0),
            protein: total.protein + (item?.protein || 0), carbs: total.carbs + (item?.carbs || 0),
            fat: total.fat + (item?.fat || 0), fiber: total.fiber + (item?.fiber || 0)
        }), { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
        return food("Five Guys", name, `${label} (${combined.grams} g)`, combined.calories, combined.protein, combined.carbs, combined.fat, combined.fiber, "Burgers & Hot Dogs", combined.grams, {
            calculationMethod: "component_sum",
            sourceNote: "Calculated by adding the restaurant's published patty, bun, cheese, and bacon component values as applicable. Toppings are not included."
        });
    };
    results.unshift(
        sum("Hamburger — Plain", [patty, patty, bun], "1 plain burger"),
        sum("Little Hamburger — Plain", [patty, bun], "1 plain burger"),
        sum("Cheeseburger — Plain", [patty, patty, bun, cheese, cheese], "1 plain burger"),
        sum("Little Cheeseburger — Plain", [patty, bun, cheese], "1 plain burger"),
        sum("Bacon Burger — Plain", [patty, patty, bun, bacon], "1 plain burger"),
        sum("Little Bacon Burger — Plain", [patty, bun, bacon], "1 plain burger"),
        sum("Bacon Cheeseburger — Plain", [patty, patty, bun, bacon, cheese, cheese], "1 plain burger"),
        sum("Little Bacon Cheeseburger — Plain", [patty, bun, bacon, cheese], "1 plain burger"),
        sum("Hot Dog — Plain", [hotDog, bun], "1 plain hot dog"),
        sum("Cheese Dog — Plain", [hotDog, bun, cheese], "1 plain hot dog"),
        sum("Bacon Dog — Plain", [hotDog, bun, bacon], "1 plain hot dog"),
        sum("Bacon Cheese Dog — Plain", [hotDog, bun, bacon, cheese], "1 plain hot dog")
    );
    return results.filter(item => item.calories > 0);
}

function finalize(items) {
    const nameCounts = new Map();
    items.forEach(item => nameCounts.set(`${item.brand}|${item.name}`, (nameCounts.get(`${item.brand}|${item.name}`) || 0) + 1));
    const ids = new Map();
    return items.map(item => {
        const duplicateName = nameCounts.get(`${item.brand}|${item.name}`) > 1;
        const name = duplicateName ? `${item.name} — ${item.menuSection}` : item.name;
        const baseId = `${slug(item.brand)}-ca-${slug(item.menuSection)}-${slug(name)}`;
        const count = (ids.get(baseId) || 0) + 1;
        ids.set(baseId, count);
        const source = SOURCE_MANIFEST[item.brand];
        return {
            ...item,
            id: count === 1 ? baseId : `${baseId}-${count}`,
            name,
            aliases: `${item.brand} restaurant canada menu nutrition macros`,
            sourceName: source.sourceName,
            sourceUrl: source.sourceUrl,
            verifiedAt: "2026-09-13"
        };
    });
}

function isTrustworthyMacroRow(item) {
    if (!item?.name || /^\d+$/.test(item.name) || item.calories <= 0) return false;
    if (item.calories > 20 && item.protein === 0 && item.carbs === 0 && item.fat === 0) return false;
    const macroCalories = (item.protein * 4) + (item.carbs * 4) + (item.fat * 9);
    const alcoholOrMixedDrink = /alcohol|beer|wine|cocktail|mimosa|daiquiri|caesar|sangria|martini|margarita|vodka|gin|bellini|spritz|liqueur|rum|tequila|whisk/i.test(item.name);
    if (!alcoholOrMixedDrink && item.calories >= 50 && macroCalories > item.calories * 1.55) return false;
    return true;
}

const groups = {
    "Booster Juice": parseBoosterJuice(await read(SOURCE_MANIFEST["Booster Juice"].file)),
    "Cora": parseCora(await read(SOURCE_MANIFEST.Cora.file)),
    "East Side Mario's": parseRecipeUnlimited(await read(SOURCE_MANIFEST["East Side Mario's"].file), "East Side Mario's"),
    "Five Guys": parseFiveGuys(await read(SOURCE_MANIFEST["Five Guys"].file)),
    "Freshii": parseFreshii(await read(SOURCE_MANIFEST.Freshii.file)),
    "Kelseys": parseRecipeUnlimited(await read(SOURCE_MANIFEST.Kelseys.file), "Kelseys"),
    "Little Caesars": parseLittleCaesars(await read(SOURCE_MANIFEST["Little Caesars"].file)),
    "Montana's": parseRecipeUnlimited(await read(SOURCE_MANIFEST["Montana's"].file), "Montana's"),
    "The Keg": parseTheKeg(await read(SOURCE_MANIFEST["The Keg"].file))
};

const validatedGroups = Object.fromEntries(Object.entries(groups).map(([brand, foods]) => [brand, foods.filter(isTrustworthyMacroRow)]));
const items = finalize(Object.values(validatedGroups).flat());
const counts = Object.fromEntries(Object.entries(validatedGroups).map(([brand, foods]) => [brand, foods.length]));
const completeCounts = Object.fromEntries(Object.entries(counts).filter(([brand]) => COMPLETE_CATALOGUE_BRANDS.has(brand)));
const rawRows = items.map(item => [
    item.id, item.brand, item.name, item.label, item.grams || 0, item.calories, item.protein, item.carbs,
    item.fat, item.fiber, item.menuSection, item.calculationMethod || "", item.sourceNote || ""
]);
const serialized = `// Generated from the first-party sources listed below. Do not edit individual rows by hand.\n` +
    `// Re-run tools/compile-canadian-restaurant-catalogues.mjs after downloading the current source files.\n` +
    `export const CANADIAN_RESTAURANT_CATALOGUE_SOURCES = ${JSON.stringify(SOURCE_MANIFEST, null, 4)};\n\n` +
    `export const CANADIAN_RESTAURANT_FATSECRET_SUPPLEMENT_SOURCES = ${JSON.stringify(FATSECRET_SUPPLEMENT_MANIFEST, null, 4)};\n\n` +
    `export const CANADIAN_RESTAURANT_CATALOGUE_COUNTS = ${JSON.stringify(counts, null, 4)};\n\n` +
    `export const COMPLETE_CANADIAN_RESTAURANT_CATALOGUE_COUNTS = ${JSON.stringify(completeCounts, null, 4)};\n\n` +
    `const RAW_CATALOGUE_ROWS = [\n${rawRows.map(row => `    ${JSON.stringify(row)}`).join(",\n")}\n];\n\n` +
    `export const CANADIAN_RESTAURANT_CATALOGUES = RAW_CATALOGUE_ROWS.map(([id, brand, name, label, grams, calories, protein, carbs, fat, fiber, menuSection, calculationMethod, sourceNote]) => ({\n` +
    `    id, brand, name, label, ...(grams > 0 ? { grams } : {}), calories, protein, carbs, fat, fiber, menuSection,\n` +
    `    countryCode: "CA", aliases: \`${"${brand}"} restaurant canada menu nutrition macros\`,\n` +
    `    sourceName: CANADIAN_RESTAURANT_CATALOGUE_SOURCES[brand].sourceName,\n` +
    `    sourceUrl: CANADIAN_RESTAURANT_CATALOGUE_SOURCES[brand].sourceUrl, verifiedAt: "2026-09-13",\n` +
    `    ...(calculationMethod ? { calculationMethod, sourceNote } : {})\n` +
    `}));\n`;

await writeFile(outputPath, serialized);
console.log(JSON.stringify({ outputPath, total: items.length, counts, completeCounts }, null, 2));
