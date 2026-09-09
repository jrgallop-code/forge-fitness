const isNative = () => Boolean(window.Capacitor?.isNativePlatform?.());
const plugin = name => window.Capacitor?.Plugins?.[name] || null;

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

export async function scheduleNativeAlarm({ key, title, body, at, extra = {}, kind = "timer" }) {
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
            const result = await nativeTimer.schedule({
                key, title, body, at: when.getTime(),
                type: extra?.type || "levelup:timer-complete",
                kind,
                theme: document.documentElement.dataset.theme || "level-up"
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
        void plugin("App")?.addListener?.("appUrlOpen", event => {
            try {
                const url = new URL(event?.url || "");
                if (url.protocol !== "leveluphypertrophy:" || url.hostname !== "timer" || url.pathname !== "/dismiss") return;
                const key = url.searchParams.get("key");
                if (key) void cancelNativeAlarm(key);
            }
            catch {}
        });
        void plugin("LocalNotifications")?.addListener?.("localNotificationActionPerformed", event => {
            window.dispatchEvent(new CustomEvent("levelup:native-alarm-opened", { detail: event?.notification?.extra || {} }));
        });
    }
    catch {}
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindNativeTouchFeedback, { once: true });
else bindNativeTouchFeedback();
