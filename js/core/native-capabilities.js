const isNative = () => Boolean(window.Capacitor?.isNativePlatform?.());
const plugin = name => window.Capacitor?.Plugins?.[name] || null;

export async function shareNativeJsonFile({ content, filename }) {
    const exporter = plugin("LevelUpFileExport");
    if (!isNative() || !exporter?.shareJson) return null;

    const result = await exporter.shareJson({
        content: String(content || ""),
        filename: String(filename || "level-up-backup.json")
    });

    return {
        completed: result?.completed === true,
        cancelled: result?.cancelled === true
    };
}
const HOME_ICON_KEY = "level_up_home_icon";
const HOME_ICON_IDS = new Set(["level-up", "arctic", "pure", "ocean", "midnight", "slate", "pulse"]);

function selectedHomeIcon() {
    const saved = String(localStorage.getItem(HOME_ICON_KEY) || "level-up").toLowerCase();
    return HOME_ICON_IDS.has(saved) ? saved : "level-up";
}

function liveActivityAppearance() {
    const theme = String(document.documentElement.dataset.theme || "level-up").toLowerCase();
    return HOME_ICON_IDS.has(theme) ? theme : selectedHomeIcon();
}

function nativeTimerContext(context = {}) {
    return {
        workoutName: String(context.workoutName || "Workout"),
        exerciseName: String(context.exerciseName || ""),
        setNumber: Math.max(0, Math.round(Number(context.setNumber) || 0)),
        targetReps: String(context.targetReps || ""),
        previousPerformance: String(context.previousPerformance || "")
    };
}

export function nativeNotificationId(value) {
    let hash = 2166136261;
    for (const character of String(value || "level-up")) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return Math.max(1, Math.abs(hash | 0) % 2147483000);
}

export async function hapticImpact(style = "MEDIUM") {
    if (!isNative()) return;
    try { await plugin("Haptics")?.impact?.({ style: String(style).toUpperCase() }); } catch {}
}

export async function hapticNotification(type = "SUCCESS") {
    if (!isNative()) return;
    try { await plugin("Haptics")?.notification?.({ type: String(type).toUpperCase() }); } catch {}
}

export async function requestNativeAlarmPermission() {
    const nativeTimer = plugin("LevelUpTimer");
    const notifications = nativeTimer || plugin("LocalNotifications");
    if (!isNative() || !notifications) return false;
    try {
        const current = await notifications.checkPermissions();
        if (current?.display === "granted") return true;
        const result = await notifications.requestPermissions();
        return result?.display === "granted";
    }
    catch { return false; }
}

export async function nativeAlarmPermission() {
    const notifications = plugin("LevelUpTimer") || plugin("LocalNotifications");
    if (!isNative() || !notifications) return "unsupported";
    try { return (await notifications.checkPermissions())?.display || "prompt"; }
    catch { return "prompt"; }
}

export async function scheduleNativeAlarm({ key, title, body, at, extra = {}, kind = "timer", context = {} }) {
    const nativeTimer = plugin("LevelUpTimer");
    const notifications = plugin("LocalNotifications");
    if (!isNative() || (!nativeTimer && !notifications)) return false;
    const when = at instanceof Date ? at : new Date(at);
    if (!Number.isFinite(when.getTime()) || when.getTime() <= Date.now()) return false;
    let permission = await nativeAlarmPermission();
    if (permission === "prompt") {
        permission = await requestNativeAlarmPermission() ? "granted" : "denied";
    }
    if (permission !== "granted") return false;
    const id = nativeNotificationId(key);
    try {
        if (nativeTimer?.schedule) {
            const theme = document.documentElement.dataset.theme || "level-up";
            const result = await nativeTimer.schedule({
                key, title, body, at: when.getTime(),
                type: extra?.type || "levelup:timer-complete",
                kind,
                theme,
                icon: liveActivityAppearance(),
                ...nativeTimerContext(context)
            });
            return result?.scheduled === true;
        }
        await notifications.cancel({ notifications: [{ id }] });
        await notifications.schedule({ notifications: [{
            id,
            title,
            body,
            schedule: { at: when, allowWhileIdle: true },
            sound: "level-up-alarm.wav",
            extra: { ...extra, key }
        }] });
        return true;
    }
    catch { return false; }
}

