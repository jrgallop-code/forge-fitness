import {
    createBackupSnapshot,
    verifyBackupSnapshot
} from "../core/backup-manager.js?v=backup-complete-7";

const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const ACCOUNT_KEY = "level_up_cloud_account";
const LAST_SYNC_KEY = "level_up_cloud_last_sync";
const AUTO_STATE_KEY = "level_up_cloud_auto_backup_state";
const RECOVERY_PARAMETER = "local-recovery";
const ACTIVITY_INTERVAL_MS = 15 * 60 * 1000;
const BACKUP_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const BACKUP_DEBOUNCE_MS = 3 * 1000;
const CRITICAL_BACKUP_DELAY_MS = 350;

let backupTimer = null;
let backupDueAt = 0;
let backupInFlight = false;
let backupRequestedWhileInFlight = false;
let syncStarted = false;
let authBlocked = false;
let rejectedSessionToken = null;
let retryDelayMs = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

initializeCloudBackgroundSync();

function initializeCloudBackgroundSync() {
    window.addEventListener("levelup:cloud-session-started", () => {
        authBlocked = false;
        rejectedSessionToken = null;
        startCloudBackgroundSync();
    });
    if (!isRecoveryLaunch() && getSession()) startCloudBackgroundSync();
}

function startCloudBackgroundSync() {
    if (authBlocked || isRecoveryLaunch() || !getSession()) return;
    if (syncStarted) {
        scheduleBackup(1_000);
        return;
    }
    syncStarted = true;

    void recordActivity();
    scheduleBackup(5_000);

    window.setInterval(() => void recordActivity(), ACTIVITY_INTERVAL_MS);
    window.setInterval(() => {
        recoverSessionIfChanged();
        scheduleBackup(0);
    }, BACKUP_CHECK_INTERVAL_MS);
    window.addEventListener("online", () => {
        recoverSessionIfChanged();
        void recordActivity();
        scheduleBackup(750);
    });
    window.addEventListener("levelup:cloud-sync-complete", () => scheduleBackup(0));
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            recoverSessionIfChanged();
            void recordActivity();
            scheduleBackup(1_000);
        }
        else {
            // iOS can suspend the WebView before a zero-delay timer gets a chance
            // to run, so begin the upload immediately while the app still has CPU.
            void runAutomaticBackup();
        }
    });
    window.addEventListener("pagehide", () => {
        void runAutomaticBackup();
    });

    [
        "levelup:workout-completed",
        "levelup:food-log-updated",
        "levelup:nutrition-updated",
        "levelup:nutrition-phase-updated",
        "levelup:weight-updated",
        "levelup:measurements-updated",
        "levelup:sleep-updated",
        "levelup:workout-library-changed",
        "levelup:shared-workout-imported",
        "levelup:body-composition-updated"
    ].forEach(name => window.addEventListener(name, () => scheduleBackup(CRITICAL_BACKUP_DELAY_MS)));

    bindNativeLifecycleBackup();
    document.addEventListener("change", () => scheduleBackup(BACKUP_DEBOUNCE_MS), true);
    document.addEventListener("click", event => {
        if (event.target.closest?.("button,[data-page]")) scheduleBackup(BACKUP_DEBOUNCE_MS);
    }, true);
}

function bindNativeLifecycleBackup() {
    try {
        const appPlugin = window.Capacitor?.Plugins?.App;
        if (!appPlugin?.addListener) return;
        void appPlugin.addListener("appStateChange", event => {
            if (event?.isActive) {
                recoverSessionIfChanged();
                void recordActivity();
                scheduleBackup(750);
            }
            else {
                // Start the request immediately before iOS freezes the WebView.
                void runAutomaticBackup();
            }
        });
    }
    catch (error) {
        console.warn("Native backup lifecycle listener was unavailable:", error?.message || error);
    }
}

