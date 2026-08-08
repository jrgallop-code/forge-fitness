const NUTRITION_PROFILE_KEY = "level_up_nutrition_profile";
const NUTRITION_GOAL_KEY = "level_up_nutrition_goal";


export function getNutritionProfile() {
    const stored = localStorage.getItem(NUTRITION_PROFILE_KEY);

    if (!stored) {
        return null;
    }

    try {
        const profile = JSON.parse(stored);
        return profile && typeof profile === "object"
            ? profile
            : null;
    }
    catch {
        return null;
    }
}


export function saveNutritionProfile(profile) {
    localStorage.setItem(
        NUTRITION_PROFILE_KEY,
        JSON.stringify(profile)
    );
}


export function getNutritionGoal() {
    const stored = localStorage.getItem(NUTRITION_GOAL_KEY);

    if (!stored) {
        return null;
    }

    try {
        const goal = JSON.parse(stored);
        return goal && typeof goal === "object"
            ? goal
            : null;
    }
    catch {
        return null;
    }
}


export function saveNutritionGoal(goal) {
    localStorage.setItem(
        NUTRITION_GOAL_KEY,
        JSON.stringify(goal)
    );
}
