import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceDirectory = process.argv[2] || "/tmp/levelup-restaurant-sources";
const outputFile = new URL("../cloud/src/data/priority-restaurant-catalogues.js", import.meta.url);

const SOURCES = {
    "The Chopped Leaf": source("chopped-leaf.txt", "The Chopped Leaf official nutrition chart", "https://choppedleaf.ca/nutritionals/", "2026-08-31"),
    "Osmow's": source("osmows.json", "Osmow's official nutrition calculator", "https://osmows.com/nutrition-calculator", "2026-09-13"),
    "Edo Japan": source("edo-ca.txt", "Edo Japan official nutrition guide", "https://www.edojapan.com/nutrition/", "2026-08-07"),
    "KFC Canada": source("kfc-ca.txt", "KFC Canada official nutrition guide", "https://www.kfc.ca/nutrition-allergen", "2025-11-17"),
    "TacoTime Canada": source("tacotime-ca.txt", "TacoTime Canada official nutrition guide", "https://tacotimecanada.com/nutrition/", "2025-10-01"),
    "MUCHO Burrito": source("mucho.csv", "MUCHO Burrito official nutrition calculator", "https://muchoburrito.com/nutrition/", "2026-09-13")
};

const rows = [
    ...parseChoppedLeaf(await text("chopped-leaf.txt")),
    ...parseOsmows(JSON.parse(await text("osmows.json"))),
    ...parseEdo(await text("edo-ca.txt")),
    ...parseKfc(await text("kfc-ca.txt")),
    ...parseTacoTime(await text("tacotime-ca.txt")),
    ...parseMucho(await text("mucho.csv"))
];

const uniqueRows = [...new Map(rows.map(row => [row.id, row])).values()];
const completeBrands = new Set(["The Chopped Leaf", "Osmow's", "Edo Japan", "KFC Canada", "TacoTime Canada"]);
const completeCounts = Object.fromEntries(Object.keys(SOURCES)
    .filter(brand => completeBrands.has(brand))
    .map(brand => [brand, uniqueRows.filter(row => row.brand === brand).length]));

validate(uniqueRows, completeCounts);

const generated = `// Generated from the first-party sources listed below. Do not edit individual rows by hand.
// Re-run tools/compile-priority-restaurant-catalogues.mjs after downloading the current source files.
export const PRIORITY_RESTAURANT_CATALOGUE_SOURCES = ${JSON.stringify(SOURCES, null, 4)};

export const COMPLETE_PRIORITY_RESTAURANT_CATALOGUE_COUNTS = ${JSON.stringify(completeCounts, null, 4)};

const RAW_ROWS = ${JSON.stringify(uniqueRows.map(row => [
    row.id, row.brand, row.name, row.label, row.grams || 0, row.calories, row.protein,
    row.carbs, row.fat, row.fiber, row.menuSection, row.calculationMethod || "", row.sourceNote || ""
]), null, 4)};

export const PRIORITY_RESTAURANT_CATALOGUES = RAW_ROWS.map(([id, brand, name, label, grams, calories, protein, carbs, fat, fiber, menuSection, calculationMethod, sourceNote]) => ({
    id, brand, name, label, ...(grams > 0 ? { grams } : {}), calories, protein, carbs, fat, fiber, menuSection,
    countryCode: "CA", aliases: \`${"${brand}"} restaurant canada menu nutrition macros\`,
    sourceName: PRIORITY_RESTAURANT_CATALOGUE_SOURCES[brand].sourceName,
    sourceUrl: PRIORITY_RESTAURANT_CATALOGUE_SOURCES[brand].sourceUrl,
    verifiedAt: PRIORITY_RESTAURANT_CATALOGUE_SOURCES[brand].verifiedAt,
    ...(calculationMethod ? { calculationMethod, sourceNote } : {})
}));
`;

await writeFile(outputFile, generated);
console.log(JSON.stringify({ output: outputFile.pathname, rows: uniqueRows.length, counts: countByBrand(uniqueRows) }, null, 2));

function parseChoppedLeaf(input) {
    const brand = "The Chopped Leaf";
    const sections = new Set(["Bowls", "Salads", "Wraps", "Sandwiches", "Quesadillas", "Soup", "Kids Menu", "Dressings", "Proteins", "Chopped Water"]);
    let menuSection = "Menu items";
    const output = [];
    for (const rawLine of input.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (sections.has(line)) { menuSection = line; continue; }
        const match = line.match(/^(.*?)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)$/);
        if (!match || /^(menu|calories)$/i.test(match[1])) continue;
        const [calories, fat, carbs, fiber, , protein] = match.slice(2).map(number);
        if (!validNutrition(calories, protein, carbs, fat)) continue;
        const name = clean(match[1]);
        output.push(row({ brand, name, label: servingLabel(menuSection), calories, protein, carbs, fat, fiber, menuSection }));
    }
    return output;
}

