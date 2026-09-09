const NUTRITION_PROFILE_KEY = "level_up_nutrition_profile";
const NUTRITION_GOAL_KEY = "level_up_nutrition_goal";
const NUTRITION_MACRO_KEY = "level_up_nutrition_macro";
const NUTRITION_PLAN_KEY = "level_up_nutrition_plan";

function readObject(key) {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
        const value = JSON.parse(stored);
        return value && typeof value === "object" ? value : null;
    }
    catch {
        return null;
    }
}

export function getNutritionProfile() {
    return readObject(NUTRITION_PROFILE_KEY);
}

export function saveNutritionProfile(profile) {
    localStorage.setItem(NUTRITION_PROFILE_KEY, JSON.stringify(profile));
}

export function getNutritionGoal() {
    return readObject(NUTRITION_GOAL_KEY);
}

export function saveNutritionGoal(goal) {
    localStorage.setItem(NUTRITION_GOAL_KEY, JSON.stringify(goal));
}

export function getNutritionMacroPreference() {
    return readObject(NUTRITION_MACRO_KEY);
}

export function saveNutritionMacroPreference(preference) {
    localStorage.setItem(NUTRITION_MACRO_KEY, JSON.stringify(preference));
}

export function getNutritionPlan() {
    const plan = readObject(NUTRITION_PLAN_KEY);
    const calculated = Number(plan?.calculatedCalories);
    const legacyCurrent = Number(plan?.currentCalories);
    const calories = Number.isFinite(calculated) && calculated > 0
        ? calculated
        : Number.isFinite(legacyCurrent) && legacyCurrent > 0
            ? legacyCurrent
            : null;

    return {
        calculatedCalories: calories,
        // Kept as a compatibility alias for older modules. It is never a separate value.
        currentCalories: calories,
        adjustmentHistory: Array.isArray(plan?.adjustmentHistory)
            ? plan.adjustmentHistory
            : []
    };
}

export function saveNutritionPlan(plan) {
    const requested = Number(plan?.calculatedCalories);
    const legacyRequested = Number(plan?.currentCalories);
    const calories = Number.isFinite(requested) && requested > 0
        ? Math.round(requested)
        : Number.isFinite(legacyRequested) && legacyRequested > 0
            ? Math.round(legacyRequested)
            : null;

    localStorage.setItem(
        NUTRITION_PLAN_KEY,
        JSON.stringify({
            calculatedCalories: calories,
            // Persist the alias temporarily so older app code cannot diverge.
            currentCalories: calories,
            adjustmentHistory: Array.isArray(plan?.adjustmentHistory)
                ? plan.adjustmentHistory
                : []
        })
    );
}

export function syncCalculatedCalories(calculatedCalories) {
    const calories = Math.round(Number(calculatedCalories));
    if (!Number.isFinite(calories) || calories <= 0) {
        return getNutritionPlan();
    }

    const plan = getNutritionPlan();
    const nextPlan = {
        ...plan,
        calculatedCalories: calories,
        currentCalories: calories
    };

    saveNutritionPlan(nextPlan);
    return getNutritionPlan();
}

// Backward-compatible function: any adjustment now changes the single calculated target.
export function setCurrentCalories(newCalories, reason = "Manual adjustment") {
    const calories = Math.round(Number(newCalories));
    if (!Number.isFinite(calories) || calories <= 0) return null;

    const plan = getNutritionPlan();
    const previousCalories = plan.calculatedCalories;

    const nextPlan = {
        calculatedCalories: calories,
        currentCalories: calories,
        adjustmentHistory: [
            ...plan.adjustmentHistory,
            {
                date: new Date().toISOString(),
                previousCalories: Number.isFinite(previousCalories)
                    ? previousCalories
                    : null,
                newCalories: calories,
                reason: String(reason || "Manual adjustment")
            }
        ]
    };

    saveNutritionPlan(nextPlan);
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
    return getNutritionPlan();
}

export function resetCurrentCaloriesToCalculated() {
    return getNutritionPlan();
}

// Calorie Stats hierarchy: the 7D / 4W / 12W control governs Average Calories
// and every range-aware card below it. Keep the control immediately above that
// first governed card even when Calorie Stats re-renders its full panel.
function alignCalorieStatsRangeHierarchy(root = document) {
    const pages = [];
    if (root?.matches?.(".calorie-stats-page")) pages.push(root);
    root?.querySelectorAll?.(".calorie-stats-page").forEach(page => pages.push(page));
    pages.forEach(page => {
        const ranges = page.querySelector(":scope > .calorie-stats-ranges");
        const average = page.querySelector(":scope > .calorie-stat-week");
        if (!ranges || !average || ranges.nextElementSibling === average) return;
        page.insertBefore(ranges, average);
    });
}

function installCalorieStatsHierarchyFix() {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
    let queued = false;
    const schedule = () => {
        if (queued) return;
        queued = true;
        const run = () => {
            queued = false;
            alignCalorieStatsRangeHierarchy(document);
        };
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
        else setTimeout(run, 0);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    schedule();
}

installCalorieStatsHierarchyFix();