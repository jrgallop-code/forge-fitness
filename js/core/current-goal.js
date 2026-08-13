import { calculateWeightTrend, normalizeWeightEntries } from "./weight-trend.js?v=current-goal-1";

const CURRENT_GOAL_KEY = "level_up_current_goal";
const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const LEGACY_GOAL_WEIGHT_KEY = "level_up_goal_weight";
const LEGACY_NUTRITION_GOAL_KEY = "level_up_nutrition_goal";
const NUTRITION_PLAN_KEY = "level_up_nutrition_plan";
const DAY_MS = 86400000;

export const CURRENT_GOAL_TYPES = {
    fat_loss: "Fat Loss",
    muscle_gain: "Build Muscle",
    maintenance: "Maintain"
};

export function getCurrentGoal() {
    const stored = readObject(CURRENT_GOAL_KEY);
    if (stored?.id && stored?.type && !stored.endDate && stored.status !== "archived") {
        return normalizeGoal(stored);
    }
    return migrateLegacyGoal();
}

export function startCurrentGoal(input = {}) {
    const type = normalizeType(input.type);
    const trendWeight = getCurrentTrendWeight();
    const targetWeight = Number(input.targetWeight);
    const ratePct = type === "maintenance" ? 0 : signedRatePct(type, Number(input.targetRatePctPerWeek ?? input.ratePct));

    if (!type || !Number.isFinite(trendWeight) || trendWeight <= 0 || !Number.isFinite(targetWeight) || targetWeight <= 0 || !Number.isFinite(ratePct)) {
        return null;
    }
    if (type === "fat_loss" && targetWeight >= trendWeight) return null;
    if (type === "muscle_gain" && targetWeight <= trendWeight) return null;

    const today = localDate();
    archiveActiveGoal(today);

    const plan = readObject(NUTRITION_PLAN_KEY) || {};
    const startingCalories = validCalories(plan.calculatedCalories ?? plan.currentCalories);
    const targetRateLbPerWeek = trendWeight * (ratePct / 100);
    const goal = {
        id: `goal-${Date.now()}`,
        type,
        startDate: today,
        startingTrendWeight: round(trendWeight, 2),
        targetWeight: round(targetWeight, 2),
        targetRatePctPerWeek: round(ratePct, 3),
        targetRateLbPerWeek: round(targetRateLbPerWeek, 2),
        trainingExperience: type === "muscle_gain" ? normalizeExperience(input.trainingExperience) : null,
        startingCalories,
        status: "active",
        endDate: null,
        createdAt: new Date().toISOString()
    };

    localStorage.setItem(CURRENT_GOAL_KEY, JSON.stringify(goal));
    syncLegacyCompatibility(goal);
    appendPhaseForGoal(goal);
    notifyGoalUpdated();
    return goal;
}

export function startMaintenanceAtCurrentTrend() {
    const trendWeight = getCurrentTrendWeight();
    if (!Number.isFinite(trendWeight)) return null;
    return startCurrentGoal({ type: "maintenance", targetWeight: trendWeight, targetRatePctPerWeek: 0 });
}

export function getCurrentGoalMetrics(goal = getCurrentGoal()) {
    const allEntries = readWeightEntries();
    const trendWeight = getCurrentTrendWeight(allEntries);
    const fullTrend = calculateWeightTrend(allEntries);
    if (!goal) {
        return {
            goal: null,
            trendWeight,
            fullTrend,
            phaseTrend: null,
            actualRateLbPerWeek: fullTrend.weeklyChange,
            actualRatePctPerWeek: percentRate(fullTrend.weeklyChange, trendWeight),
            targetRateLbPerWeek: null,
            targetRatePctPerWeek: null,
            estimatedGoalDate: null,
            status: "NO GOAL",
            goalReached: false
        };
    }

    const phaseEntries = allEntries.filter(entry => entry.date >= goal.startDate && (!goal.endDate || entry.date <= goal.endDate));
    const phaseTrend = calculateWeightTrend(phaseEntries);
    const actualRateLbPerWeek = phaseTrend.weeklyChange;
    const actualRatePctPerWeek = percentRate(actualRateLbPerWeek, trendWeight);
    const targetRatePctPerWeek = Number(goal.targetRatePctPerWeek);
    const targetRateLbPerWeek = Number.isFinite(trendWeight)
        ? trendWeight * (targetRatePctPerWeek / 100)
        : Number(goal.targetRateLbPerWeek);
    const goalReached = hasReachedGoal(goal, trendWeight);
    const status = calculateStatus(goal, phaseTrend, actualRatePctPerWeek, goalReached);

    return {
        goal,
        trendWeight,
        fullTrend,
        phaseTrend,
        actualRateLbPerWeek,
        actualRatePctPerWeek,
        targetRateLbPerWeek,
        targetRatePctPerWeek,
        estimatedGoalDate: projectGoalDate(goal, trendWeight),
        status,
        goalReached
    };
}

