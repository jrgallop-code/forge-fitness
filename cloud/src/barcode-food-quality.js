const ZERO_CALORIE_PATTERN = /\b(?:water|sparkling water|seltzer|club soda|diet soda|zero sugar|sugar[- ]?free drink|black coffee|unsweetened tea|vinegar|salt)\b/i;
const NON_MACRO_ENERGY_PATTERN = /\b(?:beer|wine|vodka|whisky|whiskey|rum|gin|tequila|liqueur|spirit|alcohol)\b/i;

export function isPlausibleZeroCalorieFood(food) {
    return ZERO_CALORIE_PATTERN.test(`${food?.name || ""} ${food?.brand || ""} ${food?.category || ""}`);
}

function finiteNutrition(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function comparableNutrition(food) {
    const portions = Array.isArray(food?.portions) ? food.portions : [];
    const portion = portions.find(item => item?.nutrition && Number(item?.grams) > 0) || portions.find(item => item?.nutrition);
    if (!portion) return null;
    const nutrition = {
        calories: finiteNutrition(portion.nutrition?.calories),
        protein: finiteNutrition(portion.nutrition?.protein),
        carbs: finiteNutrition(portion.nutrition?.carbs),
        fat: finiteNutrition(portion.nutrition?.fat),
        fiber: finiteNutrition(portion.nutrition?.fiber)
    };
    const grams = finiteNutrition(portion.grams);
    if (grams > 0) {
        const multiplier = 100 / grams;
        Object.keys(nutrition).forEach(key => {
            if (nutrition[key] !== null) nutrition[key] *= multiplier;
        });
    }
    return { portion, nutrition, grams: grams || 0 };
}

export function assessBarcodeFood(food, options = {}) {
    const flags = [];
    const comparable = comparableNutrition(food);
    if (!food?.name || !comparable) return { usable: false, score: -1000, flags: ["missing_nutrition"] };

    const { nutrition, grams } = comparable;
    const calories = nutrition.calories ?? 0;
    const protein = nutrition.protein ?? 0;
    const carbs = nutrition.carbs ?? 0;
    const fat = nutrition.fat ?? 0;
    const macroTotal = protein + carbs + fat;
    const plausibleZero = isPlausibleZeroCalorieFood(food);
    const nonMacroEnergy = NON_MACRO_ENERGY_PATTERN.test(`${food.name || ""} ${food.brand || ""} ${food.category || ""}`);

    if (calories === 0 && macroTotal === 0 && !plausibleZero) flags.push("all_nutrition_zero");
    if (calories > 5 && macroTotal === 0 && !nonMacroEnergy) flags.push("calories_without_macros");
    if (grams > 0 && macroTotal > 105) flags.push("macros_exceed_serving_mass");

    const macroCalories = protein * 4 + carbs * 4 + fat * 9;
    if (calories > 0 && macroCalories > 0 && !nonMacroEnergy) {
        const difference = Math.abs(calories - macroCalories);
        if (difference > Math.max(25, calories * 0.4)) flags.push("calorie_macro_mismatch");
    }

    const fatal = flags.some(flag => ["all_nutrition_zero", "calories_without_macros", "macros_exceed_serving_mass"].includes(flag));
    const sourceScores = { levelup: 100, fatsecret: 34, usda: 28, openfoodfacts: 16 };
    let score = sourceScores[String(food.source || "").toLowerCase()] || 8;
    if (options.trusted) score += 100;
    if (food.barcode) score += 12;
    if (grams > 0) score += 10;
    if (food.detailsLoaded) score += 5;
    if (protein > 0) score += 3;
    if (carbs > 0) score += 3;
    if (fat > 0) score += 3;
    if (calories > 0 || plausibleZero) score += 8;
    if (options.countryCode && String(food.countryCode || "").toUpperCase() === String(options.countryCode).toUpperCase()) score += 5;
    score -= flags.length * 25;

    return { usable: !fatal, score, flags, comparable };
}

function foodKey(food) {
    const text = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const first = comparableNutrition(food);
    const nutrition = first?.nutrition || {};
    const signature = ["calories", "protein", "carbs", "fat"]
        .map(key => Math.round((Number(nutrition[key]) || 0) * 10) / 10)
        .join("|");
    return `${text(food?.name)}|${text(food?.brand)}|${signature}`;
}

export function rankBarcodeFoods(foods, options = {}) {
    const seen = new Set();
    return (Array.isArray(foods) ? foods : [])
        .map(food => ({ food, quality: assessBarcodeFood(food, options) }))
        .filter(item => item.quality.usable)
        .sort((a, b) => b.quality.score - a.quality.score)
        .filter(item => {
            const key = foodKey(item.food);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

export function barcodeFoodsMateriallyDisagree(first, second) {
    const left = comparableNutrition(first)?.nutrition;
    const right = comparableNutrition(second)?.nutrition;
    if (!left || !right) return false;
    return ["calories", "protein", "carbs", "fat"].some(key => {
        const a = Number(left[key]) || 0;
        const b = Number(right[key]) || 0;
        const floor = key === "calories" ? 20 : 2;
        return Math.abs(a - b) > Math.max(floor, Math.max(a, b) * 0.2);
    });
}

export function barcodeFoodResponse(foods, options = {}) {
    const ranked = rankBarcodeFoods(foods, options);
    if (!ranked.length) return null;
    const best = ranked[0];
    const alternatives = ranked.slice(1).filter(item => barcodeFoodsMateriallyDisagree(best.food, item.food));
    return {
        food: best.food,
        candidates: alternatives.length ? [best.food, ...alternatives.map(item => item.food)].slice(0, 4) : [],
        qualityWarnings: best.quality.flags
    };
}
