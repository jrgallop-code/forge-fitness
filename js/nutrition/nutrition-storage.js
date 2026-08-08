const NUTRITION_PROFILE_KEY = "levelup_nutrition_profile";

export function loadNutritionProfile() {
    const stored = localStorage.getItem(NUTRITION_PROFILE_KEY);

    if (!stored) {
        return null;
    }

    try {
        const parsed = JSON.parse(stored);
        return parsed && typeof parsed === "object" ? parsed : null;
    }
    catch (error) {
        console.error("Could not load nutrition profile:", error);
        return null;
    }
}

export function saveNutritionProfile(profile) {
    localStorage.setItem(
        NUTRITION_PROFILE_KEY,
        JSON.stringify(profile)
    );
}
