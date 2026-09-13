import { requestAppNotificationPermission } from "../core/native-capabilities.js?v=personal-record-notifications-1";

export const NOTIFICATION_SETTINGS_KEY = "level_up_notification_settings_v1";

export function getNotificationSettings() {
    try { return { personalRecords: false, ...JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) || "{}") }; }
    catch { return { personalRecords: false }; }
}

function saveNotificationSettings(settings) {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

export function renderNotificationSettings() {
    const enabled = getNotificationSettings().personalRecords;
    return `<section class="dashboard-welcome"><div>
        <button class="nutrition-planner-back" id="notification-settings-back" type="button">← More</button>
        <span class="eyebrow">APP PREFERENCES</span><h2>Notifications</h2>
        <p>Choose the moments when Level Up can celebrate or remind you.</p>
    </div></section>
    <section class="section-card adaptive-settings-card">
        <div class="adaptive-settings-toggle-row"><div>
            <strong>Personal Records</strong>
            <small>Celebrate new strength or repetition records after a completed workout</small>
        </div><label class="adaptive-settings-switch">
            <input id="personal-record-notifications" type="checkbox" ${enabled ? "checked" : ""}>
            <span aria-hidden="true"></span><span class="sr-only">Enable personal record notifications</span>
        </label></div>
        <div class="adaptive-settings-details"><p>Multiple records from the same workout are combined into one notification. Tap it to open that workout recap.</p></div>
        <p id="notification-settings-message" class="adaptive-settings-message" aria-live="polite"></p>
    </section>`;
}

export function initializeNotificationSettings({ onBack } = {}) {
    document.getElementById("notification-settings-back")?.addEventListener("click", () => onBack?.());
    const toggle = document.getElementById("personal-record-notifications");
    const message = document.getElementById("notification-settings-message");
    toggle?.addEventListener("change", async () => {
        if (!toggle.checked) {
            saveNotificationSettings({ ...getNotificationSettings(), personalRecords: false });
            if (message) message.textContent = "Personal record notifications are off.";
            return;
        }
        toggle.disabled = true;
        const permission = await requestAppNotificationPermission();
        toggle.disabled = false;
        const granted = permission === "granted";
        toggle.checked = granted;
        saveNotificationSettings({ ...getNotificationSettings(), personalRecords: granted });
        if (message) message.textContent = granted
            ? "Personal record notifications are on."
            : permission === "unsupported"
                ? "Notifications are not supported in this browser. Install Level Up to your Home Screen and try again."
                : "Notifications are blocked. Enable them for Level Up in your device settings, then try again.";
    });
}
