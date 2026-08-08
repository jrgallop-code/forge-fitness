export const ACTIVITY_LEVELS = {
    sedentary: {
        label: "Sedentary",
        multiplier: 1.2,
        description: "Mostly seated with little structured exercise."
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


export function calculateBmr({
    age,
    sex,
    heightCm,
    weightKg
}) {
    const base =
        (10 * weightKg) +
        (6.25 * heightCm) -
        (5 * age);

    if (sex === "male") {
        return base + 5;
    }

    if (sex === "female") {
        return base - 161;
    }

    // If sex is not specified, use the midpoint of the two equation constants.
    return base - 78;
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


export function poundsToKg(pounds) {
    return pounds * 0.45359237;
}


export function inchesToCm(inches) {
    return inches * 2.54;
}


export function calculateAdultGoalTarget({
    tdee,
    weightLb,
    goal,
    ratePercent
}) {
    if (goal === "maintain") {
        return {
            calories: Math.round(tdee),
            weeklyWeightChangeLb: 0
        };
    }

    const weeklyChangeLb =
        weightLb *
        (ratePercent / 100);

    const estimatedDailyEnergyChange =
        (weeklyChangeLb * 3500) / 7;

    if (goal === "cut") {
        return {
            calories: Math.max(
                1200,
                Math.round(tdee - estimatedDailyEnergyChange)
            ),
            weeklyWeightChangeLb: -weeklyChangeLb
        };
    }

    if (goal === "bulk") {
        return {
            calories: Math.round(
                tdee + estimatedDailyEnergyChange
            ),
            weeklyWeightChangeLb: weeklyChangeLb
        };
    }

    return {
        calories: Math.round(tdee),
        weeklyWeightChangeLb: 0
    };
}
