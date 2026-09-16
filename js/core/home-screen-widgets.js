import { entriesForDate, localDateKey, summarizeEntries } from "../nutrition/food-log-data.js?v=home-widget-1";
import { getNutritionMacroPreference, getNutritionPlan, getNutritionProfile } from "../nutrition/nutrition-storage.js?v=home-widget-1";
import { calculateMacroTargets, poundsToKg } from "../nutrition/tdee-calculator.js?v=home-widget-1";
import { isNutritionEnabled } from "./app-feature-preferences.js?v=home-widget-1";

const PLUGIN = "LevelUpDashboardWidget";
const PLAN_KEY = "forge_workout_plans";
const SESSION_KEY = "forge_workout_sessions";
const SCHEDULE_KEY = "level_up_workout_schedule_v1";
let timer = 0;

export function isNativeIOS() {
    try { return window.Capacitor?.getPlatform?.() === "ios" || (window.Capacitor?.isNativePlatform?.() && /iPhone|iPad|iPod/i.test(navigator.userAgent)); }
    catch { return false; }
}

function json(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function theme() {
    const setting = json("level_up_appearance_settings", null);
    const selected = String(setting?.theme || setting || document.documentElement.dataset.theme || "level-up");
    return selected === "system" ? (document.documentElement.dataset.theme || "level-up") : selected;
}

function nutritionSnapshot() {
    const enabled = isNutritionEnabled();
    const target = Number(getNutritionPlan().currentCalories) || 0;
    const totals = summarizeEntries(entriesForDate(localDateKey()));
    const profile = getNutritionProfile();
    const preference = getNutritionMacroPreference();
    let proteinTarget = Number(preference?.manualMacros?.protein) || 0;
    if (!proteinTarget && target > 0 && Number(profile?.weightLb) > 0) {
        proteinTarget = Number(calculateMacroTargets({ calories: target, weightKg: poundsToKg(Number(profile.weightLb)), macroPreset: preference?.macroPreset || "balanced" })?.protein) || 0;
    }
    return { enabled, caloriesConsumed: Math.round(Number(totals.calories) || 0), calorieTarget: Math.round(target), proteinConsumed: Math.round(Number(totals.protein) || 0), proteinTarget: Math.round(proteinTarget) };
}

function localDate(date = new Date()) { const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return shifted.toISOString().slice(0, 10); }
function workoutSnapshot() {
    const plans = json(PLAN_KEY, []), sessions = json(SESSION_KEY, []), schedule = json(SCHEDULE_KEY, null);
    const plan = Array.isArray(plans) ? plans.find(item => item?.id === schedule?.planId) : null;
    const today = new Date(), sunday = new Date(today); sunday.setHours(0, 0, 0, 0); sunday.setDate(today.getDate() - today.getDay());
    const completedThisWeek = (Array.isArray(sessions) ? sessions : []).filter(session => { const stamp = session?.completedAt || (session?.date ? `${session.date}T12:00:00` : null); const value = stamp ? new Date(stamp) : null; return value && !Number.isNaN(value.getTime()) && value >= sunday; }).length;
    if (!schedule || !plan) return { nextWorkout: "No workout scheduled", nextWorkoutDate: "", completedThisWeek };
    for (let offset = 0; offset < 8; offset += 1) {
        const date = new Date(today); date.setDate(today.getDate() + offset); const dateKey = localDate(date);
        const exception = schedule.exceptions?.[dateKey]; const dayIndex = exception ? exception.dayIndex : schedule.weekly?.[date.getDay()];
        const day = dayIndex === null || dayIndex === undefined ? null : plan.days?.[Number(dayIndex)];
        if (day && exception?.status !== "skipped") return { nextWorkout: String(day.name || `Workout ${Number(dayIndex) + 1}`), nextWorkoutDate: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : date.toLocaleDateString(undefined, { weekday: "short" }), completedThisWeek };
    }
    return { nextWorkout: "No workout scheduled", nextWorkoutDate: "", completedThisWeek };
}

export function dashboardWidgetSnapshot() { return { version: 1, updatedAt: new Date().toISOString(), theme: theme(), ...nutritionSnapshot(), ...workoutSnapshot() }; }
export async function syncHomeScreenWidget() {
    if (!isNativeIOS()) return { available: false };
    const plugin = window.Capacitor?.Plugins?.[PLUGIN]; if (!plugin?.sync) return { available: false };
    return plugin.sync({ snapshot: JSON.stringify(dashboardWidgetSnapshot()) });
}
export function scheduleHomeScreenWidgetSync() { if (!isNativeIOS()) return; clearTimeout(timer); timer = window.setTimeout(() => { syncHomeScreenWidget().catch(() => {}); }, 120); }
["levelup:nutrition-updated", "levelup:nutrition-phase-updated", "levelup:food-log-updated", "levelup:workout-completed", "levelup:appearance-changed", "pageshow", "focus"].forEach(name => window.addEventListener(name, scheduleHomeScreenWidgetSync));
document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleHomeScreenWidgetSync(); });
scheduleHomeScreenWidgetSync();
