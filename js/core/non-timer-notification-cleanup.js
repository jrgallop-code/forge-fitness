const REMINDER_IDS_KEY = "level_up_scheduled_notification_ids:workout-reminders";
const CLEANUP_VERSION_KEY = "level_up_non_timer_notification_cleanup_v1";

async function removeNonTimerNotifications() {
    if (localStorage.getItem(CLEANUP_VERSION_KEY) === "done") return;
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem(REMINDER_IDS_KEY) || "[]"); } catch {}
    const notifications = window.Capacitor?.Plugins?.LocalNotifications;
    if (notifications && ids.length) {
        try { await notifications.cancel({ notifications: ids.map(id => ({ id })) }); } catch { return; }
    }
    localStorage.removeItem(REMINDER_IDS_KEY);
    localStorage.removeItem("level_up_notification_settings_v1");
    localStorage.removeItem("level_up_last_pr_notification_session");
    localStorage.setItem(CLEANUP_VERSION_KEY, "done");
}

void removeNonTimerNotifications();
