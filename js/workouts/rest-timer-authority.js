const ACTIVE_WORKOUT_STORAGE_KEY = "level_up_active_workout";
const TIMER_SETTINGS_KEY = "level_up_exercise_rest_settings";
const TIMER_TAG = "level-up-rest-timer";
const EXPIRY_EARLY_MS = 35;
const RECONCILE_DELAY_MS = 0;

let expiryTimeout = null;
let scheduledSignature = "";
let monitorInterval = null;

function readJson(key, fallback) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        return parsed ?? fallback;
    }
    catch {
        return fallback;
    }
}

function readActiveWorkout() {
    const active = readJson(ACTIVE_WORKOUT_STORAGE_KEY, null);
    return active?.status === "in_progress" ? active : null;
}

function saveActiveWorkout(active) {
    if (!active) return;
    active.updatedAt = new Date().toISOString();
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(active));
}

function readTimerSettings() {
    const settings = readJson(TIMER_SETTINGS_KEY, {});
    return settings && typeof settings === "object" ? settings : {};
}

export function getExerciseRestSetting(exerciseId) {
    const stored = readTimerSettings()[String(exerciseId || "")];
    const seconds = Number(stored?.seconds);
    return {
        enabled: stored?.enabled === true,
        seconds: [60, 90, 120, 180].includes(seconds) ? seconds : 120
    };
}

function makeTimerId(active, sourceKey) {
    const random = Math.random().toString(36).slice(2, 8);
    return `rest-${active?.id || "workout"}-${Date.now()}-${random}-${String(sourceKey || "timer").replace(/[^a-z0-9_-]/gi, "-")}`;
}

function clearScheduledExpiry() {
    if (expiryTimeout) window.clearTimeout(expiryTimeout);
    expiryTimeout = null;
    scheduledSignature = "";
}

function ensureTimerIdentity(active) {
    const timer = active?.restTimer;
    if (!active || !timer) return false;
    let changed = false;

    if (!timer.timerId) {
        timer.timerId = makeTimerId(active, timer.sourceKey || `${active.currentExerciseIndex}-${active.currentSetIndex}`);
        changed = true;
    }
    if (!timer.startedAt) {
        const duration = Math.max(0, Number(timer.durationSeconds) || 0) * 1000;
        const end = timer.endAt ? new Date(timer.endAt).getTime() : NaN;
        timer.startedAt = Number.isFinite(end) && duration > 0
            ? new Date(end - duration).toISOString()
            : new Date().toISOString();
        changed = true;
    }

    if (changed) saveActiveWorkout(active);
    return changed;
}

async function showSingleBackgroundNotification(timer) {
    if (document.visibilityState !== "hidden") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    try {
        const registration = await navigator.serviceWorker?.ready;
        if (!registration) return;
        const existing = typeof registration.getNotifications === "function"
            ? await registration.getNotifications({ tag: TIMER_TAG })
            : [];
        existing.forEach(notification => notification.close());
        await registration.showNotification("Rest complete", {
            body: "Your rest timer has finished.",
            tag: TIMER_TAG,
            renotify: false,
            data: { type: "levelup:rest-complete", timerId: timer?.timerId || null }
        });
    }
    catch {
        // The in-app alarm remains the fallback.
    }
}

function finalizeTimer(timerId) {
    const active = readActiveWorkout();
    const timer = active?.restTimer;
    if (!active || !timer || timer.timerId !== timerId || timer.status !== "running" || !timer.endAt) return;

    const endAtMs = new Date(timer.endAt).getTime();
    if (!Number.isFinite(endAtMs)) return;
    if (Date.now() < endAtMs - EXPIRY_EARLY_MS - 5) {
        scheduleExpiry(active, timer);
        return;
    }

    // Finish once, but intentionally retain endAt. The legacy alarm renderer used
    // to change identity when core expiry cleared endAt, causing the same alarm to
    // sound twice. `notified` also prevents the older core notification path from
    // firing a second alert.
    timer.status = "finished";
    timer.remainingMs = 0;
    timer.notified = true;
    timer.authorityFinished = true;
    timer.authorityAlerted = true;
    saveActiveWorkout(active);
    clearScheduledExpiry();

    window.dispatchEvent(new CustomEvent("levelup:rest-timer-finished", {
        detail: { timerId: timer.timerId, sourceType: timer.sourceType || "working" }
    }));
    showSingleBackgroundNotification(timer);
}

function scheduleExpiry(active, timer) {
    if (!active || !timer || timer.status !== "running" || !timer.endAt) {
        clearScheduledExpiry();
        return;
    }

    ensureTimerIdentity(active);
    const signature = `${timer.timerId}|${timer.endAt}`;
    if (signature === scheduledSignature && expiryTimeout) return;

    clearScheduledExpiry();
    scheduledSignature = signature;
    const endAtMs = new Date(timer.endAt).getTime();
    if (!Number.isFinite(endAtMs)) return;
    const delay = Math.max(0, endAtMs - Date.now() - EXPIRY_EARLY_MS);
    expiryTimeout = window.setTimeout(() => finalizeTimer(timer.timerId), delay);
}

function timerSourceKey(active, sourceType, exerciseIndex, setIndex, warmupIndex) {
    return [
        active?.id || "workout",
        sourceType,
        Number(exerciseIndex),
        sourceType === "warmup" ? Number(warmupIndex) : Number(setIndex)
    ].join("|");
}

