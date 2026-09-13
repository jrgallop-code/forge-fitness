import { requestAppNotificationPermission } from "../core/native-capabilities.js?v=personal-record-notifications-1";

export const NOTIFICATION_SETTINGS_KEY = "level_up_notification_settings_v1";

export const DEFAULT_NOTIFICATION_SETTINGS = {
    personalRecords: false,
    upcomingWorkouts: false,
    workoutDay: false,
    missedWorkouts: false,
    workoutTime: "18:00",
    leadMinutes: 60,
    dayReminderTime: "09:00",
    missedTime: "20:00",
    quietStart: "22:00",
    quietEnd: "07:00"
};

export function getNotificationSettings() {
    try { return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) || "{}") }; }
    catch { return { ...DEFAULT_NOTIFICATION_SETTINGS }; }
}

function saveNotificationSettings(settings) {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

export function renderNotificationSettings() {
    const settings = getNotificationSettings();
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
            <input id="personal-record-notifications" type="checkbox" ${settings.personalRecords ? "checked" : ""}>
            <span aria-hidden="true"></span><span class="sr-only">Enable personal record notifications</span>
        </label></div>
        <div class="adaptive-settings-details"><p>Multiple records from the same workout are combined into one notification. Tap it to open that workout recap.</p></div>
        ${notificationToggle("upcoming-workout-notifications", "Upcoming Workout", "Alert before a scheduled workout", settings.upcomingWorkouts)}
        <div class="adaptive-settings-details notification-setting-fields">
            <label>Typical workout time <input id="notification-workout-time" type="time" value="${settings.workoutTime}"></label>
            <label>Remind me <select id="notification-lead-time">
                ${[[30,"30 minutes before"],[60,"1 hour before"],[120,"2 hours before"]].map(([value,label]) => `<option value="${value}" ${Number(settings.leadMinutes) === value ? "selected" : ""}>${label}</option>`).join("")}
            </select></label>
        </div>
        ${notificationToggle("workout-day-notifications", "Workout-Day Reminder", "A morning reminder on scheduled training days", settings.workoutDay)}
        <div class="adaptive-settings-details notification-setting-fields"><label>Morning reminder <input id="notification-day-time" type="time" value="${settings.dayReminderTime}"></label></div>
        ${notificationToggle("missed-workout-notifications", "Missed Workout", "One supportive nudge if the scheduled workout is still incomplete", settings.missedWorkouts)}
        <div class="adaptive-settings-details notification-setting-fields"><label>Check-in time <input id="notification-missed-time" type="time" value="${settings.missedTime}"></label></div>
        <div class="adaptive-settings-details notification-setting-fields notification-quiet-hours">
            <p><b>Quiet hours</b> — reminders that fall inside this window are suppressed.</p>
            <label>From <input id="notification-quiet-start" type="time" value="${settings.quietStart}"></label>
            <label>Until <input id="notification-quiet-end" type="time" value="${settings.quietEnd}"></label>
        </div>
        <p id="notification-settings-message" class="adaptive-settings-message" aria-live="polite"></p>
    </section>`;
}

function ensureNotificationStyles() {
    if (document.querySelector('link[data-notification-settings-style]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/notification-settings.css?v=workout-reminders-1";
    link.dataset.notificationSettingsStyle = "true";
    document.head.appendChild(link);
}

function notificationToggle(id, title, description, enabled) {
    return `<div class="adaptive-settings-toggle-row notification-settings-divider"><div><strong>${title}</strong><small>${description}</small></div>
        <label class="adaptive-settings-switch"><input id="${id}" type="checkbox" ${enabled ? "checked" : ""}><span aria-hidden="true"></span><span class="sr-only">Enable ${title}</span></label></div>`;
}

export function initializeNotificationSettings({ onBack } = {}) {
    ensureNotificationStyles();
    document.getElementById("notification-settings-back")?.addEventListener("click", () => onBack?.());
    const message = document.getElementById("notification-settings-message");
    const toggleMap = {
        "personal-record-notifications": "personalRecords",
        "upcoming-workout-notifications": "upcomingWorkouts",
        "workout-day-notifications": "workoutDay",
        "missed-workout-notifications": "missedWorkouts"
    };
    Object.entries(toggleMap).forEach(([id, field]) => document.getElementById(id)?.addEventListener("change", async event => {
        const toggle = event.currentTarget;
        if (toggle.checked) {
            toggle.disabled = true;
            const permission = await requestAppNotificationPermission();
            toggle.disabled = false;
            if (permission !== "granted") {
                toggle.checked = false;
                if (message) message.textContent = permission === "unsupported"
                    ? "Notifications are not supported here. The installed iOS app provides reliable Lock Screen reminders."
                    : "Notifications are blocked. Enable them for Level Up in iOS Settings, then try again.";
                return;
            }
        }
        saveAndRefresh({ [field]: toggle.checked });
        if (message) message.textContent = toggle.checked ? `${toggle.closest(".adaptive-settings-toggle-row")?.querySelector("strong")?.textContent} notifications are on.` : "That notification is off.";
    }));

    const fieldMap = {
        "notification-workout-time": "workoutTime",
        "notification-lead-time": "leadMinutes",
        "notification-day-time": "dayReminderTime",
        "notification-missed-time": "missedTime",
        "notification-quiet-start": "quietStart",
        "notification-quiet-end": "quietEnd"
    };
    Object.entries(fieldMap).forEach(([id, field]) => document.getElementById(id)?.addEventListener("change", event => {
        const value = field === "leadMinutes" ? Number(event.currentTarget.value) : event.currentTarget.value;
        saveAndRefresh({ [field]: value });
        if (message) message.textContent = "Reminder schedule updated.";
    }));
}

function saveAndRefresh(patch) {
    const settings = { ...getNotificationSettings(), ...patch };
    saveNotificationSettings(settings);
    window.dispatchEvent(new CustomEvent("levelup:notification-settings-changed", { detail: settings }));
}
