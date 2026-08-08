const NUTRITION_PROFILE_KEY = "level_up_nutrition_profile";
const NUTRITION_GOAL_KEY = "level_up_nutrition_goal";
const NUTRITION_MACRO_KEY = "level_up_nutrition_macro";
const NUTRITION_PLAN_KEY = "level_up_nutrition_plan";


function readObject(key) {
    const stored = localStorage.getItem(key);

    if (!stored) {
        return null;
    }

    try {
        const value = JSON.parse(stored);
        return value && typeof value === "object"
            ? value
            : null;
    }
    catch {
        return null;
    }
}


export function getNutritionProfile() {
    return readObject(NUTRITION_PROFILE_KEY);
}


export function saveNutritionProfile(profile) {
    localStorage.setItem(
        NUTRITION_PROFILE_KEY,
        JSON.stringify(profile)
    );
}


export function getNutritionGoal() {
    return readObject(NUTRITION_GOAL_KEY);
}


export function saveNutritionGoal(goal) {
    localStorage.setItem(
        NUTRITION_GOAL_KEY,
        JSON.stringify(goal)
    );
}


export function getNutritionMacroPreference() {
    return readObject(NUTRITION_MACRO_KEY);
}


export function saveNutritionMacroPreference(preference) {
    localStorage.setItem(
        NUTRITION_MACRO_KEY,
        JSON.stringify(preference)
    );
}


export function getNutritionPlan() {
    const plan = readObject(NUTRITION_PLAN_KEY);

    if (!plan) {
        return {
            calculatedCalories: null,
            currentCalories: null,
            adjustmentHistory: []
        };
    }

    return {
        calculatedCalories:
            Number.isFinite(Number(plan.calculatedCalories))
                ? Number(plan.calculatedCalories)
                : null,
        currentCalories:
            Number.isFinite(Number(plan.currentCalories))
                ? Number(plan.currentCalories)
                : null,
        adjustmentHistory:
            Array.isArray(plan.adjustmentHistory)
                ? plan.adjustmentHistory
                : []
    };
}


export function saveNutritionPlan(plan) {
    localStorage.setItem(
        NUTRITION_PLAN_KEY,
        JSON.stringify({
            calculatedCalories:
                Number.isFinite(Number(plan.calculatedCalories))
                    ? Number(plan.calculatedCalories)
                    : null,
            currentCalories:
                Number.isFinite(Number(plan.currentCalories))
                    ? Number(plan.currentCalories)
                    : null,
            adjustmentHistory:
                Array.isArray(plan.adjustmentHistory)
                    ? plan.adjustmentHistory
                    : []
        })
    );
}


export function syncCalculatedCalories(calculatedCalories) {
    const calories = Number(calculatedCalories);

    if (!Number.isFinite(calories) || calories <= 0) {
        return getNutritionPlan();
    }

    const plan = getNutritionPlan();
    const hadManualAdjustment =
        plan.adjustmentHistory.length > 0 &&
        Number.isFinite(plan.currentCalories);

    const nextPlan = {
        ...plan,
        calculatedCalories: Math.round(calories),
        currentCalories: hadManualAdjustment
            ? plan.currentCalories
            : Math.round(calories)
    };

    saveNutritionPlan(nextPlan);
    return nextPlan;
}


export function setCurrentCalories(newCalories, reason = "Manual adjustment") {
    const calories = Math.round(Number(newCalories));

    if (!Number.isFinite(calories) || calories <= 0) {
        return null;
    }

    const plan = getNutritionPlan();
    const previousCalories =
        Number.isFinite(plan.currentCalories)
            ? plan.currentCalories
            : plan.calculatedCalories;

    const nextPlan = {
        ...plan,
        currentCalories: calories,
        adjustmentHistory: [
            ...plan.adjustmentHistory,
            {
                date: new Date().toISOString(),
                previousCalories:
                    Number.isFinite(previousCalories)
                        ? previousCalories
                        : null,
                newCalories: calories,
                reason: String(reason || "Manual adjustment")
            }
        ]
    };

    saveNutritionPlan(nextPlan);

    window.dispatchEvent(
        new CustomEvent("levelup:nutrition-updated")
    );

    return nextPlan;
}


export function resetCurrentCaloriesToCalculated() {
    const plan = getNutritionPlan();

    if (!Number.isFinite(plan.calculatedCalories)) {
        return null;
    }

    return setCurrentCalories(
        plan.calculatedCalories,
        "Reset to calculated target"
    );
}