function startTimerForSource({ active, seconds, sourceType, exerciseIndex, setIndex = null, warmupIndex = null }) {
    if (!active || !Number.isFinite(seconds) || seconds <= 0) return false;

    const sourceKey = timerSourceKey(active, sourceType, exerciseIndex, setIndex, warmupIndex);
    const existing = active.restTimer;
    const existingStarted = existing?.startedAt ? new Date(existing.startedAt).getTime() : 0;
    if (existing?.sourceKey === sourceKey && Date.now() - existingStarted < 1200) {
        return true;
    }

    const now = Date.now();
    active.currentExerciseIndex = Number(exerciseIndex) || 0;
    if (sourceType === "working" && Number.isFinite(Number(setIndex))) {
        active.currentSetIndex = Number(setIndex);
    }

    active.restTimer = {
        timerId: makeTimerId(active, sourceKey),
        sourceKey,
        sourceType,
        exerciseIndex: Number(exerciseIndex) || 0,
        setIndex: sourceType === "working" ? Number(setIndex) : null,
        warmupIndex: sourceType === "warmup" ? Number(warmupIndex) : null,
        status: "running",
        durationSeconds: seconds,
        startedAt: new Date(now).toISOString(),
        endAt: new Date(now + seconds * 1000).toISOString(),
        remainingMs: seconds * 1000,
        notified: false,
        authorityFinished: false,
        authorityAlerted: false
    };
    saveActiveWorkout(active);
    scheduleExpiry(active, active.restTimer);
    window.dispatchEvent(new CustomEvent("levelup:rest-timer-started", {
        detail: { timerId: active.restTimer.timerId, sourceType, exerciseIndex, setIndex, warmupIndex, seconds }
    }));
    return true;
}

function clearTimerForDisabledSource(active) {
    if (!active?.restTimer) return;
    active.restTimer = null;
    saveActiveWorkout(active);
    clearScheduledExpiry();
    window.dispatchEvent(new CustomEvent("levelup:rest-timer-dismissed"));
}

function exerciseMetaFromButton(button, rowSelector, indexAttribute) {
    const row = button?.closest?.(rowSelector);
    const card = button?.closest?.(".session-exercise-card[data-exercise-index]");
    if (!row || !card) return null;
    return {
        exerciseId: card.dataset.exerciseId || "",
        exerciseIndex: Number(card.dataset.exerciseIndex),
        index: Number(row.dataset[indexAttribute])
    };
}

function reconcileWorkingSet(meta) {
    if (!meta || !Number.isFinite(meta.exerciseIndex) || !Number.isFinite(meta.index)) return;
    const active = readActiveWorkout();
    const completed = active?.exercises?.[meta.exerciseIndex]?.sets?.[meta.index]?.completed === true;
    if (!active || !completed) return;

    const setting = getExerciseRestSetting(meta.exerciseId);
    if (!setting.enabled) {
        // Core currently falls back from 0 (Off) to 90 seconds. Remove that
        // accidental timer immediately so Off really means Off.
        clearTimerForDisabledSource(active);
        return;
    }

    startTimerForSource({
        active,
        seconds: setting.seconds,
        sourceType: "working",
        exerciseIndex: meta.exerciseIndex,
        setIndex: meta.index
    });
}

export function startRestForWarmupButton(button) {
    const meta = exerciseMetaFromButton(button, ".session-warmup-row", "warmupIndex");
    if (!meta || !Number.isFinite(meta.exerciseIndex) || !Number.isFinite(meta.index)) return false;
    const active = readActiveWorkout();
    const completed = active?.exercises?.[meta.exerciseIndex]?.warmupSets?.[meta.index]?.completed === true;
    if (!active || !completed) return false;

    const setting = getExerciseRestSetting(meta.exerciseId);
    if (!setting.enabled) {
        clearTimerForDisabledSource(active);
        return false;
    }

    return startTimerForSource({
        active,
        seconds: setting.seconds,
        sourceType: "warmup",
        exerciseIndex: meta.exerciseIndex,
        warmupIndex: meta.index
    });
}

function keepActiveTimerAuthoritative() {
    const active = readActiveWorkout();
    const timer = active?.restTimer;
    if (!active || !timer) {
        clearScheduledExpiry();
        return;
    }

    ensureTimerIdentity(active);
    const refreshed = readActiveWorkout();
    const currentTimer = refreshed?.restTimer;
    if (!currentTimer) return;

    if (currentTimer.status === "running" && currentTimer.endAt) scheduleExpiry(refreshed, currentTimer);
    else clearScheduledExpiry();

    // A timer is global workout state, not DOM state. Never let a logger re-render
    // make the active banner disappear.
    const banner = document.getElementById("level-up-rest-alarm-banner");
    if (banner) banner.hidden = false;
}

document.addEventListener("click", event => {
    const button = event.target?.closest?.(".complete-set-btn");
    if (!button) return;
    const meta = exerciseMetaFromButton(button, ".session-set-row", "setIndex");
    window.setTimeout(() => reconcileWorkingSet(meta), RECONCILE_DELAY_MS);
}, true);

window.addEventListener("focus", keepActiveTimerAuthoritative);
document.addEventListener("visibilitychange", keepActiveTimerAuthoritative);
window.addEventListener("storage", event => {
    if (event.key === ACTIVE_WORKOUT_STORAGE_KEY || event.key === TIMER_SETTINGS_KEY) keepActiveTimerAuthoritative();
});

monitorInterval = window.setInterval(keepActiveTimerAuthoritative, 100);
window.addEventListener("beforeunload", () => {
    if (monitorInterval) window.clearInterval(monitorInterval);
    clearScheduledExpiry();
});

keepActiveTimerAuthoritative();
