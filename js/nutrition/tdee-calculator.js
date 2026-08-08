export const ACTIVITY_LEVELS = {
    sedentary: {
        label: "Sedentary",
        multiplier: 1.2,
        description: "Mostly seated with little planned activity."
    },
    light: {
        label: "Lightly Active",
        multiplier: 1.375,
        description: "Light activity or training about 1–3 days per week."
    },
    moderate: {
        label: "Moderately Active",
        multiplier: 1.55,
        description: "Regular training about 3–5 days per week."
    },
    very: {
        label: "Very Active",
        multiplier: 1.725,
        description: "Hard training most days plus an active lifestyle."
    },
    athlete: {
        label: "Athlete / Very High Activity",
        multiplier: 1.9,
        description: "High-volume training and/or a very physically active lifestyle."
    }
};


export const GOAL_PRESETS = {
    maintain: {
        label: "Maintain",
        dailyCalorieAdjustment: 0,
        weeklyWeightChangeLb: 0,
        description: "Stay close to estimated maintenance calories."
    },
    cut_gentle: {
        label: "Fat Loss — Gentle",
        dailyCalorieAdjustment: -250,
        weeklyWeightChangeLb: -0.5,
        description: "Targets about 0.5 lb/week using an estimated 250 kcal/day deficit."
    },
    cut_moderate: {
        label: "Fat Loss — Moderate",
        dailyCalorieAdjustment: -500,
        weeklyWeightChangeLb: -1,
        description: "Targets about 1.0 lb/week using an estimated 500 kcal/day deficit."
    },
    bulk_conservative: {
        label: "Lean Bulk — Conservative",
        dailyCalorieAdjustment: 125,
        weeklyWeightChangeLb: 0.25,
        description: "Targets about 0.25 lb/week using an estimated 125 kcal/day surplus."
    },
    bulk_standard: {
        label: "Lean Bulk — Standard",
        dailyCalorieAdjustment: 250,
        weeklyWeightChangeLb: 0.5,
        description: "Targets about 0.5 lb/week using an estimated 250 kcal/day surplus."
    }
};


export const MACRO_PRESETS = {
    balanced: {
        label: "Balanced",
        fatShare: 0.30,
        description: "A general-purpose split with moderate carbohydrate and fat intake."
    },
    higher_carb: {
        label: "Higher Carb",
        fatShare: 0.25,
        description: "Allocates more of the remaining calories to carbohydrate for training fuel."
    },
    higher_fat: {
        label: "Higher Fat",
        fatShare: 0.35,
        description: "Allocates more of the remaining calories to dietary fat while keeping protein fixed."
    }
};


export const PROTEIN_GRAMS_PER_KG = 1.6;


export function calculateBmr({ age, sex, heightCm, weightKg }) {
    const base =
        (10 * weightKg) +
        (6.25 * heightCm) -
        (5 * age);

    if (sex === "male") {
        return base + 5;
    }

    return base - 161;
}


export function calculateTdee(profile) {
    const activity =
        ACTIVITY_LEVELS[profile.activity] ||
        ACTIVITY_LEVELS.moderate;

    const bmr = calculateBmr(profile);
    const tdee = bmr * activity.multiplier;

    return {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        activityMultiplier: activity.multiplier
    };
}


export function calculateGoalCalories(tdee, goalId) {
    const goal = GOAL_PRESETS[goalId];

    if (!goal || !Number.isFinite(tdee) || tdee <= 0) {
        return null;
    }

    return {
        goalId,
        label: goal.label,
        dailyCalorieAdjustment: goal.dailyCalorieAdjustment,
        weeklyWeightChangeLb: goal.weeklyWeightChangeLb,
        calories: Math.round(tdee + goal.dailyCalorieAdjustment),
        description: goal.description
    };
}


export function calculateProteinTarget(weightKg) {
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
        return null;
    }

    return Math.round(
        weightKg * PROTEIN_GRAMS_PER_KG
    );
}


export function calculateMacroTargets({
    calories,
    weightKg,
    macroPreset = "balanced"
}) {
    const preset =
        MACRO_PRESETS[macroPreset] ||
        MACRO_PRESETS.balanced;

    if (
        !Number.isFinite(calories) ||
        calories <= 0 ||
        !Number.isFinite(weightKg) ||
        weightKg <= 0
    ) {
        return null;
    }

    const protein =
        calculateProteinTarget(weightKg);

    const proteinCalories =
        protein * 4;

    const fatCalories =
        calories * preset.fatShare;

    const fat =
        Math.round(fatCalories / 9);

    const carbohydrateCalories =
        calories -
        proteinCalories -
        fatCalories;

    if (carbohydrateCalories < 0) {
        return null;
    }

    const carbs =
        Math.round(carbohydrateCalories / 4);

    return {
        calories: Math.round(calories),
        protein,
        carbs,
        fat,
        proteinGramsPerKg: PROTEIN_GRAMS_PER_KG,
        macroPreset,
        macroPresetLabel: preset.label,
        macroPresetDescription: preset.description
    };
}


export function poundsToKg(pounds) {
    return pounds * 0.45359237;
}


export function feetAndInchesToCm(feet, inches) {
    return ((feet * 12) + inches) * 2.54;
}
