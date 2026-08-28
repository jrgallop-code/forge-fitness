const UNIT_ALIASES = new Map([
    ["g", "g"], ["gram", "g"], ["grams", "g"],
    ["kg", "kg"], ["kilogram", "kg"], ["kilograms", "kg"],
    ["oz", "oz"], ["ounce", "oz"], ["ounces", "oz"],
    ["lb", "lb"], ["lbs", "lb"], ["pound", "lb"], ["pounds", "lb"],
    ["ml", "ml"], ["milliliter", "ml"], ["milliliters", "ml"], ["millilitre", "ml"], ["millilitres", "ml"],
    ["cup", "cup"], ["cups", "cup"],
    ["tbsp", "tbsp"], ["tablespoon", "tbsp"], ["tablespoons", "tbsp"],
    ["tsp", "tsp"], ["teaspoon", "tsp"], ["teaspoons", "tsp"],
    ["serving", "serving"], ["servings", "serving"],
    ["item", "item"], ["items", "item"], ["piece", "piece"], ["pieces", "piece"],
    ["slice", "slice"], ["slices", "slice"], ["can", "can"], ["cans", "can"]
]);

const NUMBER_PATTERN = "(?:\\d+(?:\\.\\d+)?|\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|[¼½¾⅓⅔⅛⅜⅝⅞])";
const UNIT_PATTERN = "(?:kg|kilograms?|g|grams?|lbs?|pounds?|oz|ounces?|ml|millilit(?:er|re)s?|cups?|tbsp|tablespoons?|tsp|teaspoons?|servings?|items?|pieces?|slices?|cans?)";
const LEADING_AMOUNT = new RegExp(`^(${NUMBER_PATTERN})\\s*(${UNIT_PATTERN})\\b\\s*(?:of\\s+)?(.+)$`, "i");
const TRAILING_AMOUNT = new RegExp(`^(.+?)\\s*(?:[-–—,:]\\s*)?(${NUMBER_PATTERN})\\s*(${UNIT_PATTERN})$`, "i");
const LEADING_COUNT = new RegExp(`^(${NUMBER_PATTERN})\\s+(.+)$`, "i");

const FRACTIONS = Object.freeze({ "¼": .25, "½": .5, "¾": .75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": .125, "⅜": .375, "⅝": .625, "⅞": .875 });

export function parseIngredientText(value, limit = 20) {
    return String(value || "")
        .split(/\n|;/)
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, limit)
        .map(parseIngredientLine)
        .filter(Boolean);
}

export function parseIngredientLine(value) {
    const original = String(value || "").trim();
    const line = original
        .replace(/^\s*(?:[-*•▪◦]|\d+[.)])\s*/, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!line) return null;

    let match = line.match(LEADING_AMOUNT);
    if (match) return ingredientResult(original, match[3], match[1], match[2], false);
    match = line.match(TRAILING_AMOUNT);
    if (match) return ingredientResult(original, match[1], match[2], match[3], false);
    match = line.match(LEADING_COUNT);
    if (match) return ingredientResult(original, match[2], match[1], "item", true);
    return ingredientResult(original, line, 1, "serving", true);
}

function ingredientResult(original, name, amount, unit, assumed) {
    return {
        original,
        name: cleanIngredientName(name),
        amount: Math.max(.01, numberValue(amount) || 1),
        unit: UNIT_ALIASES.get(String(unit || "").toLowerCase()) || "serving",
        assumed
    };
}

function cleanIngredientName(value) {
    return String(value || "")
        .replace(/^of\s+/i, "")
        .replace(/\s*,?\s*(?:cooked|raw|drained|chopped|diced|sliced|to taste)$/i, "")
        .trim();
}

function numberValue(value) {
    const text = String(value || "").trim();
    if (FRACTIONS[text]) return FRACTIONS[text];
    if (/^\d+\s+\d+\/\d+$/.test(text)) {
        const [whole, fraction] = text.split(/\s+/);
        return Number(whole) + fractionValue(fraction);
    }
    if (/^\d+\/\d+$/.test(text)) return fractionValue(text);
    return Number(text);
}

function fractionValue(value) {
    const [top, bottom] = String(value).split("/").map(Number);
    return bottom ? top / bottom : 0;
}

function normalizedWords(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(" ")
        .filter(word => word.length > 1 && !["and", "with", "the"].includes(word));
}