export function getCurrentTrendWeight(entries = readWeightEntries()) {
    const normalized = normalizeWeightEntries(entries);
    if (!normalized.length) return null;
    const latest = normalized.at(-1);
    const latestTime = dateMs(latest.date);
    const cutoff = latestTime - (6 * DAY_MS);
    const recent = normalized.filter(entry => {
        const time = dateMs(entry.date);
        return time >= cutoff && time <= latestTime;
    });
    if (!recent.length) return latest.weight;
    return recent.reduce((sum, entry) => sum + entry.weight, 0) / recent.length;
}

export function readWeightEntries() {
    try {
        const parsed = JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]");
        return normalizeWeightEntries(parsed);
    } catch {
        return [];
    }
}

export function getGoalHistory() {
    const phases = readArray(PHASES_KEY);
    return [...phases]
        .filter(phase => phase?.startDate)
        .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))
        .map(phase => ({
            id: phase.goalId || phase.id,
            type: goalTypeFromPhase(phase.type),
            startDate: phase.startDate,
            endDate: phase.endDate || null,
            startWeight: finiteOrNull(phase.startingTrendWeight ?? phase.startWeight),
            endWeight: finiteOrNull(phase.endTrendWeight ?? phase.endWeight),
            targetWeight: finiteOrNull(phase.targetWeight),
            targetRatePctPerWeek: finiteOrNull(phase.targetRatePctPerWeek)
        }));
}

export function getRecommendedCalories(maintenanceCalories, goal = getCurrentGoal()) {
    const maintenance = Number(maintenanceCalories);
    if (!goal || !Number.isFinite(maintenance) || maintenance <= 0) return null;
    const metrics = getCurrentGoalMetrics(goal);
    const rateLb = Number(metrics.targetRateLbPerWeek);
    if (!Number.isFinite(rateLb)) return null;
    return Math.round(maintenance + ((rateLb * 3500) / 7));
}

function migrateLegacyGoal() {
    const goalWeight = Number(localStorage.getItem(LEGACY_GOAL_WEIGHT_KEY));
    const legacyNutritionGoal = readObject(LEGACY_NUTRITION_GOAL_KEY);
    const phases = readArray(PHASES_KEY);
    const activePhase = [...phases].reverse().find(phase => phase && !phase.endDate) || null;
    const type = goalTypeFromLegacy(activePhase?.type, legacyNutritionGoal?.goalId);
    const trendWeight = getCurrentTrendWeight();

    if (!type || !Number.isFinite(trendWeight) || trendWeight <= 0) return null;
    const targetWeight = Number.isFinite(goalWeight) && goalWeight > 0
        ? goalWeight
        : type === "maintenance"
            ? trendWeight
            : null;
    if (!Number.isFinite(targetWeight)) return null;

    const legacyRateLb = finiteOrNull(activePhase?.targetWeeklyRate) ?? legacyPresetRate(legacyNutritionGoal?.goalId);
    const fallbackPct = type === "fat_loss" ? -0.5 : type === "muscle_gain" ? 0.3 : 0;
    const ratePct = Number.isFinite(legacyRateLb) && Math.abs(legacyRateLb) > 0
        ? (legacyRateLb / trendWeight) * 100
        : fallbackPct;
    const plan = readObject(NUTRITION_PLAN_KEY) || {};
    const startingCalories = finiteOrNull(activePhase?.startCalories) ?? validCalories(plan.calculatedCalories ?? plan.currentCalories);
    const goal = {
        id: activePhase?.goalId || `goal-migrated-${Date.now()}`,
        type,
        startDate: activePhase?.startDate || localDate(),
        startingTrendWeight: finiteOrNull(activePhase?.startingTrendWeight ?? activePhase?.startWeight) ?? round(trendWeight, 2),
        targetWeight: round(targetWeight, 2),
        targetRatePctPerWeek: round(signedRatePct(type, ratePct), 3),
        targetRateLbPerWeek: round(trendWeight * (signedRatePct(type, ratePct) / 100), 2),
        trainingExperience: type === "muscle_gain" ? "intermediate" : null,
        startingCalories,
        status: "active",
        endDate: null,
        createdAt: activePhase?.createdAt || legacyNutritionGoal?.updatedAt || new Date().toISOString(),
        migratedFromLegacy: true
    };

    localStorage.setItem(CURRENT_GOAL_KEY, JSON.stringify(goal));
    syncLegacyCompatibility(goal);
    if (!activePhase) appendPhaseForGoal(goal);
    return goal;
}

