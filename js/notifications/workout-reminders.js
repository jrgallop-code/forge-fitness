import { replaceScheduledAppNotifications } from "../core/native-capabilities.js?v=workout-reminders-1";
import { getNotificationSettings } from "../more/notification-settings.js?v=workout-reminders-1";
import { buildWorkoutReminders } from "./workout-reminder-model.js?v=workout-reminders-1";

const SCHEDULE_KEY = "level_up_workout_schedule_v1";
const PLANS_KEY = "forge_workout_plans";
const SESSIONS_KEY = "forge_workout_sessions";
const START_FLAG = "level_up_start_scheduled_workout";
let refreshTimer = 0;

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }

export async function refreshWorkoutReminders() {
    const schedule = read(SCHEDULE_KEY, null);
    const plans = read(PLANS_KEY, []);
    const sessions = read(SESSIONS_KEY, []);
    const plan = plans.find(item => String(item?.id) === String(schedule?.planId));
    const reminders = buildWorkoutReminders({ schedule, plan, sessions, settings: getNotificationSettings() });
    await replaceScheduledAppNotifications("workout-reminders", reminders.map(item => ({ ...item, extra: item.extra })));
    return reminders;
}

function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => void refreshWorkoutReminders(), 80);
}

function openScheduledWorkout(detail = {}) {
    if (!detail.planId) return;
    sessionStorage.setItem(START_FLAG, String(detail.planId));
    window.dispatchEvent(new CustomEvent("levelup:navigate", { detail: { page: "workout" } }));
}

["levelup:notification-settings-changed", "levelup:workout-schedule-updated", "levelup:workout-completed", "levelup:training-preferences-updated"].forEach(name => window.addEventListener(name, scheduleRefresh));
window.addEventListener("storage", event => { if ([SCHEDULE_KEY, PLANS_KEY, SESSIONS_KEY].includes(event.key)) scheduleRefresh(); });
window.addEventListener("levelup:native-notification-opened", event => { if (event.detail?.type === "levelup:scheduled-workout") openScheduledWorkout(event.detail); });
window.addEventListener("levelup:open-scheduled-workout", event => openScheduledWorkout(event.detail));
navigator.serviceWorker?.addEventListener?.("message", event => { if (event.data?.type === "levelup:open-scheduled-workout") openScheduledWorkout(event.data); });

const startup = new URLSearchParams(location.search);
if (startup.get("scheduledWorkout")) {
    const detail = { planId: startup.get("planId"), dayIndex: startup.get("dayIndex"), date: startup.get("date") };
    const url = new URL(location.href);
    ["scheduledWorkout", "planId", "dayIndex", "date"].forEach(key => url.searchParams.delete(key));
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
    window.setTimeout(() => openScheduledWorkout(detail), 250);
}

scheduleRefresh();