function scheduleBackup(delay) {
    recoverSessionIfChanged();
    if (authBlocked || isRecoveryLaunch() || isLocalDataSandbox() || !getSession() || !navigator.onLine) return;
    const dueAt = Date.now() + Math.max(0, Number(delay) || 0);
    if (backupInFlight) {
        backupRequestedWhileInFlight = true;
        return;
    }
    // A generic click/change must never postpone an earlier nutrition or workout save.
    if (backupTimer && backupDueAt && backupDueAt <= dueAt) return;
    window.clearTimeout(backupTimer);
    backupDueAt = dueAt;
    backupTimer = window.setTimeout(() => {
        backupTimer = null;
        backupDueAt = 0;
        void runAutomaticBackup();
    }, Math.max(0, dueAt - Date.now()));
}

async function recordActivity() {
    if (authBlocked || isRecoveryLaunch() || !navigator.onLine || !getSession()) return;
    try {
        await api("/v1/activity", { method: "POST" });
    }
    catch (error) {
        if (error.status === 401) markAuthenticationRequired();
        else console.warn("Level Up activity update was deferred:", error.message);
    }
}

async function runAutomaticBackup() {
    recoverSessionIfChanged();
    if (backupInFlight) {
        backupRequestedWhileInFlight = true;
        return;
    }
    if (authBlocked || isRecoveryLaunch() || isLocalDataSandbox() || !navigator.onLine || !getSession()) return;
    backupInFlight = true;

    try {
        if (isLocalDataSandbox()) return;
        const backup = await createBackupSnapshot();
        if (isLocalDataSandbox()) return;
        verifyBackupSnapshot(backup);
        const fingerprint = await backupFingerprint(backup);
        const summary = backupSafetySummary(backup);
        let state = readJson(AUTO_STATE_KEY) || {};
        const completedSync = readJson(LAST_SYNC_KEY);
        const meta = await api("/v1/backup/meta");
        const remote = meta.backup;

        if (canAdoptCompletedSync(completedSync, state, remote)) {
            const saved = await api("/v1/backup");
            if (Number(saved.version) !== Number(remote.version)) {
                scheduleBackup(0);
                return;
            }
            verifyBackupSnapshot(saved.backup);
            state = saveAutoState({
                version: Number(saved.version),
                fingerprint: await backupFingerprint(saved.backup),
                summary: backupSafetySummary(saved.backup),
                updatedAt: remote.updated_at,
                completedAt: completedSync.completedAt,
                status: "synced"
            });
        }

        if (remote && state.fingerprint === fingerprint && Number(state.version) === Number(remote.version)) {
            if (state.status !== "synced") saveAutoState({ ...state, status: "synced" });
            return;
        }

        if (remote && Number(state.version || 0) !== Number(remote.version)) {
            // Another device or a manual backup changed the cloud version.
            // Adopt it only if the complete remote contents already match local data.
            // Never overwrite an unknown remote version automatically.
            const saved = await api("/v1/backup");
            if (Number(saved.version) === Number(remote.version)) {
                verifyBackupSnapshot(saved.backup);
                const remoteFingerprint = await backupFingerprint(saved.backup);
                if (remoteFingerprint === fingerprint) {
                    saveAutoState({
                        version: Number(saved.version),
                        fingerprint,
                        summary,
                        updatedAt: remote.updated_at,
                        completedAt: new Date().toISOString(),
                        status: "synced"
                    });
                    return;
                }
            }
            saveAutoState({
                ...state,
                status: "newer-cloud-backup",
                remoteVersion: Number(remote.version),
                checkedAt: new Date().toISOString()
            });
            console.info("Automatic backup paused because a newer cloud version is available.");
            return;
        }

        const localSafety = assessLocalDataReduction(state.summary, summary);
        if (localSafety.blocked) {
            saveAutoState({
                ...state,
                status: "safety-blocked",
                safety: localSafety,
                checkedAt: new Date().toISOString()
            });
            console.warn("Automatic backup paused because local history changed unexpectedly.", localSafety);
            return;
        }

        if (isLocalDataSandbox()) return;
        const result = await api("/v1/backup", {
            method: "PUT",
            body: {
                backup,
                expectedVersion: remote ? Number(remote.version) : null,
                uploadMode: "automatic"
            }
        });

        const completedAt = new Date().toISOString();
        localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({
            direction: "automatic-upload",
            updatedAt: result.updatedAt,
            version: result.version,
            completedAt
        }));
        retryDelayMs = 5_000;
        saveAutoState({
            version: Number(result.version),
            fingerprint,
            summary,
            updatedAt: result.updatedAt,
            completedAt,
            status: "synced"
        });
    }
    catch (error) {
        if (error.status === 401) {
            markAuthenticationRequired();
        }
        else if (error.code === "backup_safety_block") {
            saveAutoState({
                ...readJson(AUTO_STATE_KEY),
                status: "safety-blocked",
                safety: error.payload?.safety || null,
                remoteVersion: error.payload?.currentVersion || null,
                checkedAt: new Date().toISOString()
            });
            console.warn("Level Up cloud rejected a potentially destructive backup.", error.payload?.safety || error.message);
        }
        else if (error.status === 409) {
            saveAutoState({
                ...readJson(AUTO_STATE_KEY),
                status: "newer-cloud-backup",
                checkedAt: new Date().toISOString()
            });
        }
        else {
            saveAutoState({
                ...readJson(AUTO_STATE_KEY),
                status: "retry-pending",
                checkedAt: new Date().toISOString()
            });
            console.warn("Level Up automatic backup was deferred:", error.message);
            scheduleRetryAfterFailure();
        }
    }
    finally {
        backupInFlight = false;
        if (backupRequestedWhileInFlight) {
            backupRequestedWhileInFlight = false;
            const delay = pendingRetryDelayMs ?? 1_000;
            pendingRetryDelayMs = null;
            scheduleBackup(delay);
        }
    }
}