function archiveActiveGoal(endDate) {
    const current = readObject(CURRENT_GOAL_KEY);
    if (current?.id && !current.endDate) {
        localStorage.setItem(CURRENT_GOAL_KEY, JSON.stringify({ ...current, endDate, status: "archived" }));
    }
    const phases = readArray(PHASES_KEY);
    let changed = false;
    phases.forEach(phase => {
        if (!phase?.endDate) {
            phase.endDate = endDate;
            const endTrend = getCurrentTrendWeight(readWeightEntries().filter(entry => entry.date <= endDate));
            if (Number.isFinite(endTrend)) phase.endTrendWeight = round(endTrend, 2);
            changed = true;
        }
    });
    if (changed) localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
}

function appendPhaseForGoal(goal) {
    const phases = readArray(PHASES_KEY);
    phases.push({
        id: `phase-${Date.now()}`,
        goalId: goal.id,
        type: phaseTypeFromGoal(goal.type),
        startDate: goal.startDate,
        endDate: null,
        startWeight: goal.startingTrendWeight,
        startingTrendWeight: goal.startingTrendWeight,
        targetWeight: goal.targetWeight,
        targetWeeklyRate: goal.targetRateLbPerWeek,
        targetRatePctPerWeek: goal.targetRatePctPerWeek,
        trainingExperience: goal.trainingExperience,
        startCalories: goal.startingCalories,
        createdAt: goal.createdAt
    });
    localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
}

function syncLegacyCompatibility(goal) {
    localStorage.setItem(LEGACY_GOAL_WEIGHT_KEY, String(goal.targetWeight));
    const goalId = legacyGoalId(goal);
    localStorage.setItem(LEGACY_NUTRITION_GOAL_KEY, JSON.stringify({ goalId, updatedAt: new Date().toISOString(), source: "current-goal" }));
}

function legacyGoalId(goal) {
    if (goal.type === "maintenance") return "maintain";
    const rate = Math.abs(Number(goal.targetRateLbPerWeek));
    if (goal.type === "fat_loss") return rate >= 0.75 ? "cut_moderate" : "cut_gentle";
    return rate >= 0.4 ? "bulk_standard" : "bulk_conservative";
}

function calculateStatus(goal, trend, actualPct, goalReached) {
    if (goalReached) return "GOAL REACHED";
    if (trend?.status !== "actual" || !Number.isFinite(actualPct)) return "CALIBRATING";
    if (goal.type === "maintenance") {
        if (Math.abs(actualPct) <= 0.15) return "MAINTAINING";
        return actualPct > 0 ? "TRENDING ABOVE TARGET" : "TRENDING BELOW TARGET";
    }
    const target = Number(goal.targetRatePctPerWeek);
    const difference = actualPct - target;
    const tolerance = Math.max(0.10, Math.abs(target) * 0.25);
    if (Math.abs(difference) <= tolerance) return "ON TRACK";
    const slower = goal.type === "fat_loss" ? difference > 0 : difference < 0;
    if (Math.abs(difference) <= tolerance * 2) return slower ? "SLIGHTLY SLOWER THAN TARGET" : "SLIGHTLY FASTER THAN TARGET";
    return "TREND NEEDS ATTENTION";
}

