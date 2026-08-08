const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";
const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const GOAL_WEIGHT_STORAGE_KEY = "level_up_goal_weight";
const PROFILE_KEY = "level_up_nutrition_profile";
const PLAN_KEY = "level_up_nutrition_plan";

export function initializeManualGoalSync() {
    refreshManualGoalDisplays();
    window.addEventListener("levelup:nutrition-updated", refreshManualGoalDisplays);
}

function refreshManualGoalDisplays() {
    syncWeightGoalRate();
    syncProjection();
}

function syncWeightGoalRate() {
    const custom = getCustomRate();
    if (custom === null) return;
    const element = document.getElementById("goal-weekly-weight-change");
    if (element) element.textContent = formatRate(custom);
}

function syncProjection() {
    const rateElement = document.getElementById("projection-weekly-rate");
    const caloriesElement = document.getElementById("projection-active-calories");
    const weeksElement = document.getElementById("projection-weeks");
    const dateElement = document.getElementById("projection-date");
    if (!rateElement && !caloriesElement) return;

    const profile = readObject(PROFILE_KEY);
    const plan = readObject(PLAN_KEY);
    if (!profile || Number(profile.age) < 18) return;

    const estimatedMaintenance = calculateEstimatedTdee(profile);
    const manualMaintenance = getManualMaintenance();
    const workingMaintenance = manualMaintenance ?? estimatedMaintenance;
    const activeCalories = Number(plan?.currentCalories);

    if (!Number.isFinite(workingMaintenance) || !Number.isFinite(activeCalories)) return;

    const projectedRate = ((activeCalories - workingMaintenance) * 7) / 3500;
    if (caloriesElement) caloriesElement.textContent = `${Math.round(activeCalories)} kcal/day`;
    if (rateElement) rateElement.textContent = Math.abs(projectedRate) < 0.05 ? "~0 lb/wk" : formatRate(projectedRate);

    const goalWeight = Number(localStorage.getItem(GOAL_WEIGHT_STORAGE_KEY));
    const currentWeight = getCurrentWeight(profile);
    if (!Number.isFinite(goalWeight) || goalWeight <= 0 || !Number.isFinite(currentWeight) || Math.abs(projectedRate) < 0.05) return;

    const movingTowardGoal =
        (projectedRate < 0 && goalWeight < currentWeight) ||
        (projectedRate > 0 && goalWeight > currentWeight);

    if (!movingTowardGoal) return;

    const weeks = Math.abs(goalWeight - currentWeight) / Math.abs(projectedRate);
    if (weeksElement) weeksElement.textContent = `${weeks.toFixed(1)} weeks`;
    if (dateElement) {
        const date = new Date();
        date.setDate(date.getDate() + Math.ceil(weeks * 7));
        dateElement.textContent = date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
}

function getCurrentWeight(profile) {
    try {
        const entries = JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]");
        if (Array.isArray(entries)) {
            const valid = entries.map(item => Number(item?.weight)).filter(value => Number.isFinite(value) && value > 0);
            if (valid.length) {
                const recent = valid.slice(-7);
                return recent.reduce((sum, value) => sum + value, 0) / recent.length;
            }
        }
    } catch {}
    const profileWeight = Number(profile?.weightLb);
    return Number.isFinite(profileWeight) ? profileWeight : null;
}

function getManualMaintenance() {
    const value = Number(localStorage.getItem(MANUAL_MAINTENANCE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
}

function getCustomRate() {
    const raw = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);
    if (raw === null || raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

function calculateEstimatedTdee(profile) {
    const age = Number(profile.age);
    const weightKg = Number(profile.weightKg ?? (Number(profile.weightLb) * 0.45359237));
    const heightCm = Number(profile.heightCm ?? (((Number(profile.heightFeet) || 0) * 12 + (Number(profile.heightInches) || 0)) * 2.54));
    if (![age, weightKg, heightCm].every(Number.isFinite)) return null;
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const bmr = profile.sex === "male" ? base + 5 : base - 161;
    const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, athlete: 1.9 };
    return Math.round(bmr * (multipliers[profile.activity] || 1.55));
}

function readObject(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
}

function formatRate(value) {
    return `${value > 0 ? "+" : ""}${Number(value).toFixed(2)} lb/wk`;
}