function canAdoptCompletedSync(completedSync, state, remote) {
    if (!completedSync?.version || !remote?.version) return false;
    if (Number(completedSync.version) !== Number(remote.version)) return false;
    const completedAt = Date.parse(completedSync.completedAt || 0);
    const stateAt = Date.parse(state.completedAt || state.updatedAt || 0);
    return Number.isFinite(completedAt) && (
        !Number.isFinite(stateAt) ||
        completedAt > stateAt ||
        (completedAt === stateAt && !state.fingerprint)
    );
}

function assessLocalDataReduction(previous, current) {
    if (!previous || !current) return { blocked: false, reasons: [] };
    const reasons = [];
    compareCount(reasons, "completed workouts", previous.completedWorkouts, current.completedWorkouts, 3, 0.70);
    compareCount(reasons, "weigh-ins", previous.weighIns, current.weighIns, 5, 0.70);
    compareCount(reasons, "food-log days", previous.foodLogDays, current.foodLogDays, 5, 0.70);
    compareCount(reasons, "measurements", previous.measurements, current.measurements, 3, 0.70);
    compareCount(reasons, "sleep entries", previous.sleepEntries, current.sleepEntries, 5, 0.70);
    if (previous.workoutPlans >= 1 && current.workoutPlans === 0) reasons.push("workout plans dropped to zero");

    const previousHistory = majorHistoryCount(previous);
    const currentHistory = majorHistoryCount(current);
    const severeHistoryCollapse = previousHistory >= 10 && currentHistory <= Math.max(2, Math.floor(previousHistory * 0.25));
    if (severeHistoryCollapse) reasons.push("major history collapsed to 25% or less");

    const sectionCollapse = previous.savedSections >= 20 && current.savedSections < Math.ceil(previous.savedSections * 0.65);
    if (sectionCollapse) reasons.push("saved app sections dropped by more than 35%");

    const countCollapseReasons = reasons.filter(reason => (
        reason.includes("completed workouts") ||
        reason.includes("weigh-ins") ||
        reason.includes("food-log days") ||
        reason.includes("measurements") ||
        reason.includes("sleep entries") ||
        reason.includes("workout plans")
    )).length;

    return {
        blocked: severeHistoryCollapse || countCollapseReasons >= 2 || (countCollapseReasons >= 1 && sectionCollapse),
        reasons,
        previous,
        current
    };
}

function compareCount(reasons, label, previous, current, minimumPrevious, retainedFraction) {
    if (Number(previous) < minimumPrevious) return;
    if (Number(current) < Math.ceil(Number(previous) * retainedFraction)) {
        reasons.push(`${label} dropped from ${previous} to ${current}`);
    }
}