export async function updateNativeAlarm({ key, status, endAt = null, remainingMs = 0, context = {} }) {
    const nativeTimer = plugin("LevelUpTimer");
    if (!isNative() || !nativeTimer?.update || !key) return false;
    const end = endAt ? new Date(endAt) : null;
    try {
        const result = await nativeTimer.update({
            key,
            status: String(status || "running"),
            endAt: end && Number.isFinite(end.getTime()) ? end.getTime() : null,
            remainingSeconds: Math.max(0, Math.ceil(Number(remainingMs) / 1000)),
            ...nativeTimerContext(context)
        });
        return result?.updated === true;
    }
    catch { return false; }
}

let nativeTimerSyncing = false;
export async function syncNativeRestTimerState() {
    const nativeTimer = plugin("LevelUpTimer");
    if (!isNative() || !nativeTimer?.getState || nativeTimerSyncing) return false;
    let active;
    try { active = JSON.parse(localStorage.getItem("level_up_active_workout") || "null"); }
    catch { return false; }
    const timer = active?.status === "in_progress" ? active.restTimer : null;
    if (!timer?.timerId) return false;

    nativeTimerSyncing = true;
    try {
        const state = await nativeTimer.getState({ key: `rest:${timer.timerId}` });
        if (!state?.found) return false;
        if (state.status === "skipped" || state.status === "cancelled") {
            active.restTimer = null;
        } else {
            timer.status = state.status === "finished" ? "finished" : state.status;
            timer.remainingMs = Math.max(0, Number(state.remainingSeconds) || 0) * 1000;
            timer.endAt = timer.status === "running" && Number.isFinite(Number(state.endAt))
                ? new Date(Number(state.endAt)).toISOString()
                : null;
            timer.notified = timer.status === "finished";
        }
        active.updatedAt = new Date().toISOString();
        localStorage.setItem("level_up_active_workout", JSON.stringify(active));
        window.dispatchEvent(new CustomEvent("levelup:native-rest-timer-synced", { detail: state }));
        return true;
    }
    catch { return false; }
    finally { nativeTimerSyncing = false; }
}

export async function cancelNativeAlarm(key) {
    const nativeTimer = plugin("LevelUpTimer");
    const notifications = plugin("LocalNotifications");
    if (!isNative() || (!nativeTimer && !notifications)) return;
    if (nativeTimer?.cancel) {
        try { await nativeTimer.cancel({ key }); } catch {}
        return;
    }
    try { await notifications.cancel({ notifications: [{ id: nativeNotificationId(key) }] }); } catch {}
}

function bindNativeTouchFeedback() {
    if (!isNative()) return;
    document.addEventListener("click", event => {
        const control = event.target.closest("button, [role='button'], .nav-btn");
        if (!control || control.disabled) return;
        const strong = control.matches(".complete-set-btn,.complete-warmup-btn,.primary-btn,.level-up-email-submit");
        void hapticImpact(strong ? "MEDIUM" : "LIGHT");
    }, { passive: true });
    try {
        const appPlugin = plugin("App");
        void appPlugin?.addListener?.("appUrlOpen", event => {
            try {
                const url = new URL(event?.url || "");
                if (url.protocol !== "leveluphypertrophy:" || url.hostname !== "timer" || url.pathname !== "/dismiss") return;
                const key = url.searchParams.get("key");
                if (key) void cancelNativeAlarm(key);
            }
            catch {}
        });
        void appPlugin?.addListener?.("appStateChange", event => {
            if (event?.isActive) void syncNativeRestTimerState();
        });
        void plugin("LocalNotifications")?.addListener?.("localNotificationActionPerformed", event => {
            window.dispatchEvent(new CustomEvent("levelup:native-alarm-opened", { detail: event?.notification?.extra || {} }));
        });
    }
    catch {}

    window.addEventListener("pageshow", () => void syncNativeRestTimerState());
    window.addEventListener("focus", () => void syncNativeRestTimerState());
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) void syncNativeRestTimerState();
    });
    void syncNativeRestTimerState();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindNativeTouchFeedback, { once: true });
else bindNativeTouchFeedback();
