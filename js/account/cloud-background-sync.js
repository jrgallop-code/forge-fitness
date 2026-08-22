import {
    createBackupSnapshot,
    verifyBackupSnapshot
} from "../core/backup-manager.js?v=backup-complete-6";

const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const ACCOUNT_KEY = "level_up_cloud_account";
const LAST_SYNC_KEY = "level_up_cloud_last_sync";
const AUTO_STATE_KEY = "level_up_cloud_auto_backup_state";
const ACTIVITY_INTERVAL_MS = 15 * 60 * 1000;
const BACKUP_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const BACKUP_DEBOUNCE_MS = 20 * 1000;

let backupTimer = null;
let backupInFlight = false;
let syncStarted = false;

initializeCloudBackgroundSync();

function initializeCloudBackgroundSync() {
    window.addEventListener("levelup:cloud-session-started", startCloudBackgroundSync);
    if (getSession()) startCloudBackgroundSync();
}

function startCloudBackgroundSync() {
    if (syncStarted || !getSession()) return;
    syncStarted = true;

    void recordActivity();
    scheduleBackup(30_000);

    window.setInterval(() => void recordActivity(), ACTIVITY_INTERVAL_MS);
    window.setInterval(() => scheduleBackup(0), BACKUP_CHECK_INTERVAL_MS);
    window.addEventListener("online", () => {
        void recordActivity();
        scheduleBackup(2_000);
    });
    window.addEventListener("levelup:cloud-sync-complete", event => {
        void adoptCompletedSync(event.detail);
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        void recordActivity();
        scheduleBackup(5_000);
    });
    document.addEventListener("change", () => scheduleBackup(BACKUP_DEBOUNCE_MS), true);
    document.addEventListener("click", event => {
        if (event.target.closest?.("button,[data-page]")) scheduleBackup(BACKUP_DEBOUNCE_MS);
    }, true);
}

function scheduleBackup(delay) {
    if (!getSession() || !navigator.onLine) return;
    window.clearTimeout(backupTimer);
    backupTimer = window.setTimeout(() => void runAutomaticBackup(), Math.max(0, delay));
}

async function recordActivity() {
    if (!navigator.onLine) return;
    try {
        await api("/v1/activity", { method: "POST" });
    }
    catch (error) {
        if (error.status === 401) clearExpiredSession();
        else console.warn("Level Up activity update was deferred:", error.message);
    }
}

async function runAutomaticBackup() {
    if (backupInFlight || !navigator.onLine || !getSession()) return;
    backupInFlight = true;

    try {
        const backup = await createBackupSnapshot();
        verifyBackupSnapshot(backup);
        const fingerprint = await backupFingerprint(backup);
        let state = readJson(AUTO_STATE_KEY) || {};
        const completedSync = readJson(LAST_SYNC_KEY);
        const meta = await api("/v1/backup/meta");
        const remote = meta.backup;

        if (canAdoptCompletedSync(completedSync, state, remote)) {
            state = saveAutoState({
                version: Number(remote.version),
                fingerprint,
                updatedAt: remote.updated_at,
                completedAt: completedSync.completedAt,
                status: "synced"
            });
        }

        if (state.fingerprint === fingerprint && Number(state.version || 0) === Number(remote?.version || 0)) return;

        if (remote && Number(state.version || 0) !== Number(remote.version)) {
            saveAutoState({
                ...state,
                status: "newer-cloud-backup",
                remoteVersion: Number(remote.version),
                checkedAt: new Date().toISOString()
            });
            console.info("Automatic backup paused because a newer cloud version is available.");
            return;
        }

        const result = await api("/v1/backup", {
            method: "PUT",
            body: { backup, expectedVersion: remote ? Number(remote.version) : null }
        });

        const completedAt = new Date().toISOString();
        localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({
            direction: "automatic-upload",
            updatedAt: result.updatedAt,
            version: result.version,
            completedAt
        }));
        saveAutoState({
            version: Number(result.version),
            fingerprint,
            updatedAt: result.updatedAt,
            completedAt,
            status: "synced"
        });
    }
    catch (error) {
        if (error.status === 401) clearExpiredSession();
        else if (error.status === 409) {
            saveAutoState({
                ...readJson(AUTO_STATE_KEY),
                status: "newer-cloud-backup",
                checkedAt: new Date().toISOString()
            });
        }
        else console.warn("Level Up automatic backup was deferred:", error.message);
    }
    finally {
        backupInFlight = false;
    }
}

async function adoptCompletedSync(detail) {
    if (!detail?.version) return;
    try {
        const backup = await createBackupSnapshot();
        verifyBackupSnapshot(backup);
        saveAutoState({
            version: Number(detail.version),
            fingerprint: await backupFingerprint(backup),
            updatedAt: detail.updatedAt || null,
            completedAt: detail.completedAt || new Date().toISOString(),
            status: "synced"
        });
    }
    catch (error) {
        console.warn("Level Up could not record the completed cloud sync:", error.message);
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
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw Object.assign(new Error(payload.error || "Cloud request failed."), { status: response.status });
    return payload;
}

function getSession() {
    const session = readJson(SESSION_KEY);
    if (!session?.token) return null;
    if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) return null;
    return session;
}

function saveAutoState(state) {
    localStorage.setItem(AUTO_STATE_KEY, JSON.stringify(state));
    return state;
}

function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
}

function clearExpiredSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
}
