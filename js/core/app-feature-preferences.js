import { getTrainingPreferences, saveTrainingPreferences } from "./training-preferences.js?v=nutrition-feature-choice-1";

export function isNutritionEnabled() {
    return getTrainingPreferences().nutritionEnabled !== false;
}

export function applyAppFeaturePreferences() {
    const enabled = isNutritionEnabled();
    if (typeof document !== "undefined") document.documentElement.dataset.nutritionEnabled = String(enabled);
    return enabled;
}

export function setNutritionEnabled(enabled) {
    const value = enabled !== false;
    saveTrainingPreferences({ nutritionEnabled: value });
    applyAppFeaturePreferences();
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new window.CustomEvent("levelup:app-features-updated", {
            detail: { nutritionEnabled: value }
        }));
    }
    return value;
}

applyAppFeaturePreferences();
