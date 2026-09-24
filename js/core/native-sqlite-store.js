const EXCLUDED_KEYS = new Set([
    "setItem",
    "level_up_cloud_session",
    "level_up_cloud_account",
    "level_up_cloud_last_sync",
    "level_up_cloud_auto_backup_state",
    "level_up_cloud_restore_warning",
    "level_up_product_event_queue"
]);

const DATA_PREFIXES = ["level_up_", "forge_"];
const QUICK_WRITE_MS = 120;
const GENERAL_WRITE_MS = 500;

let initialized = false;
let initializePromise = null;
let persistTimer = null;
let persistInFlight = false;
let persistRequestedWhileInFlight = false;
let hooksBound = false;

function isNativeIOS() {
    return window.Capacitor?.getPlatform?.() === "ios";
}

function plugin() {
    return window.Capacitor?.Plugins?.LevelUpSQLiteStore || null;
}

function shouldPersistKey(key) {
    const value = String(key || "");
    return DATA_PREFIXES.some(prefix => value.startsWith(prefix)) && !EXCLUDED_KEYS.has(value);
}

function collectEntries() {
    const entries = {};
    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !shouldPersistKey(key)) continue;
        const value = localStorage.getItem(key);
        if (value !== null) entries[key] = value;
    }
    return entries;
}

function restoreMissingEntries(entries) {
    let restored = 0;
    Object.entries(entries || {}).forEach(([key, value]) => {
        if (!shouldPersistKey(key) || typeof value !== "string") return;
        if (localStorage.getItem(key) !== null) return;
        localStorage.setItem(key, value);
        restored += 1;
    });
    return restored;
}

function schedulePersist(delay = GENERAL_WRITE_MS) {
    if (!initialized || !plugin()) return;
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
        persistTimer = null;
        void persistNativeSQLiteNow("scheduled");
    }, Math.max(0, Number(delay) || 0));
}

export async function persistNativeSQLiteNow(reason = "manual") {
    const nativePlugin = plugin();
    if (!initialized || !nativePlugin?.replaceStore) return { saved: false, supported: false };

    if (persistInFlight) {
        persistRequestedWhileInFlight = true;
        return { saved: false, queued: true };
    }

    persistInFlight = true;
    try {
        const result = await nativePlugin.replaceStore({ entries: collectEntries() });
        window.dispatchEvent(new CustomEvent("levelup:native-sqlite-synced", {
            detail: {
                reason,
                count: Number(result?.count || 0),
                bytes: Number(result?.bytes || 0),
                schemaVersion: Number(result?.schemaVersion || 1),
                savedAt: new Date().toISOString()
            }
        }));
        return { ...result, supported: true };
    }
    catch (error) {
        console.warn("Level Up native SQLite mirror could not be updated:", error?.message || error);
        return { saved: false, supported: true, error: error?.message || String(error) };
    }
    finally {
        persistInFlight = false;
        if (persistRequestedWhileInFlight) {
            persistRequestedWhileInFlight = false;
            schedulePersist(50);
        }
    }
}

function installStorageHooks() {
    if (globalThis.__levelUpSQLiteStorageHooks) return;
    globalThis.__levelUpSQLiteStorageHooks = true;

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;

    Storage.prototype.setItem = function(key, value) {
        const result = originalSetItem.call(this, key, value);
        if (this === localStorage && shouldPersistKey(key)) schedulePersist(QUICK_WRITE_MS);
        return result;
    };

    Storage.prototype.removeItem = function(key) {
        const result = originalRemoveItem.call(this, key);
        if (this === localStorage && shouldPersistKey(key)) schedulePersist(QUICK_WRITE_MS);
        return result;
    };

    Storage.prototype.clear = function() {
        const result = originalClear.call(this);
        if (this === localStorage) schedulePersist(QUICK_WRITE_MS);
        return result;
    };
}

function bindLifecycleHooks() {
    if (hooksBound) return;
    hooksBound = true;

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
    ].forEach(name => window.addEventListener(name, () => schedulePersist(QUICK_WRITE_MS)));

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void persistNativeSQLiteNow("visibility-hidden");
        else schedulePersist(250);
    });
    window.addEventListener("pagehide", () => {
        void persistNativeSQLiteNow("pagehide");
    });

    try {
        const appPlugin = window.Capacitor?.Plugins?.App;
        if (appPlugin?.addListener) {
            void appPlugin.addListener("appStateChange", event => {
                if (event?.isActive) schedulePersist(250);
                else void persistNativeSQLiteNow("native-background");
            });
        }
    }
    catch (error) {
        console.warn("Level Up SQLite lifecycle hook was unavailable:", error?.message || error);
    }
}

export function initializeNativeSQLiteStore() {
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
        if (!isNativeIOS()) return { supported: false, restored: 0 };

        const nativePlugin = plugin();
        if (!nativePlugin?.loadStore || !nativePlugin?.replaceStore) {
            console.warn("Level Up native SQLite plugin is unavailable in this build.");
            return { supported: false, restored: 0 };
        }

        try {
            const stored = await nativePlugin.loadStore();
            const restored = restoreMissingEntries(stored?.entries || {});
            initialized = true;
            installStorageHooks();
            bindLifecycleHooks();
            const migrated = await persistNativeSQLiteNow(restored ? "startup-recovery" : "startup-migration");

            document.documentElement.dataset.nativeSqlite = "ready";
            window.dispatchEvent(new CustomEvent("levelup:native-sqlite-ready", {
                detail: {
                    restored,
                    count: Number(migrated?.count || stored?.count || 0),
                    schemaVersion: Number(migrated?.schemaVersion || stored?.schemaVersion || 1)
                }
            }));

            if (restored > 0) {
                console.info(`Level Up restored ${restored} missing data section${restored === 1 ? "" : "s"} from native SQLite.`);
            }
            return { supported: true, restored };
        }
        catch (error) {
            console.error("Level Up native SQLite initialization failed:", error);
            document.documentElement.dataset.nativeSqlite = "error";
            return { supported: true, restored: 0, error: error?.message || String(error) };
        }
    })();

    return initializePromise;
}

export async function getNativeSQLiteHealth() {
    if (!isNativeIOS() || !plugin()?.health) return { supported: false };
    try {
        const result = await plugin().health();
        return { supported: true, ...result };
    }
    catch (error) {
        return { supported: true, ready: false, error: error?.message || String(error) };
    }
}