function backupSafetySummary(backup) {
    const data = backup?.data || {};
    return {
        savedSections: Object.keys(data).filter(key => ![SESSION_KEY, AUTO_STATE_KEY].includes(key)).length,
        completedWorkouts: arrayLength(data.forge_workout_sessions),
        weighIns: arrayLength(data.forge_weight_entries),
        workoutPlans: arrayLength(data.forge_workout_plans),
        foodLogDays: countFoodLogDays(data.level_up_food_log_v1),
        measurements: arrayLength(data.level_up_body_measurements),
        sleepEntries: arrayLength(data.level_up_sleep_entries),
        nutritionPhases: arrayLength(data.level_up_nutrition_phases)
    };
}

function majorHistoryCount(summary) {
    return Number(summary.completedWorkouts || 0) +
        Number(summary.weighIns || 0) +
        Number(summary.foodLogDays || 0) +
        Number(summary.measurements || 0) +
        Number(summary.sleepEntries || 0);
}

function arrayLength(value) {
    return Array.isArray(value) ? value.length : 0;
}

function countFoodLogDays(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
    return Object.values(value).filter(day => hasLoggedFood(day)).length;
}

function hasLoggedFood(day) {
    if (Array.isArray(day)) return day.length > 0;
    if (!day || typeof day !== "object") return false;
    return Object.values(day).some(value => {
        if (Array.isArray(value)) return value.length > 0;
        if (value && typeof value === "object") return Object.keys(value).length > 0;
        return Boolean(value);
    });
}

async function backupFingerprint(backup) {
    const normalizedData = { ...backup.data };
    delete normalizedData[ACCOUNT_KEY];
    delete normalizedData[LAST_SYNC_KEY];
    delete normalizedData[AUTO_STATE_KEY];
    const normalized = { ...backup, exportedAt: null, data: normalizedData };
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(normalized))
    );
    return [...new Uint8Array(digest)]
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function api(path, { method = "GET", body } = {}) {
    const token = getSession()?.token;
    if (!token) throw Object.assign(new Error("Sign in required."), { status: 401 });
    const response = await fetch(`${API_URL}${path}`, {
        method,
        signal: AbortSignal.timeout(30_000),
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) {
        throw Object.assign(new Error(payload.error || "Cloud request failed."), {
            status: response.status,
            code: payload.code || "",
            payload
        });
    }
    return payload;
}

function getSession() {
    const session = readJson(SESSION_KEY);
    if (!session?.token) return null;
    return session;
}

function isRecoveryLaunch() {
    return new URLSearchParams(window.location.search).get(RECOVERY_PARAMETER) === "1";
}

function isLocalDataSandbox() {
    return document.documentElement.dataset.localDataSandbox === "true";
}

function recoverSessionIfChanged() {
    if (!authBlocked) return;
    const currentToken = getSession()?.token || null;
    if (!currentToken || currentToken === rejectedSessionToken) return;
    authBlocked = false;
    rejectedSessionToken = null;
    retryDelayMs = 5_000;
    scheduleBackup(750);
}

function scheduleRetryAfterFailure() {
    const delay = retryDelayMs;
    retryDelayMs = Math.min(MAX_RETRY_DELAY_MS, retryDelayMs * 2);
    // The retry must be scheduled after the current upload releases its lock.
    backupRequestedWhileInFlight = true;
    pendingRetryDelayMs = delay;
}

let pendingRetryDelayMs = null;

function markAuthenticationRequired() {
    rejectedSessionToken = getSession()?.token || null;
    authBlocked = true;
    window.clearTimeout(backupTimer);
    backupTimer = null;
    backupDueAt = 0;
    saveAutoState({
        ...readJson(AUTO_STATE_KEY),
        status: "auth-required",
        checkedAt: new Date().toISOString()
    });
    console.warn("Level Up cloud authentication needs attention. Local fitness data was left untouched.");
}

function saveAutoState(state) {
    localStorage.setItem(AUTO_STATE_KEY, JSON.stringify(state));
    return state;
}

function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
}