export function chooseIngredientFood(ingredient, foods) {
    const queryWords = normalizedWords(ingredient?.name);
    if (!queryWords.length) return null;
    const ranked = (Array.isArray(foods) ? foods : [])
        .filter(food => food?.name && Array.isArray(food?.portions) && food.portions.length)
        .map((food, index) => {
            const nameWords = normalizedWords(food.name);
            const brandWords = normalizedWords(food.brand);
            const overlap = queryWords.filter(word => nameWords.includes(word) || brandWords.includes(word)).length;
            const exact = normalizedWords(food.name).join(" ") === queryWords.join(" ");
            const starts = normalizedWords(food.name).join(" ").startsWith(queryWords.join(" "));
            const history = food.previouslyLogged ? 3 : 0;
            return { food, index, score: overlap * 5 + (exact ? 12 : 0) + (starts ? 5 : 0) + history };
        })
        .sort((a, b) => b.score - a.score || a.index - b.index);
    return ranked[0]?.score > 0 ? ranked[0].food : null;
}

export function ingredientPortionSelection(ingredient, food) {
    const portions = Array.isArray(food?.portions) ? food.portions.filter(portion => portion?.nutrition) : [];
    if (!portions.length) return null;
    const unit = ingredient?.unit || "serving";
    const amount = Math.max(.01, Number(ingredient?.amount) || 1);
    const gramTarget = unit === "g" ? amount : unit === "kg" ? amount * 1000 : unit === "oz" ? amount * 28.3495 : unit === "lb" ? amount * 453.592 : 0;
    const volumeTarget = unit === "ml" ? amount : unit === "cup" ? amount * 250 : unit === "tbsp" ? amount * 15 : unit === "tsp" ? amount * 5 : 0;

    if (gramTarget > 0) {
        const candidates = portions.map(portion => ({ portion, basis: portionGrams(portion) })).filter(item => item.basis > 0);
        const best = candidates.sort((a, b) => Math.abs(a.basis - 1) - Math.abs(b.basis - 1))[0];
        if (best) return { portion: best.portion, quantity: gramTarget / best.basis, estimated: false };
    }
    if (volumeTarget > 0) {
        const candidates = portions.map(portion => ({ portion, basis: portionMilliliters(portion) })).filter(item => item.basis > 0);
        const best = candidates.sort((a, b) => Math.abs(a.basis - volumeTarget) - Math.abs(b.basis - volumeTarget))[0];
        if (best) return { portion: best.portion, quantity: volumeTarget / best.basis, estimated: Boolean(best.portion.estimatedVolume) };
    }

    const unitPattern = new RegExp(`\\b${unit === "item" ? "(?:item|piece|breast|fillet|potato|egg|patty|bar|burger|sandwich)" : unit}s?\\b`, "i");
    const matching = portions.find(portion => unitPattern.test(String(portion.label || "")));
    const genericCount = unit === "item" ? portions.find(portion => /^1\s+(?!g\b|mL\b|oz\b|cups?\b|tbsp\b|tsp\b)/i.test(String(portion.label || ""))) : null;
    if (unit === "item" && !matching && !genericCount) return null;
    return { portion: matching || genericCount || portions[0], quantity: amount, estimated: !matching && !genericCount && unit !== "serving" };
}

function portionGrams(portion) {
    if (Number(portion?.grams) > 0) return Number(portion.grams);
    return Number(String(portion?.label || "").match(/(?:^|\()\s*(\d+(?:\.\d+)?)\s*g\b/i)?.[1]) || 0;
}

function portionMilliliters(portion) {
    if (Number(portion?.milliliters) > 0) return Number(portion.milliliters);
    const label = String(portion?.label || "");
    const explicit = Number(label.match(/(?:^|\()\s*(\d+(?:\.\d+)?)\s*mL\b/i)?.[1]);
    if (explicit > 0) return explicit;
    const amount = Number(label.match(/^(\d+(?:\.\d+)?)/)?.[1]) || (label.startsWith("¼") ? .25 : label.startsWith("½") ? .5 : 0);
    if (/\btbsp\b/i.test(label)) return amount * 15;
    if (/\btsp\b/i.test(label)) return amount * 5;
    if (/\bcups?\b/i.test(label)) return amount * 250;
    return 0;
}
