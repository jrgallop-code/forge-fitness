export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_TRAINING_DAYS = {
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6]
};

export function normalizeTrainingDays(value) {
    const selected = new Set((Array.isArray(value) ? value : [])
        .map(Number)
        .filter(day => Number.isInteger(day) && day >= 0 && day <= 6));
    return WEEKDAY_ORDER.filter(day => selected.has(day));
}

export function defaultTrainingDays(count) {
    const total = Math.max(2, Math.min(6, Number(count) || 4));
    return [...DEFAULT_TRAINING_DAYS[total]];
}

export function trainingDaysForCount(value, count) {
    const normalized = normalizeTrainingDays(value);
    return normalized.length === Number(count) ? normalized : defaultTrainingDays(count);
}

export function buildWeeklyAssignment(trainingDays, planDayCount) {
    const weekly = Object.fromEntries(Array.from({ length: 7 }, (_, day) => [day, null]));
    normalizeTrainingDays(trainingDays)
        .slice(0, Math.max(0, Number(planDayCount) || 0))
        .forEach((weekday, planDayIndex) => { weekly[weekday] = planDayIndex; });
    return weekly;
}

export function createOnboardingSchedule(plan, preferences, existing = null) {
    if (!plan?.id || !Array.isArray(plan.days) || !plan.days.length) return null;
    const trainingDays = normalizeTrainingDays(preferences?.trainingDays);
    if (!preferences?.onboardingComplete || !trainingDays.length) return null;
    return {
        planId: plan.id,
        weekly: buildWeeklyAssignment(trainingDays, plan.days.length),
        exceptions: existing?.exceptions && typeof existing.exceptions === "object" ? existing.exceptions : {},
        source: "onboarding",
        trainingDays,
        updatedAt: new Date().toISOString()
    };
}