function hasReachedGoal(goal, trendWeight) {
    if (!Number.isFinite(trendWeight)) return false;
    if (goal.type === "fat_loss") return trendWeight <= Number(goal.targetWeight);
    if (goal.type === "muscle_gain") return trendWeight >= Number(goal.targetWeight);
    return false;
}

function projectGoalDate(goal, currentTrend) {
    const ratePct = Number(goal?.targetRatePctPerWeek);
    const target = Number(goal?.targetWeight);
    if (!Number.isFinite(currentTrend) || !Number.isFinite(target) || !Number.isFinite(ratePct) || Math.abs(ratePct) < 0.001) return null;
    if (hasReachedGoal(goal, currentTrend)) return localDate();
    let weight = currentTrend;
    const weeklyMultiplier = 1 + (ratePct / 100);
    if (weeklyMultiplier <= 0) return null;
    let weeks = 0;
    while (weeks < 520) {
        weight *= weeklyMultiplier;
        weeks += 1;
        if ((goal.type === "fat_loss" && weight <= target) || (goal.type === "muscle_gain" && weight >= target)) break;
    }
    if (weeks >= 520) return null;
    const date = new Date();
    date.setDate(date.getDate() + (weeks * 7));
    return localDate(date);
}

function normalizeGoal(goal) {
    return {
        ...goal,
        type: normalizeType(goal.type),
        targetWeight: finiteOrNull(goal.targetWeight),
        startingTrendWeight: finiteOrNull(goal.startingTrendWeight),
        targetRatePctPerWeek: finiteOrNull(goal.targetRatePctPerWeek) ?? 0,
        targetRateLbPerWeek: finiteOrNull(goal.targetRateLbPerWeek) ?? 0,
        trainingExperience: goal.trainingExperience ? normalizeExperience(goal.trainingExperience) : null
    };
}

function goalTypeFromLegacy(phaseType, goalId) {
    const fromPhase = goalTypeFromPhase(phaseType);
    if (fromPhase) return fromPhase;
    if (goalId === "maintain") return "maintenance";
    if (String(goalId || "").startsWith("cut_")) return "fat_loss";
    if (String(goalId || "").startsWith("bulk_")) return "muscle_gain";
    return null;
}

function goalTypeFromPhase(type) {
    if (type === "fat_loss") return "fat_loss";
    if (type === "lean_bulk" || type === "muscle_gain") return "muscle_gain";
    if (type === "maintenance") return "maintenance";
    return null;
}

function phaseTypeFromGoal(type) {
    return type === "muscle_gain" ? "lean_bulk" : type;
}

function legacyPresetRate(goalId) {
    return ({ maintain: 0, cut_gentle: -0.5, cut_moderate: -1, bulk_conservative: 0.25, bulk_standard: 0.5 })[goalId] ?? null;
}

function normalizeType(type) {
    return ["fat_loss", "muscle_gain", "maintenance"].includes(type) ? type : null;
}

function normalizeExperience(value) {
    return ["beginner", "intermediate", "experienced"].includes(value) ? value : "intermediate";
}

function signedRatePct(type, value) {
    if (type === "maintenance") return 0;
    const magnitude = Math.abs(Number(value));
    if (!Number.isFinite(magnitude)) return NaN;
    return type === "fat_loss" ? -magnitude : magnitude;
}

function percentRate(lbPerWeek, weight) {
    const rate = Number(lbPerWeek);
    const base = Number(weight);
    return Number.isFinite(rate) && Number.isFinite(base) && base > 0 ? (rate / base) * 100 : null;
}

function validCalories(value) {
    const calories = Number(value);
    return Number.isFinite(calories) && calories > 0 ? Math.round(calories) : null;
}

function readObject(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    } catch {
        return null;
    }
}

function readArray(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function finiteOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(Number(value) * factor) / factor;
}

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}

function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function notifyGoalUpdated() {
    window.dispatchEvent(new CustomEvent("levelup:current-goal-updated"));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
}
