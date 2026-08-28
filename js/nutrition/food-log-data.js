export const FOOD_LOG_KEY = "level_up_food_log_v1";
export const CUSTOM_FOODS_KEY = "level_up_custom_foods_v1";
export const SAVED_MEALS_KEY = "level_up_saved_meals_v1";
export const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function readJson(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        return value ?? fallback;
    }
    catch {
        return fallback;
    }
}

export function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function readFoodLog() {
    const value = readJson(FOOD_LOG_KEY, {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function entriesForDate(dateKey) {
    const entries = readFoodLog()[dateKey];
    return Array.isArray(entries) ? entries : [];
}

export function previousDateKey(dateKey) {
    const date = new Date(`${dateKey}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return localDateKey(date);
}

export function saveEntry(dateKey, entry) {
    saveEntries(dateKey, [entry]);
    return entry;
}

export function saveEntries(dateKey, newEntries) {
    const log = readFoodLog();
    const entries = Array.isArray(log[dateKey]) ? log[dateKey] : [];
    const safeEntries = Array.isArray(newEntries) ? newEntries.filter(Boolean) : [];
    log[dateKey] = [...entries, ...safeEntries];
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(log));
    window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: { dateKey } }));
    return safeEntries;
}

export function removeEntry(dateKey, entryId) {
    const log = readFoodLog();
    const entries = Array.isArray(log[dateKey]) ? log[dateKey] : [];
    log[dateKey] = entries.filter(entry => entry?.id !== entryId);
    if (!log[dateKey].length) delete log[dateKey];
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(log));
    window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: { dateKey } }));
}

export function updateEntry(dateKey, entryId, replacement) {
    const log = readFoodLog();
    const entries = Array.isArray(log[dateKey]) ? log[dateKey] : [];
    const index = entries.findIndex(entry => entry?.id === entryId);
    if (index < 0 || !replacement) return null;
    const updated = {
        ...replacement,
        id: entryId,
        createdAt: entries[index]?.createdAt || replacement.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    entries[index] = updated;
    log[dateKey] = entries;
    localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(log));
    window.dispatchEvent(new CustomEvent("levelup:food-log-updated", { detail: { dateKey } }));
    return updated;
}

export function readCustomFoods() {
    const value = readJson(CUSTOM_FOODS_KEY, []);
    return Array.isArray(value) ? value : [];
}

export function saveCustomFood(food) {
    const foods = readCustomFoods();
    const next = [food, ...foods.filter(item => item?.id !== food.id)].slice(0, 100);
    localStorage.setItem(CUSTOM_FOODS_KEY, JSON.stringify(next));
    return food;
}

export function readSavedMeals() {
    const value = readJson(SAVED_MEALS_KEY, []);
    return Array.isArray(value) ? value : [];
}

export function saveSavedMeal(meal) {
    const meals = readSavedMeals();
    const photoDataUrl = /^data:image\/(?:jpeg|png|webp);base64,/i.test(String(meal?.photoDataUrl || ""))
        ? String(meal.photoDataUrl).slice(0, 180000)
        : "";
    const safeMeal = {
        id: meal?.id || crypto.randomUUID(),
        name: String(meal?.name || "My Meal").trim().slice(0, 100),
        items: (Array.isArray(meal?.items) ? meal.items : []).map(item => mealItemSnapshot(item)).filter(Boolean).slice(0, 50),
        photoDataUrl,
        updatedAt: new Date().toISOString()
    };
    const next = [safeMeal, ...meals.filter(item => item?.id !== safeMeal.id)].slice(0, 100);
    localStorage.setItem(SAVED_MEALS_KEY, JSON.stringify(next));
    return safeMeal;
}

export function removeSavedMeal(mealId) {
    const next = readSavedMeals().filter(meal => meal?.id !== mealId);
    localStorage.setItem(SAVED_MEALS_KEY, JSON.stringify(next));
}

export function mealPreview(entries) {
    const items = (Array.isArray(entries) ? entries : []).filter(Boolean);
    if (!items.length) return "No foods";
    const first = String(items[0]?.name || "Food");
    return items.length === 1 ? first : `${first} and ${items.length - 1} more`;
}

export function cloneEntriesForMeal(entries, meal) {
    const safeMeal = MEALS.includes(meal) ? meal : "Snacks";
    return (Array.isArray(entries) ? entries : []).map(entry => ({
        ...mealItemSnapshot(entry),
        id: crypto.randomUUID(),
        meal: safeMeal,
        createdAt: new Date().toISOString()
    }));
}

export function logSavedMeal(dateKey, savedMeal, meal) {
    const entries = cloneEntriesForMeal(savedMeal?.items || [], meal);
    saveEntries(dateKey, entries);
    return entries;
}

function mealItemSnapshot(entry) {
    if (!entry || typeof entry !== "object") return null;
    return {
        source: entry.source || entry.food?.source || "custom",
        catalogueId: entry.catalogueId || entry.food?.catalogueId || null,
        fdcId: entry.fdcId || entry.food?.fdcId || null,
        name: String(entry.name || entry.food?.name || "Food").slice(0, 180),
        brand: String(entry.brand || entry.food?.brand || "").slice(0, 120),
        quantity: Math.max(.01, Number(entry.quantity) || 1),
        servingLabel: String(entry.servingLabel || entry.food?.servingLabel || "1 serving").slice(0, 80),
        nutrition: { ...entry.nutrition },
        food: entry.food ? { ...entry.food } : null
    };
}

export function recentFoods(limit = 8) {
    const all = Object.values(readFoodLog()).flatMap(entries => Array.isArray(entries) ? entries : []);
    const unique = new Map();
    [...all].reverse().forEach(entry => {
        const key = `${entry?.source || "custom"}:${entry?.catalogueId || entry?.fdcId || entry?.name || ""}`;
        if (!unique.has(key) && entry?.food) unique.set(key, entry.food);
    });
    return [...unique.values()].slice(0, limit);
}

function normalizedFoodText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function searchableFoodKey(food) {
    return `${normalizedFoodText(food?.name)}|${normalizedFoodText(food?.brand)}`;
}

function historyMatchScore(food, query) {
    const name = normalizedFoodText(food?.name);
    const brand = normalizedFoodText(food?.brand);
    const needle = normalizedFoodText(query);
    if (!needle) return 0;
    if (name === needle) return 4;
    if (name.startsWith(needle)) return 3;
    if (name.split(" ").some(word => word.startsWith(needle))) return 2;
    if (name.includes(needle) || brand.includes(needle)) return 1;
    return 0;
}

export function matchingLoggedFoods(query, limit = 12) {
    const ranked = new Map();
    let fallbackOrder = 0;
    Object.entries(readFoodLog()).forEach(([dateKey, entries]) => {
        if (!Array.isArray(entries)) return;
        entries.forEach(entry => {
            const food = entry?.food;
            const match = historyMatchScore(food, query);
            if (!food || !match) return;
            const key = searchableFoodKey(food);
            const usedAt = Date.parse(entry.updatedAt || entry.createdAt || `${dateKey}T12:00:00`) || ++fallbackOrder;
            const current = ranked.get(key);
            if (current) {
                current.uses += 1;
                current.lastUsed = Math.max(current.lastUsed, usedAt);
                current.match = Math.max(current.match, match);
            }
            else ranked.set(key, { food, uses: 1, lastUsed: usedAt, match });
        });
    });
    return [...ranked.values()]
        .sort((a, b) => b.match - a.match || b.uses - a.uses || b.lastUsed - a.lastUsed)
        .slice(0, limit)
        .map(item => ({ ...item.food, previouslyLogged: true }));
}

export function prioritizeLoggedFoodMatches(query, databaseFoods = [], limit = 50) {
    const history = matchingLoggedFoods(query, limit);
    const seen = new Set(history.map(searchableFoodKey));
    const remaining = (Array.isArray(databaseFoods) ? databaseFoods : []).filter(food => {
        const key = searchableFoodKey(food);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return [...history, ...remaining].slice(0, limit);
}

export function scaledNutrition(nutrition, quantity = 1) {
    const multiplier = Math.max(0, Number(quantity) || 0);
    return ["calories", "protein", "carbs", "fat", "fiber"].reduce((totals, key) => {
        totals[key] = Math.max(0, Number(nutrition?.[key]) || 0) * multiplier;
        return totals;
    }, {});
}

const CUSTOM_SERVING_UNITS = new Set(["g", "oz", "ml", "cup", "tbsp", "tsp", "serving", "item", "piece", "slice", "bar", "burger", "scoop"]);
const VOLUME_UNIT_ML = Object.freeze({ ml: 1, tsp: 5, tbsp: 15, cup: 250 });
const SMALL_LIQUID_MEASURES = Object.freeze([
    { label: "1 tbsp (15 mL)", milliliters: 15 },
    { label: "1 tsp (5 mL)", milliliters: 5 },
    { label: "1 mL", milliliters: 1 },
    { label: "¼ cup (62.5 mL)", milliliters: 62.5 },
    { label: "1 cup (250 mL)", milliliters: 250 }
]);
const LARGE_LIQUID_MEASURES = Object.freeze([
    { label: "1 cup (250 mL)", milliliters: 250 },
    { label: "½ cup (125 mL)", milliliters: 125 },
    { label: "100 mL", milliliters: 100 },
    { label: "1 tbsp (15 mL)", milliliters: 15 },
    { label: "1 mL", milliliters: 1 }
]);

export function buildCustomFoodPortions({ amount, unit, nutrition }) {
    const safeAmount = Math.max(0.01, Number(amount) || 1);
    const safeUnit = CUSTOM_SERVING_UNITS.has(String(unit || "").toLowerCase()) ? String(unit).toLowerCase() : "serving";
    const grams = safeUnit === "g" ? safeAmount : safeUnit === "oz" ? safeAmount * 28.3495 : 0;
    const milliliters = VOLUME_UNIT_ML[safeUnit] ? safeAmount * VOLUME_UNIT_ML[safeUnit] : 0;
    const label = customServingLabel(safeAmount, safeUnit, grams);
    const portions = [{
        label,
        ...(grams > 0 ? { grams } : {}),
        ...(milliliters > 0 ? { milliliters } : {}),
        nutrition: { ...nutrition }
    }];
    if (grams > 0) {
        const perGram = scaledNutrition(nutrition, 1 / grams);
        if (Math.abs(grams - 100) > .01) portions.push({ label: "100 g", grams: 100, nutrition: scaledNutrition(perGram, 100) });
        if (Math.abs(grams - 1) > .01) portions.push({ label: "1 g", grams: 1, nutrition: perGram });
    }
    if (milliliters > 0) {
        const perMilliliter = scaledNutrition(nutrition, 1 / milliliters);
        const measures = milliliters <= 30 ? SMALL_LIQUID_MEASURES : LARGE_LIQUID_MEASURES;
        measures.forEach(measure => {
            if (portions.some(portion => portion.label.toLowerCase() === measure.label.toLowerCase())) return;
            portions.push({
                label: measure.label,
                milliliters: measure.milliliters,
                nutrition: scaledNutrition(perMilliliter, measure.milliliters)
            });
        });
    }
    return portions;
}

export function withUsefulLiquidPortions(food) {
    const original = Array.isArray(food?.portions) ? food.portions.filter(portion => portion?.label && portion?.nutrition) : [];
    if (!original.length) return food;

    const volumeBasis = original.find(portion => Number(portion?.grams) > 0 && portionVolumeMilliliters(portion) > 0);
    const inferred = inferredLiquidMeasure(food);
    const measuredDensity = volumeBasis ? Number(volumeBasis.grams) / portionVolumeMilliliters(volumeBasis) : 0;
    const density = measuredDensity >= .7 && measuredDensity <= 1.6 ? measuredDensity : inferred?.density;
    if (!(density > 0)) return food;

    const gramBasis = volumeBasis || original.find(portion => Number(portion?.grams) > 0);
    if (!gramBasis) return reorderExistingVolumePortions(food, original);
    const perGram = scaledNutrition(gramBasis.nutrition, 1 / Number(gramBasis.grams));
    const useSmallMeasures = inferred?.small ?? /\b(?:tbsp|tablespoon|tsp|teaspoon)\b/i.test(String(volumeBasis?.label || ""));
    const measures = useSmallMeasures ? SMALL_LIQUID_MEASURES : LARGE_LIQUID_MEASURES;
    const volumePortions = [];
    const usedOriginal = new Set();

    measures.forEach(measure => {
        const existingIndex = original.findIndex((portion, index) =>
            !usedOriginal.has(index) && Math.abs(portionVolumeMilliliters(portion) - measure.milliliters) < .01
        );
        if (existingIndex >= 0) {
            usedOriginal.add(existingIndex);
            volumePortions.push(original[existingIndex]);
            return;
        }
        const grams = measure.milliliters * density;
        volumePortions.push({
            label: measure.label,
            milliliters: measure.milliliters,
            grams: Number(grams.toFixed(3)),
            estimatedVolume: !volumeBasis,
            nutrition: scaledNutrition(perGram, grams)
        });
    });

    original.forEach((portion, index) => {
        if (portionVolumeMilliliters(portion) > 0 && !usedOriginal.has(index)) {
            usedOriginal.add(index);
            volumePortions.push(portion);
        }
    });
    const gramAndItemPortions = original.filter((portion, index) => !usedOriginal.has(index));
    return { ...food, portions: [...volumePortions, ...gramAndItemPortions] };
}

function reorderExistingVolumePortions(food, portions) {
    const volume = portions.filter(portion => portionVolumeMilliliters(portion) > 0);
    if (!volume.length) return food;
    return { ...food, portions: [...volume, ...portions.filter(portion => portionVolumeMilliliters(portion) <= 0)] };
}

function portionVolumeMilliliters(portion) {
    const stored = Number(portion?.milliliters);
    if (Number.isFinite(stored) && stored > 0) return stored;
    const label = String(portion?.label || "").toLowerCase();
    const explicitMl = label.match(/(\d+(?:\.\d+)?)\s*m(?:l|illilit(?:er|re)s?)\b/i);
    if (explicitMl) return Number(explicitMl[1]);
    const amount = label.startsWith("¼") ? .25 : label.startsWith("½") ? .5 : Number(label.match(/^(\d+(?:\.\d+)?)/)?.[1]);
    if (!(amount > 0)) return 0;
    if (/\b(?:tbsp|tablespoons?)\b/.test(label)) return amount * 15;
    if (/\b(?:tsp|teaspoons?)\b/.test(label)) return amount * 5;
    if (/\bcups?\b/.test(label)) return amount * 250;
    return 0;
}

function inferredLiquidMeasure(food) {
    const text = `${food?.name || ""} ${food?.category || ""}`.toLowerCase();
    if (/\b(?:powder|dry mix|drink mix|coffee beans?|ground coffee|tea bags?|cheese|yogurt|ice cream|butter|margarine)\b/.test(text)) return null;
    if (/\bhoney\b/.test(text)) return { density: 1.42, small: true };
    if (/\b(?:maple syrup|corn syrup|molasses|syrup)\b/.test(text)) return { density: 1.33, small: true };
    if (/\b(?:oil|cooking oil)\b/.test(text)) return { density: .92, small: true };
    if (/\b(?:vinegar)\b/.test(text)) return { density: 1.01, small: true };
    if (/\b(?:cream|half[ -]?and[ -]?half|liquid coffee whitener)\b/.test(text)) return { density: 1, small: true };
    if (/\b(?:milk|kefir|liquid egg)\b/.test(text)) return { density: 1.03, small: false };
    if (/\b(?:juice|water|beverage|soft drink|soda|coffee|tea|broth|stock|beer|wine)\b/.test(text)) return { density: 1, small: false };
    return null;
}

function customServingLabel(amount, unit, grams) {
    const amountText = Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
    if (unit === "oz") return `${amountText} oz (${Number(grams.toFixed(1))} g)`;
    if (unit === "ml") return `${amountText} mL`;
    const plural = amount === 1 || ["g", "oz", "tbsp", "tsp"].includes(unit) ? unit : `${unit}s`;
    return `${amountText} ${plural}`;
}


export function totalServingLabel(quantity, servingLabel) {
    const safeQuantity = Math.max(0, Number(quantity) || 0);
    const label = String(servingLabel || "1 serving").trim();
    const leading = label.match(/^(\d+(?:\.\d+)?|¼|½|¾)\s*(.*)$/);
    if (!leading || !(safeQuantity > 0)) return `${formatServingNumber(safeQuantity)} × ${label}`;

    const baseAmount = servingFractionNumber(leading[1]);
    const remainder = String(leading[2] || "").trim();
    const unitMatch = remainder.match(/^(g|gram|grams|ml|milliliter|milliliters|millilitre|millilitres|oz|ounce|ounces)\b/i);
    if (unitMatch) {
        return `${formatServingNumber(safeQuantity * baseAmount)} ${normalizedServingUnit(unitMatch[1])}`;
    }

    const countMatch = remainder.match(/^(serving|item|piece|slice|bar|burger|scoop|cup|tbsp|tablespoon|tsp|teaspoon|sandwich|patty|package|container|bottle|can|packet|bowl)s?\b(.*)$/i);
    if (!countMatch) return `${formatServingNumber(safeQuantity)} × ${label}`;

    const totalAmount = safeQuantity * baseAmount;
    const unit = normalizedServingUnit(countMatch[1]);
    const suffix = totalServingSuffix(countMatch[2], safeQuantity);
    return `${formatServingNumber(totalAmount)} ${pluralServingUnit(unit, totalAmount)}${suffix}`;
}

function totalServingSuffix(value, quantity) {
    const suffix = String(value || "");
    const measure = suffix.match(/\(\s*(\d+(?:\.\d+)?)\s*(g|grams?|ml|millilit(?:er|re)s?|oz|ounces?)\s*\)/i);
    if (!measure) return suffix;
    const total = Number(measure[1]) * quantity;
    return suffix.replace(measure[0], `(${formatServingNumber(total)} ${normalizedServingUnit(measure[2])})`);
}

function servingFractionNumber(value) {
    if (value === "¼") return .25;
    if (value === "½") return .5;
    if (value === "¾") return .75;
    return Number(value) || 0;
}

function normalizedServingUnit(unit) {
    const value = String(unit || "").toLowerCase();
    if (value === "g" || value.startsWith("gram")) return "g";
    if (value === "ml" || value.startsWith("millilit")) return "mL";
    if (value === "oz" || value.startsWith("ounce")) return "oz";
    if (value === "tablespoon") return "tbsp";
    if (value === "teaspoon") return "tsp";
    return value;
}

function pluralServingUnit(unit, amount) {
    if (["g", "mL", "oz", "tbsp", "tsp"].includes(unit) || Math.abs(amount - 1) < .0001) return unit;
    if (unit.endsWith("y")) return `${unit.slice(0, -1)}ies`;
    return `${unit}s`;
}

function formatServingNumber(value) {
    const rounded = Math.round((Number(value) || 0) * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function summarizeEntries(entries) {
    return (Array.isArray(entries) ? entries : []).reduce((totals, entry) => {
        const nutrition = entry?.nutrition || {};
        Object.keys(totals).forEach(key => {
            totals[key] += Math.max(0, Number(nutrition[key]) || 0);
        });
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

export function createLogEntry({ meal, food, portion, quantity }) {
    const safeMeal = MEALS.includes(meal) ? meal : "Snacks";
    const safeQuantity = Math.max(0.01, Math.min(10000, Number(quantity) || 1));
    return {
        id: crypto.randomUUID(),
        meal: safeMeal,
        source: food.source || "custom",
        catalogueId: food.catalogueId || null,
        fdcId: food.fdcId || null,
        name: String(food.name || "Food").slice(0, 180),
        brand: String(food.brand || "").slice(0, 120),
        quantity: safeQuantity,
        servingLabel: String(portion?.label || food.servingLabel || "1 serving").slice(0, 80),
        nutrition: scaledNutrition(portion?.nutrition || food.nutrition, safeQuantity),
        food,
        createdAt: new Date().toISOString()
    };
}
