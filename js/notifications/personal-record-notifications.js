import { showAppNotification } from "../core/native-capabilities.js?v=personal-record-notifications-1";
import { getNotificationSettings } from "../more/notification-settings.js?v=personal-record-notifications-1";
import { openWorkoutCompletionRecap } from "../workouts/workout-complete-recap.js?v=personal-record-notifications-1";
import { buildPersonalRecordNotification } from "./personal-record-notification-model.js?v=personal-record-notifications-1";

const SESSIONS_KEY = "forge_workout_sessions";
const LAST_NOTIFIED_KEY = "level_up_last_pr_notification_session";

function readSessions() {
    try { const value = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"); return Array.isArray(value) ? value : []; }
    catch { return []; }
}

function openRecap(sessionId) {
    if (!sessionId) return;
    window.setTimeout(() => openWorkoutCompletionRecap(sessionId), 100);
}

async function notifyForCompletedWorkout(sessionId) {
    if (!getNotificationSettings().personalRecords || !sessionId) return;
    if (localStorage.getItem(LAST_NOTIFIED_KEY) === String(sessionId)) return;
    const sessions = readSessions();
    const session = sessions.find(item => String(item?.id) === String(sessionId));
    if (!session) return;
    const content = buildPersonalRecordNotification(session, sessions.filter(item => item.id !== session.id));
    if (!content) return;
    const shown = await showAppNotification({
        key: `levelup-pr-${sessionId}`,
        ...content,
        extra: { type: "levelup:personal-record", sessionId: String(sessionId) }
    });
    if (shown) localStorage.setItem(LAST_NOTIFIED_KEY, String(sessionId));
}

window.addEventListener("levelup:workout-completed", event => void notifyForCompletedWorkout(event.detail?.sessionId));
window.addEventListener("levelup:native-notification-opened", event => {
    if (event.detail?.type === "levelup:personal-record") openRecap(event.detail.sessionId);
});
window.addEventListener("levelup:open-workout-pr", event => openRecap(event.detail?.sessionId));
navigator.serviceWorker?.addEventListener?.("message", event => {
    if (event.data?.type === "levelup:open-workout-pr") openRecap(event.data.sessionId);
});

const startupSessionId = new URLSearchParams(location.search).get("workoutPr");
if (startupSessionId) {
    const url = new URL(location.href);
    url.searchParams.delete("workoutPr");
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => openRecap(startupSessionId), { once: true });
    else openRecap(startupSessionId);
}
