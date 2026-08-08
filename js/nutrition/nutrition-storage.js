const NUTRITION_PROFILE_KEY = "level_up_nutrition_profile";

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