function parseOsmows(categories) {
    const brand = "Osmow's";
    const output = [];
    for (const category of Array.isArray(categories) ? categories : []) {
        const menuSection = cleanHtml(category?.name) || "Menu items";
        for (const item of Array.isArray(category?.children) ? category.children : []) {
            const components = Array.isArray(item?.nutritions) ? item.nutritions : [];
            if (!components.length) continue;
            const totals = components.reduce((sum, component) => ({
                calories: sum.calories + number(component.calories),
                protein: sum.protein + number(component.protein),
                carbs: sum.carbs + number(component.carbohydrates),
                fat: sum.fat + number(component.total_fat),
                fiber: sum.fiber + number(component.fiber)
            }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
            if (!validNutrition(totals.calories, totals.protein, totals.carbs, totals.fat)) continue;
            const name = cleanHtml(item?.post_title);
            output.push(row({
                brand, name, label: "1 menu item", ...rounded(totals), menuSection,
                calculationMethod: components.length > 1 ? "component_sum" : "",
                sourceNote: components.length > 1 ? "Sum of the default components in Osmow's official nutrition calculator." : ""
            }));
        }
    }
    return output;
}

function parseEdo(input) {
    const brand = "Edo Japan";
    let menuSection = "Menu items";
    const output = [];
    for (const rawLine of input.split(/\r?\n/)) {
        const line = rawLine.replace(/\f/g, "").trim();
        const header = line.match(/^([A-Z][A-Z0-9 &()'/-]+?)\s+Serving Size\s+Calories/);
        if (header) { menuSection = titleCase(header[1]); continue; }
        if (/^[A-Z][A-Z0-9 &()'/-]{2,}$/.test(line) && !/NUTRITIONAL|INFORMATION|PAGE/.test(line)) menuSection = titleCase(line);
        const matches = [...line.matchAll(/-?\d[\d,.]*/g)];
        if (matches.length < 11) continue;
        const values = matches.slice(-11);
        const name = clean(line.slice(0, values[0].index));
        if (!name || /serving|substitution values/i.test(name)) continue;
        const [serving, calories, fat, , , , , carbs, fiber, , protein] = values.map(match => number(match[0]));
        if (!nonnegativeNutrition(calories, protein, carbs, fat)) continue;
        const grams = serving >= 20 && !/sushi|roll/i.test(menuSection) ? serving : 0;
        output.push(row({ brand, name, label: grams ? `1 serving (${round(serving)} g)` : "1 order", grams, calories, protein, carbs, fat, fiber, menuSection }));
    }
    return output;
}

function parseKfc(input) {
    const brand = "KFC Canada";
    const english = input.split(/\fPFK® CANADA INFORMATION NUTRITIONELLE/i)[0];
    let menuSection = "Menu items";
    const output = [];
    for (const rawLine of english.split(/\r?\n/)) {
        const line = rawLine.replace(/\f/g, "").trim();
        if (/^[A-Z][A-Z0-9 &()®'*./-]{2,}$/.test(line) && !/KFC CANADA|NUTRITION|FACTS|UPDATED/.test(line)) {
            menuSection = titleCase(line.replace(/\*+$/, ""));
            continue;
        }
        const matches = [...line.matchAll(/-?\d[\d,.]*/g)];
        if (matches.length < 10) continue;
        const values = matches.slice(-10);
        const prefix = line.slice(0, values[0].index).trim();
        const split = prefix.split(/\s{2,}/).map(clean).filter(Boolean);
        if (split.length < 2) continue;
        const label = split.pop();
        const name = clean(split.join(" "));
        const [calories, fat, , , , , carbs, fiber, , protein] = values.map(match => number(match[0]));
        if (!name || !nonnegativeNutrition(calories, protein, carbs, fat)) continue;
        output.push(row({ brand, name, label, calories, protein, carbs, fat, fiber, menuSection }));
    }
    return output;
}

function parseMucho(input) {
    const brand = "MUCHO Burrito";
    const lines = input.split(/\r?\n/).filter(Boolean).map(parseCsvLine);
    const headers = lines.shift();
    const index = Object.fromEntries(headers.map((value, position) => [value, position]));
    return lines.map(values => {
        const name = clean(values[index["Item Name"]]).replace(/\s+\([A-Z ]+\)\s*$/, "");
        const size = clean(values[index["Serving Size"]]);
        const type = clean(values[index["Item Type"]]);
        const category = titleCase(values[index.Category]);
        return row({
            brand,
            name: size && !name.toLowerCase().includes(size.toLowerCase()) ? `${name} — ${titleCase(size)}` : name,
            label: `${titleCase(size || "regular")} portion`,
            grams: number(values[index.Weight]),
            calories: number(values[index.Calories]),
            protein: number(values[index.Protein]),
            carbs: number(values[index.Carbs]),
            fat: number(values[index.Fat]),
            fiber: number(values[index.Fibre]),
            menuSection: `${category || "Menu"} — ${titleCase(type || "Items")}`
        });
    }).filter(item => item.name && validNutrition(item.calories, item.protein, item.carbs, item.fat));
}

function parseTacoTime(input) {
    const brand = "TacoTime Canada";
    let menuSection = "Menu items";
    const output = [];
    for (const rawLine of input.split(/\r?\n/)) {
        const line = rawLine.replace(/\f/g, "").trim();
        const matches = [...line.matchAll(/-?\d[\d,.]*/g)];
        if (matches.length < 13) {
            if (/^[A-Z][A-Z0-9 &()'./-]{2,}$/.test(line) && !/CALORIES|PROTEIN|CARBS|MENU ITEMS|OCTOBER/.test(line)) menuSection = titleCase(line);
            continue;
        }
        const values = matches.slice(-13);
        const name = clean(line.slice(0, values[0].index));
        if (!name) continue;
        const [calories, protein, carbs, fat, , , , , fiber] = values.map(match => number(match[0]));
        if (!nonnegativeNutrition(calories, protein, carbs, fat)) continue;
        output.push(row({ brand, name: titleCase(name), label: "1 menu item", calories, protein, carbs, fat, fiber, menuSection }));
    }
    return output;
}

function row(input) {
    return { ...input, id: `${slug(input.brand)}-ca-${slug(input.menuSection)}-${slug(input.name)}-${slug(input.label)}` };
}

function validate(output, counts) {
    if (output.length < 400) throw new Error(`Expected at least 400 compiled rows; received ${output.length}.`);
    if (new Set(output.map(item => item.id)).size !== output.length) throw new Error("Compiled restaurant catalogue IDs must be unique.");
    for (const [brand, count] of Object.entries(counts)) if (count < 20) throw new Error(`${brand} catalogue is unexpectedly small (${count}).`);
    for (const item of output) {
        if (!SOURCES[item.brand] || !item.name || !item.label || !item.menuSection) throw new Error(`Invalid row: ${JSON.stringify(item)}`);
        for (const key of ["calories", "protein", "carbs", "fat", "fiber"]) if (!Number.isFinite(item[key]) || item[key] < 0) throw new Error(`${item.id} has invalid ${key}.`);
    }
}

function source(file, sourceName, sourceUrl, verifiedAt) { return { file, sourceName, sourceUrl, verifiedAt }; }
function text(file) { return readFile(path.join(sourceDirectory, file), "utf8"); }
function number(value) { const result = Number(String(value ?? "").replace(/,/g, "").trim()); return Number.isFinite(result) ? result : 0; }
function round(value) { return Math.round(number(value) * 10) / 10; }
function rounded(values) { return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, round(value)])); }
function validNutrition(calories, protein, carbs, fat) { return [calories, protein, carbs, fat].every(value => Number.isFinite(value) && value >= 0) && (calories > 0 || protein > 0 || carbs > 0 || fat > 0); }
function nonnegativeNutrition(calories, protein, carbs, fat) { return [calories, protein, carbs, fat].every(value => Number.isFinite(value) && value >= 0); }
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function cleanHtml(value) { return clean(String(value || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#x2122;|&trade;/gi, "™").replace(/&reg;|®/gi, "®").replace(/&#0*39;|&apos;/gi, "'").replace(/&quot;/gi, '"')); }
function slug(value) { return cleanHtml(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110); }
function titleCase(value) { return clean(value).toLowerCase().replace(/\b[a-z]/g, character => character.toUpperCase()); }
function servingLabel(section) { if (section === "Dressings") return "1 dressing serving"; if (section === "Proteins") return "1 add-on"; if (section === "Chopped Water") return "1 drink"; return "1 menu item"; }
function countByBrand(output) { return Object.fromEntries(Object.keys(SOURCES).map(brand => [brand, output.filter(item => item.brand === brand).length])); }

function parseCsvLine(line) {
    const fields = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"') {
            if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
            else quoted = !quoted;
        }
        else if (character === "," && !quoted) { fields.push(current); current = ""; }
        else current += character;
    }
    fields.push(current);
    return fields;
}
